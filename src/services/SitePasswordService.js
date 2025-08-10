const databaseConfig = require('../config/database');
const LogService = require('./LogService');
const SiteApiOperations = require('./operations/SiteApiOperations');

/**
 * 站点密码管理服务类
 * 负责处理API站点的用户密码管理功能
 * 
 * 遵循SOLID原则：
 * - 单一职责：专注于站点密码管理
 * - 依赖倒置：使用SiteApiOperations处理具体的API操作
 * - 开放封闭：可扩展新的密码管理功能
 */
class SitePasswordService {
    constructor() {
        this.statements = databaseConfig.getStatements();
        this.logService = new LogService();
        this.siteApiOperations = new SiteApiOperations();
    }

    /**
     * 获取站点用户信息
     * 通过站点的 GET /api/user/self 接口获取用户信息
     */
    async getSiteUserInfo(siteId) {
        try {
            console.log(`[密码管理] 开始获取站点用户信息，站点ID: ${siteId}`);
            
            // 获取站点信息
            const site = await this.statements.findApiSiteById.get(siteId);
            if (!site) {
                return {
                    success: false,
                    message: '站点不存在'
                };
            }

            console.log(`[密码管理] 站点信息: ${site.name} (${site.url})`);

            // 获取站点cookies
            const cookies = await this.siteApiOperations.getSiteCookies(site.url);
            console.log(`[密码管理] 获取到cookies: ${cookies ? cookies.substring(0, 50) + '...' : '无'}`);

            // 调用站点的用户信息API
            const userInfo = await this.callSiteUserAPI(site, cookies, 'GET', '/api/user/self');
            
            if (userInfo.success) {
                console.log(`[密码管理] 成功获取用户信息: ${JSON.stringify(userInfo.data, null, 2)}`);
                return {
                    success: true,
                    data: userInfo.data,
                    message: '获取用户信息成功'
                };
            } else {
                console.error(`[密码管理] 获取用户信息失败: ${userInfo.message}`);
                return {
                    success: false,
                    message: userInfo.message || '获取用户信息失败'
                };
            }
        } catch (error) {
            console.error('[密码管理] 获取站点用户信息异常:', error);
            return {
                success: false,
                message: `获取用户信息异常: ${error.message}`
            };
        }
    }

    /**
     * 修改站点用户密码
     * 通过站点的 PUT /api/user/self 接口修改用户密码
     */
    async changeSiteUserPassword(siteId, newPassword, operatorUserId) {
        try {
            console.log(`[密码管理] 开始修改站点用户密码，站点ID: ${siteId}`);
            
            // 获取站点信息
            const site = await this.statements.findApiSiteById.get(siteId);
            if (!site) {
                return {
                    success: false,
                    message: '站点不存在'
                };
            }

            console.log(`[密码管理] 站点信息: ${site.name} (${site.url})`);

            // 首先获取当前用户信息
            const currentUserInfo = await this.getSiteUserInfo(siteId);
            if (!currentUserInfo.success) {
                return {
                    success: false,
                    message: `获取当前用户信息失败: ${currentUserInfo.message}`
                };
            }

            const oldUsername = currentUserInfo.data.username || '';
            console.log(`[密码管理] 当前用户名: ${oldUsername}`);

            // 准备修改后的用户数据
            const updatedUserData = {
                ...currentUserInfo.data,
                password: newPassword  // 设置新密码
            };

            console.log(`[密码管理] 准备更新用户数据:`, { ...updatedUserData, password: '***' });

            // 获取站点cookies
            const cookies = await this.siteApiOperations.getSiteCookies(site.url);

            // 调用站点的用户更新API
            const updateResult = await this.callSiteUserAPI(site, cookies, 'PUT', '/api/user/self', updatedUserData);
            
            if (updateResult.success) {
                console.log(`[密码管理] 密码修改成功`);
                
                // 记录密码修改日志到数据库
                await this.logPasswordChange(
                    siteId, 
                    site.name, 
                    site.url, 
                    oldUsername, 
                    oldUsername, // 用户名未变，只修改密码
                    true, // 密码已修改
                    operatorUserId, 
                    'success', 
                    null
                );

                // 记录操作日志
                await this.logService.logUserAction(
                    operatorUserId, 
                    'change_site_password', 
                    'site_password', 
                    siteId, 
                    {
                        site_name: site.name,
                        site_url: site.url,
                        username: oldUsername
                    }
                );

                return {
                    success: true,
                    message: '密码修改成功',
                    data: {
                        site_name: site.name,
                        site_url: site.url,
                        username: oldUsername
                    }
                };
            } else {
                console.error(`[密码管理] 密码修改失败: ${updateResult.message}`);
                
                // 记录失败日志
                await this.logPasswordChange(
                    siteId, 
                    site.name, 
                    site.url, 
                    oldUsername, 
                    oldUsername, 
                    false, 
                    operatorUserId, 
                    'error', 
                    updateResult.message
                );

                return {
                    success: false,
                    message: updateResult.message || '密码修改失败'
                };
            }
        } catch (error) {
            console.error('[密码管理] 修改站点用户密码异常:', error);
            
            // 记录异常日志
            try {
                const site = await this.statements.findApiSiteById.get(siteId);
                if (site) {
                    await this.logPasswordChange(
                        siteId, 
                        site.name, 
                        site.url, 
                        '', 
                        '', 
                        false, 
                        operatorUserId, 
                        'error', 
                        error.message
                    );
                }
            } catch (logError) {
                console.error('[密码管理] 记录异常日志失败:', logError);
            }

            return {
                success: false,
                message: `修改密码异常: ${error.message}`
            };
        }
    }

