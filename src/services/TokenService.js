const ApiClientBase = require('./base/ApiClientBase');
const LogService = require('./LogService');

/**
 * 令牌服务
 * 负责所有令牌相关的业务逻辑
 * 
 * 遵循SOLID原则：
 * - 单一职责：专门处理令牌相关业务逻辑
 * - 依赖倒置：继承ApiClientBase获得通用API处理能力
 * - 开放封闭：可扩展新的令牌操作，不修改现有方法
 */
class TokenService extends ApiClientBase {
    constructor() {
        super();
        this.logService = new LogService();
    }

    /**
     * 获取站点令牌列表
     */
    async getTokens(site, userId = null) {
        try {
            const tokenListUrl = `${site.url.replace(/\/$/, '')}/api/token/?p=0&size=10`;
            const context = '[获取令牌列表]';

            console.log(`${context}发起请求: ${tokenListUrl}`);

            const response = await this.get(tokenListUrl, site, site.sessions, '', context);
            const data = this.processApiResponse(response, context);

            if (data.success) {
                // 记录操作日志
                if (userId) {
                    await this.logService.logAction(
                        userId,
                        'token_list', 
                        `获取站点 ${site.name} 的令牌列表`,
                        { siteId: site.id, count: data.data?.records?.length || 0 }
                    );
                }
            }

            return {
                success: data.success,
                message: data.message || '获取令牌列表成功',
                data: data.data
            };

        } catch (error) {
            console.error('获取令牌列表失败:', error);
            return this.handleApiError(error, '获取令牌列表失败');
        }
    }

    /**
     * 切换令牌状态
     */
    async toggleTokenStatus(site, tokenId, newStatus, userId = null) {
        try {
            // toggleUrl 不要删除后面的 ?status_only=true
            const toggleUrl = `${site.url.replace(/\/$/, '')}/api/token/?status_only=true`;
            const context = '[令牌状态切换]';

            console.log(`${context}发起请求: ${toggleUrl}`);
            console.log(`${context}令牌ID: ${tokenId}, 新状态: ${newStatus}`);

            const response = await this.put(toggleUrl, {
                id: tokenId,
                status: newStatus
            }, site, site.sessions, '', context);

            const data = this.processApiResponse(response, context);

            if (data.success && userId) {
                // 记录操作日志
                const action = newStatus === 1 ? '启用' : '禁用';
                await this.logService.logAction(
                    userId,
                    'token_status', 
                    `${action}站点 ${site.name} 的令牌 ${tokenId}`,
                    { siteId: site.id, tokenId, status: newStatus }
                );
            }

            return {
                success: data.success,
                message: data.message || (data.success ? '令牌状态更新成功' : '令牌状态更新失败'),
                data: data.data
            };

        } catch (error) {
            console.error('令牌状态切换失败:', error);
            return this.handleApiError(error, '令牌状态切换失败');
        }
    }

    /**
     * 删除单个令牌
     */
    async deleteToken(site, tokenId, userId = null) {
        try {
            // deleteUrl 不要删除末尾的 '/'
            const deleteUrl = `${site.url.replace(/\/$/, '')}/api/token/${tokenId}/`;
            const context = '[令牌删除]';

            console.log(`${context}发起请求: ${deleteUrl}`);

            const response = await this.delete(deleteUrl, site, site.sessions, '', context);
            const data = this.processApiResponse(response, context);

            if (data.success && userId) {
                // 记录操作日志
                await this.logService.logAction(
                    userId,
                    'token_delete', 
                    `删除站点 ${site.name} 的令牌 ${tokenId}`,
                    { siteId: site.id, tokenId }
                );
            }

            return {
                success: data.success,
                message: data.message || (data.success ? '令牌删除成功' : '令牌删除失败'),
                data: data.data
            };

        } catch (error) {
            console.error('令牌删除失败:', error);
            return this.handleApiError(error, '令牌删除失败');
        }
    }

    /**
     * 批量删除所有令牌
     */
    async deleteAllTokens(site, userId = null) {
        try {
            // 首先获取令牌列表
            const listResult = await this.getTokens(site);
            if (!listResult.success || !listResult.data?.records) {
                return {
                    success: false,
                    message: '获取令牌列表失败'
                };
            }

            const tokens = listResult.data.records;
            if (tokens.length === 0) {
                return {
                    success: true,
                    message: '没有需要删除的令牌',
                    deletedCount: 0
                };
            }

            console.log(`找到${tokens.length}个令牌，开始逐个删除`);

            let deletedCount = 0;
            const errors = [];

            // 逐个删除令牌
            for (const token of tokens) {
                try {
                    const deleteResult = await this.deleteToken(site, token.id);
                    if (deleteResult.success) {
                        deletedCount++;
                        console.log(`成功删除令牌: ${token.name}`);
                    } else {
                        errors.push(`删除令牌 ${token.name} 失败: ${deleteResult.message}`);
                    }
                } catch (deleteError) {
                    errors.push(`删除令牌 ${token.name} 失败: ${deleteError.message}`);
                }
            }

            // 记录操作日志
            if (userId) {
                await this.logService.logAction(
                    userId,
                    'token_delete_all', 
                    `批量删除站点 ${site.name} 的所有令牌`,
                    { siteId: site.id, deletedCount, failCount: errors.length }
                );
            }

            return {
                success: true,
                message: `删除操作完成，成功删除${deletedCount}个令牌${errors.length > 0 ? `，${errors.length}个失败` : ''}`,
                deletedCount: deletedCount,
                errors: errors
            };

        } catch (error) {
            console.error('批量删除令牌失败:', error);
            return this.handleApiError(error, '批量删除令牌失败');
        }
    }

