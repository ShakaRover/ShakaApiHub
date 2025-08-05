const axios = require('axios');
const databaseConfig = require('../config/database');

class SiteCheckService {
    constructor() {
        this.db = databaseConfig.getDatabase();
        this.statements = databaseConfig.getStatements();
    }

    // 检测单个站点
    async checkSite(siteId) {
        let site = null;
        try {
            // 获取站点信息
            site = this.statements.findApiSiteById.get(siteId);
            if (!site) {
                throw new Error('站点不存在');
            }

            console.log(`开始检测站点: ${site.name} (${site.url})`);
            console.log(`站点认证方式: ${site.auth_method}`);
            console.log(`Sessions数据: ${site.sessions ? '已提供' : '未提供'}`);

            // 第一步：访问站点获取 set-cookie
            console.log('第一步：获取站点cookies...');
            const cookies = await this.getSiteCookies(site.url);
            console.log(`获取到cookies: ${cookies ? cookies.substring(0, 100) + '...' : '无'}`);
            
            // 第二步：获取用户信息
            console.log('第二步：获取用户信息...');
            const userInfo = await this.getUserInfo(site.url, cookies, site.sessions);
            console.log('用户信息获取成功:', JSON.stringify(userInfo, null, 2));
            
            // 第三步：保存检测结果
            console.log('第三步：保存检测结果...');
            await this.saveSiteInfo(siteId, userInfo);
            
            // 第四步：记录检测日志
            console.log('第四步：记录检测日志...');
            await this.logCheckResult(siteId, 'success', '检测成功', JSON.stringify(userInfo));

            console.log(`站点检测完成: ${site.name}`);
            return {
                success: true,
                message: '站点检测成功',
                data: userInfo
            };

        } catch (error) {
            const siteName = site ? site.name : `ID:${siteId}`;
            console.error(`\n=== 站点检测失败详情 ===`);
            console.error(`站点: ${siteName}`);
            console.error(`错误类型: ${error.constructor.name}`);
            console.error(`错误消息: ${error.message}`);
            console.error(`错误代码: ${error.code || '无'}`);
            console.error(`错误状态: ${error.response?.status || '无'}`);
            console.error(`完整错误:`, error);
            console.error(`=== 错误详情结束 ===\n`);
            
            // 更新检测状态为失败
            try {
                this.statements.updateSiteCheckStatus.run('error', error.message, siteId);
            } catch (dbError) {
                console.error('更新数据库状态失败:', dbError.message);
            }
            
            // 记录错误日志
            await this.logCheckResult(siteId, 'error', error.message, JSON.stringify({
                errorType: error.constructor.name,
                errorCode: error.code,
                errorStatus: error.response?.status,
                errorStack: error.stack
            }));

            return {
                success: false,
                message: error.message
            };
        }
    }