    /**
     * 调用站点的用户API
     * 统一处理GET和PUT请求
     */
    async callSiteUserAPI(site, cookies, method, endpoint, data = null) {
        try {
            const axios = require('axios');
            
            // 构建请求URL
            const baseUrl = site.url.endsWith('/') ? site.url.slice(0, -1) : site.url;
            const fullUrl = `${baseUrl}${endpoint}`;

            console.log(`[密码管理] 调用站点API: ${method} ${fullUrl}`);

            // 准备请求头
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // 添加Cookie
            if (cookies) {
                headers.Cookie = cookies;
            }

            // 添加认证头
            if (site.auth_method === 'token' && site.token) {
                headers.Authorization = `Bearer ${site.token}`;
            }

            // 添加用户ID头（如果需要）
            if (site.user_id) {
                headers['new-api-user'] = site.user_id;
            }

            // 构建请求配置
            const config = {
                method: method,
                url: fullUrl,
                headers: headers,
                timeout: 30000,
                validateStatus: (status) => status < 500 // 接受所有非服务器错误状态码
            };

            // 如果是PUT请求，添加数据
            if (method === 'PUT' && data) {
                config.data = data;
            }

            console.log(`[密码管理] 请求配置:`, {
                method,
                url: fullUrl,
                headers: { ...headers, Authorization: headers.Authorization ? '***' : undefined },
                data: data ? { ...data, password: data.password ? '***' : undefined } : undefined
            });

            // 发送请求
            const response = await axios(config);
            
            console.log(`[密码管理] API响应状态: ${response.status}`);
            console.log(`[密码管理] API响应数据:`, response.data);

            if (response.status >= 200 && response.status < 300) {
                // 处理嵌套的响应数据结构：{data: {data: {...}}}
                let actualData = response.data;
                if (response.data && response.data.data && typeof response.data.data === 'object') {
                    actualData = response.data.data;
                    console.log('[密码管理] 剥离外层结构，提取实际用户数据');
                }
                
                return {
                    success: true,
                    data: actualData,
                    status: response.status
                };
            } else {
                // 处理错误情况下的数据结构
                let errorMessage = response.data?.message || '未知错误';
                if (response.data && response.data.data && response.data.data.message) {
                    errorMessage = response.data.data.message;
                }
                
                return {
                    success: false,
                    message: `API调用失败: ${response.status} - ${errorMessage}`,
                    status: response.status,
                    data: response.data
                };
            }
        } catch (error) {
            console.error('[密码管理] API调用异常:', error);
            
            if (error.response) {
                // 处理异常情况下的数据结构
                let errorMessage = error.response.data?.message || error.message;
                if (error.response.data && error.response.data.data && error.response.data.data.message) {
                    errorMessage = error.response.data.data.message;
                }
                
                return {
                    success: false,
                    message: `API调用失败: ${error.response.status} - ${errorMessage}`,
                    status: error.response.status,
                    data: error.response.data
                };
            } else {
                return {
                    success: false,
                    message: `API调用异常: ${error.message}`
                };
            }
        }
    }

    /**
     * 记录密码修改日志
     */
    async logPasswordChange(siteId, siteName, siteUrl, oldUsername, newUsername, passwordChanged, userId, status, errorMessage) {
        try {
            await this.statements.insertPasswordChangeLog.run(
                siteId,
                siteName,
                siteUrl,
                oldUsername,
                newUsername,
                passwordChanged,
                userId,
                status,
                errorMessage
            );
            console.log(`[密码管理] 密码修改日志已记录: ${siteName} - ${status}`);
        } catch (error) {
            console.error('[密码管理] 记录密码修改日志失败:', error);
        }
    }

    /**
     * 获取站点密码修改历史
     */
    async getPasswordChangeHistory(siteId, limit = 10) {
        try {
            const logs = await this.statements.findPasswordChangeLogsBySiteId.all(siteId, limit);
            return {
                success: true,
                data: logs
            };
        } catch (error) {
            console.error('[密码管理] 获取密码修改历史失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * 获取用户的密码修改历史
     */
    async getUserPasswordChangeHistory(userId, limit = 50) {
        try {
            const logs = await this.statements.findPasswordChangeLogsByUserId.all(userId, limit);
            return {
                success: true,
                data: logs
            };
        } catch (error) {
            console.error('[密码管理] 获取用户密码修改历史失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

module.exports = SitePasswordService;