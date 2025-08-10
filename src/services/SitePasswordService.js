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
     * 使用SiteApiOperations的getUserInfo方法获取用户信息
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

            // 使用SiteApiOperations的getUserInfo方法
            const userInfo = await this.siteApiOperations.getUserInfo(site.url, cookies, site.sessions, site);
            
            console.log(`[密码管理] 成功获取用户信息: ${JSON.stringify(userInfo, null, 2)}`);
            return {
                success: true,
                data: userInfo,
                message: '获取用户信息成功'
            };
            
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

            const currentUsername = currentUserInfo.data.username || '';
            console.log(`[密码管理] 当前用户名: ${currentUsername}`);

            // 准备修改后的用户数据
            const updatedUserData = {
                ...currentUserInfo.data,
                password: newPassword  // 设置新密码
            };

            console.log(`[密码管理] 准备更新用户数据:`, { ...updatedUserData, password: '***' });

            // 获取站点cookies
            const cookies = await this.siteApiOperations.getSiteCookies(site.url);

            // 调用站点的用户更新API
            const updateResult = await this.siteApiOperations.updateUser(site.url, cookies, site.sessions, site, updatedUserData);
            
            if (updateResult.success) {
                console.log(`[密码管理] 密码修改成功`);
                
                // 记录密码修改日志到数据库（保存密码原文）
                await this.logPasswordChange(
                    siteId, 
                    site.name, 
                    site.url, 
                    currentUsername, 
                    newPassword, // 保存密码原文
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
                        username: currentUsername
                    }
                );

                return {
                    success: true,
                    message: '密码修改成功',
                    data: {
                        site_name: site.name,
                        site_url: site.url,
                        username: currentUsername
                    }
                };
            } else {
                console.error(`[密码管理] 密码修改失败: ${updateResult.message}`);
                
                // 记录失败日志（不保存密码哈希）
                await this.logPasswordChange(
                    siteId, 
                    site.name, 
                    site.url, 
                    currentUsername, 
                    null, // 失败时不保存密码哈希
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
                        'unknown', // 异常情况下用户名未知
                        null, // 不保存密码哈希
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
     * 记录密码修改日志
     */
    async logPasswordChange(siteId, siteName, siteUrl, currentUsername, newPassword, passwordChanged, userId, status, errorMessage) {
        try {
            await this.statements.insertPasswordChangeLog.run(
                siteId,
                siteName,
                siteUrl,
                currentUsername,
                newPassword,
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