    /**
     * 创建令牌
     */
    async createToken(site, tokenData, userId = null) {
        try {
            const createUrl = `${site.url.replace(/\/$/, '')}/api/token/`;
            const context = '[创建令牌]';

            console.log(`${context}发起请求: ${createUrl}`);
            console.log(`${context}令牌名称: ${tokenData.name}`);

            const response = await this.post(createUrl, tokenData, site, site.sessions, '', context);
            const data = this.processApiResponse(response, context);

            if (data.success && userId) {
                // 记录操作日志
                await this.logService.logAction(
                    userId,
                    'token_create', 
                    `在站点 ${site.name} 创建令牌 ${tokenData.name}`,
                    { siteId: site.id, tokenName: tokenData.name, group: tokenData.group }
                );
            }

            return {
                success: data.success,
                message: data.message || (data.success ? '令牌创建成功' : '令牌创建失败'),
                data: data.data
            };

        } catch (error) {
            console.error('创建令牌失败:', error);
            return this.handleApiError(error, '创建令牌失败');
        }
    }

    /**
     * 自动创建令牌（为每个不存在的组创建令牌）
     */
    async autoCreateTokens(site, userId = null) {
        try {
            // 获取令牌组信息
            const groupsUrl = `${site.url.replace(/\/$/, '')}/api/user/self/groups`;
            const context = '[自动创建令牌]';

            console.log(`${context}获取令牌组信息: ${groupsUrl}`);

            const groupsResponse = await this.get(groupsUrl, site, site.sessions, '', context);
            const groupsData = this.processApiResponse(groupsResponse, context);

            if (!groupsData.success) {
                return {
                    success: false,
                    message: '获取令牌组失败'
                };
            }

            // 获取现有令牌列表
            const tokensResult = await this.getTokens(site);
            const existingTokens = tokensResult.success && tokensResult.data?.records ? tokensResult.data.records : [];

            // 获取已存在的组名
            const existingGroups = new Set(existingTokens.map(token => token.group));
            const availableGroups = groupsData.data;

            let createCount = 0;
            let failCount = 0;

            // 为不存在的组创建令牌
            for (const [groupKey, groupName] of Object.entries(availableGroups)) {
                if (!existingGroups.has(groupKey)) {
                    try {
                        const tokenData = {
                            name: groupKey,
                            remain_quota: 500000,
                            expired_time: -1,
                            unlimited_quota: true,
                            model_limits_enabled: false,
                            model_limits: "",
                            allow_ips: "",
                            group: groupKey
                        };

                        const createResult = await this.createToken(site, tokenData);
                        
                        if (createResult.success) {
                            createCount++;
                            console.log(`${context}成功创建令牌: ${groupKey}`);
                        } else {
                            failCount++;
                            console.warn(`${context}创建组 ${groupKey} 的令牌失败:`, createResult.message);
                        }
                    } catch (error) {
                        failCount++;
                        console.error(`${context}创建组 ${groupKey} 的令牌异常:`, error.message);
                    }

                    // 添加延迟避免频率限制
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            // 记录操作日志
            if (userId) {
                await this.logService.logAction(
                    userId,
                    'token_auto_create', 
                    `自动创建站点 ${site.name} 的缺失组令牌`,
                    { siteId: site.id, createCount, failCount }
                );
            }

            return {
                success: true,
                message: `自动创建完成：成功${createCount}个，失败${failCount}个，已跳过${existingGroups.size}个已存在的组`,
                data: { createCount, failCount, existingCount: existingGroups.size }
            };

        } catch (error) {
            console.error('自动创建令牌失败:', error);
            return this.handleApiError(error, '自动创建令牌失败');
        }
    }

    /**
     * 获取令牌组信息
     */
    async getTokenGroups(site) {
        try {
            const groupsUrl = `${site.url.replace(/\/$/, '')}/api/user/self/groups`;
            const context = '[获取令牌组]';

            console.log(`${context}发起请求: ${groupsUrl}`);

            const response = await this.get(groupsUrl, site, site.sessions, '', context);
            const data = this.processApiResponse(response, context);

            return {
                success: data.success,
                message: data.message || '获取令牌组成功',
                data: data.data
            };

        } catch (error) {
            console.error('获取令牌组失败:', error);
            return this.handleApiError(error, '获取令牌组失败');
        }
    }

    /**
     * 统一的API错误处理
     */
    handleApiError(error, defaultMessage) {
        if (error.code === 'ECONNABORTED') {
            return {
                success: false,
                message: '请求超时'
            };
        } else if (error.response) {
            return {
                success: false,
                message: `HTTP ${error.response.status}: ${error.response.statusText}`
            };
        } else {
            return {
                success: false,
                message: error.message || defaultMessage
            };
        }
    }
}

module.exports = TokenService;