    // 获取站点 cookies
    async getSiteCookies(siteUrl) {
        // 首先尝试访问 logo.png
        const logoUrl = `${siteUrl.replace(/\/$/, '')}/logo.png`;
        console.log(`首先尝试访问logo: ${logoUrl}`);
        
        try {
            const logoResponse = await axios.get(logoUrl, {
                timeout: 10000,
                validateStatus: () => true, // 接受所有状态码
                maxRedirects: 0 // 不处理重定向
            });

            console.log(`Logo响应状态: ${logoResponse.status}`);
            
            // 如果logo存在（状态码200-299），使用logo的cookies
            if (logoResponse.status >= 200 && logoResponse.status < 300) {
                console.log('Logo存在，使用logo响应的cookies');
                return this.extractCookiesFromResponse(logoResponse, logoUrl);
            } else if (logoResponse.status >= 300 && logoResponse.status < 400) {
                // 处理重定向响应，从重定向中获取cookies
                console.log(`Logo返回重定向 (${logoResponse.status})，从重定向响应中获取cookies`);
                const redirectLocation = logoResponse.headers.location;
                console.log(`重定向到: ${redirectLocation}`);
                return this.extractCookiesFromResponse(logoResponse, logoUrl);
            } else {
                console.log(`Logo不存在 (状态码: ${logoResponse.status})，回退到站点首页`);
            }
        } catch (error) {
            // 检查是否是重定向错误
            if (error.response && error.response.status >= 300 && error.response.status < 400) {
                console.log(`Logo重定向响应 (${error.response.status})，从重定向中获取cookies`);
                const redirectLocation = error.response.headers.location;
                console.log(`重定向到: ${redirectLocation}`);
                return this.extractCookiesFromResponse(error.response, logoUrl);
            } else {
                console.log(`访问logo失败: ${error.message}，回退到站点首页`);
            }
        }

        // 如果logo不存在或访问失败，使用站点首页
        try {
            console.log(`正在访问站点首页: ${siteUrl}`);
            const response = await axios.get(siteUrl, {
                timeout: 10000,
                validateStatus: () => true, // 接受所有状态码
                maxRedirects: 5
            });

            console.log(`站点首页响应状态: ${response.status}`);
            return this.extractCookiesFromResponse(response, siteUrl);
        } catch (error) {
            console.error('获取站点cookies失败:', {
                code: error.code,
                message: error.message,
                status: error.response?.status,
                url: siteUrl
            });
            
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

    // 从响应中提取cookies的辅助方法
    extractCookiesFromResponse(response, url) {
        console.log(`从 ${url} 提取cookies`);
        console.log(`响应头数量: ${Object.keys(response.headers).length}`);

        const cookies = [];
        const setCookieHeaders = response.headers['set-cookie'];
        
        if (setCookieHeaders) {
            console.log(`找到 ${setCookieHeaders.length} 个set-cookie头`);
            setCookieHeaders.forEach(cookie => {
                const cookiePart = cookie.split(';')[0];
                cookies.push(cookiePart);
            });
        } else {
            console.log('未找到set-cookie头');
        }

        const cookieString = cookies.join('; ');
        console.log(`合并后的cookies长度: ${cookieString.length}`);
        return cookieString;
    }

    // 获取用户信息
    async getUserInfo(siteUrl, cookies, sessions) {
        try {
            const apiUrl = `${siteUrl.replace(/\/$/, '')}/api/user/self`;
            console.log(`正在请求API: ${apiUrl}`);
            
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // 合并cookies
            let finalCookies = '';
            
            // 首先添加从站点获取的cookies
            if (cookies) {
                finalCookies = cookies;
                console.log(`站点cookies: ${cookies.substring(0, 100)}...`);
            }

            // 添加 sessions 信息
            if (sessions) {
                console.log(`处理sessions数据: ${sessions.substring(0, 100)}...`);
                try {
                    const sessionData = JSON.parse(sessions);
                    console.log('Sessions数据解析为JSON成功');
                    if (sessionData.token) {
                        headers['Authorization'] = `Bearer ${sessionData.token}`;
                        console.log('添加Authorization头');
                    }
                    if (sessionData.cookie) {
                        // 合并cookies而不是覆盖
                        if (finalCookies) {
                            finalCookies += '; ' + sessionData.cookie;
                        } else {
                            finalCookies = sessionData.cookie;
                        }
                        console.log('合并sessions中的cookie');
                    }
                } catch (e) {
                    console.log('Sessions数据不是JSON，直接作为cookie使用');
                    // 合并cookies而不是覆盖
                    if (finalCookies) {
                        finalCookies += '; ' + sessions;
                    } else {
                        finalCookies = sessions;
                    }
                }
            }

            // 设置最终的cookies
            if (finalCookies) {
                headers['Cookie'] = finalCookies;
                console.log(`最终cookies: ${finalCookies.substring(0, 200)}...`);
            }

            console.log('请求头:', JSON.stringify(headers, null, 2));

            const response = await axios.get(apiUrl, {
                headers,
                timeout: 15000,
                validateStatus: (status) => status < 500 // 接受 4xx 和 2xx
            });

            console.log(`API响应状态: ${response.status}`);
            console.log(`响应数据类型: ${typeof response.data}`);
            
            // 检查是否返回了HTML页面（可能是反爬虫页面）
            if (typeof response.data === 'string' && response.data.includes('<html>')) {
                console.log('检测到HTML响应，可能是反爬虫保护');
                throw new Error('站点返回HTML页面，可能有反爬虫保护或需要验证');
            }
            
            console.log(`响应数据: ${JSON.stringify(response.data, null, 2)}`);

            const data = response.data;
            
            // 首先检查是否是有效的JSON对象
            if (!data || typeof data !== 'object') {
                if (typeof data === 'string') {
                    if (data.includes('<!DOCTYPE html>') || data.includes('<html>')) {
                        throw new Error('API返回HTML页面而非JSON数据，请检查认证信息');
                    } else {
                        throw new Error(`API返回非JSON数据: ${data.substring(0, 100)}...`);
                    }
                }
                
                // 如果不是对象，根据HTTP状态码返回错误
                if (response.status === 404) {
                    throw new Error('API接口不存在 (404)');
                } else if (response.status === 401) {
                    throw new Error('认证失败 (401)');
                } else if (response.status === 403) {
                    throw new Error('访问被禁止 (403)');
                } else if (response.status >= 400) {
                    throw new Error(`HTTP错误 (${response.status})`);
                }
                
                throw new Error('API返回数据格式错误');
            }
            
            // 如果是JSON对象，优先使用其中的message
            if (response.status >= 400) {
                // 对于HTTP错误状态码，优先使用响应中的message
                const errorMessage = data.message || 
                    (response.status === 404 ? 'API接口不存在 (404)' :
                     response.status === 401 ? '认证失败 (401)' :
                     response.status === 403 ? '访问被禁止 (403)' :
                     `HTTP错误 (${response.status})`);
                throw new Error(errorMessage);
            }
            
            if (!data.success) {
                throw new Error(data.message || '获取用户信息失败');
            }

            if (!data.data) {
                throw new Error('API返回数据中缺少data字段');
            }

            return data.data;

        } catch (error) {
            console.error('获取用户信息失败详情:', {
                code: error.code,
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
                url: siteUrl
            });
            
            if (error.code === 'ECONNABORTED') {
                throw new Error('请求超时');
            } else if (error.response) {
                const responseText = typeof error.response.data === 'string' 
                    ? error.response.data.substring(0, 200) 
                    : JSON.stringify(error.response.data).substring(0, 200);
                throw new Error(`HTTP ${error.response.status}: ${error.response.statusText} - ${responseText}`);
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