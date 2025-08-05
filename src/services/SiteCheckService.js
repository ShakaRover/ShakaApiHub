const axios = require('axios');
const databaseConfig = require('../config/database');

class SiteCheckService {
    constructor() {
        this.db = databaseConfig.getDatabase();
        this.statements = databaseConfig.getStatements();
    }

    // 检测单个站点
    async checkSite(siteId) {
        try {
            // 获取站点信息
            const site = this.statements.findApiSiteById.get(siteId);
            if (!site) {
                throw new Error('站点不存在');
            }

            console.log(`开始检测站点: ${site.name} (${site.url})`);

            // 第一步：访问站点获取 set-cookie
            const cookies = await this.getSiteCookies(site.url);
            
            // 第二步：获取用户信息
            const userInfo = await this.getUserInfo(site.url, cookies, site.sessions);
            
            // 第三步：保存检测结果
            await this.saveSiteInfo(siteId, userInfo);
            
            // 第四步：记录检测日志
            await this.logCheckResult(siteId, 'success', '检测成功', JSON.stringify(userInfo));

            return {
                success: true,
                message: '站点检测成功',
                data: userInfo
            };

        } catch (error) {
            console.error(`站点检测失败 (ID: ${siteId}):`, error.message);
            
            // 更新检测状态为失败
            this.statements.updateSiteCheckStatus.run('error', error.message, siteId);
            
            // 记录错误日志
            await this.logCheckResult(siteId, 'error', error.message, null);

            return {
                success: false,
                message: error.message
            };
        }
    }

    // 获取站点 cookies
    async getSiteCookies(siteUrl) {
        try {
            const response = await axios.get(siteUrl, {
                timeout: 10000,
                validateStatus: () => true, // 接受所有状态码
                maxRedirects: 5
            });

            const cookies = [];
            const setCookieHeaders = response.headers['set-cookie'];
            
            if (setCookieHeaders) {
                setCookieHeaders.forEach(cookie => {
                    const cookiePart = cookie.split(';')[0];
                    cookies.push(cookiePart);
                });
            }

            return cookies.join('; ');
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('连接超时');
            } else if (error.code === 'ENOTFOUND') {
                throw new Error('域名解析失败');
            } else if (error.code === 'ECONNREFUSED') {
                throw new Error('连接被拒绝');
            } else {
                throw new Error(`网络错误: ${error.message}`);
            }
        }
    }

    // 获取用户信息
    async getUserInfo(siteUrl, cookies, sessions) {
        try {
            const apiUrl = `${siteUrl.replace(/\/$/, '')}/api/user/self`;
            
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // 添加 cookies
            if (cookies) {
                headers['Cookie'] = cookies;
            }

            // 添加 sessions 信息
            if (sessions) {
                try {
                    const sessionData = JSON.parse(sessions);
                    if (sessionData.token) {
                        headers['Authorization'] = `Bearer ${sessionData.token}`;
                    }
                    if (sessionData.cookie) {
                        headers['Cookie'] = sessionData.cookie;
                    }
                } catch (e) {
                    // 如果不是 JSON，直接作为 cookie 使用
                    headers['Cookie'] = sessions;
                }
            }

            const response = await axios.get(apiUrl, {
                headers,
                timeout: 15000,
                validateStatus: (status) => status < 500 // 接受 4xx 和 2xx
            });

            if (response.status === 404) {
                throw new Error('API接口不存在 (404)');
            } else if (response.status === 401) {
                throw new Error('认证失败 (401)');
            } else if (response.status === 403) {
                throw new Error('访问被禁止 (403)');
            } else if (response.status >= 400) {
                throw new Error(`HTTP错误 (${response.status})`);
            }

            const data = response.data;
            
            if (!data.success) {
                throw new Error(data.message || '获取用户信息失败');
            }

            return data.data;

        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('请求超时');
            } else if (error.response) {
                throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
            } else {
                throw error;
            }
        }
    }

    // 保存站点信息
    async saveSiteInfo(siteId, userInfo) {
        try {
            const quota = userInfo.quota ? userInfo.quota / 500000 : 0;
            const usedQuota = userInfo.used_quota ? userInfo.used_quota / 500000 : 0;
            const affQuota = userInfo.aff_quota ? userInfo.aff_quota / 500000 : 0;
            const affHistoryQuota = userInfo.aff_history_quota ? userInfo.aff_history_quota / 500000 : 0;

            this.statements.updateSiteCheckInfo.run(
                quota,
                usedQuota,
                userInfo.request_count || 0,
                userInfo.group || '',
                userInfo.aff_code || '',
                userInfo.aff_count || 0,
                affQuota,
                affHistoryQuota,
                userInfo.username || '',
                userInfo.last_check_in_time || null,
                'success',
                '检测成功',
                siteId
            );

            console.log(`站点信息已保存 (ID: ${siteId})`);
        } catch (error) {
            console.error('保存站点信息失败:', error.message);
            throw new Error('保存站点信息失败');
        }
    }

    // 记录检测日志
    async logCheckResult(siteId, status, message, responseData) {
        try {
            this.statements.insertCheckLog.run(siteId, status, message, responseData);
        } catch (error) {
            console.error('记录检测日志失败:', error.message);
        }
    }

    // 获取站点检测历史
    async getCheckHistory(siteId) {
        try {
            const logs = this.statements.findCheckLogsBySiteId.all(siteId);
            return {
                success: true,
                data: logs
            };
        } catch (error) {
            console.error('获取检测历史失败:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // 获取最新检测结果
    async getLatestCheckResult(siteId) {
        try {
            const log = this.statements.findLatestCheckLog.get(siteId);
            return {
                success: true,
                data: log
            };
        } catch (error) {
            console.error('获取最新检测结果失败:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

module.exports = SiteCheckService;