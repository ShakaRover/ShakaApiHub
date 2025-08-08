const axios = require('axios');
const LogService = require('../services/LogService');

class TokenController {
    constructor() {
        this.logService = new LogService();
    }

    // 获取站点令牌列表
    async getTokens(req, res) {
        try {
            const { siteId } = req.params;
            const { p = 1, size = 10 } = req.query;
            
            // 获取站点信息
            const site = await this.getSiteById(siteId);
            if (!site) {
                return res.status(404).json({
                    success: false,
                    message: '站点不存在'
                });
            }

            // 构建请求
            const result = await this.makeApiRequest(site, `/api/token/?p=${p}&size=${size}`, 'GET');
            
            if (result.success && result.data && result.data.data && result.data.data.records) {
                // 记录操作日志
                await this.logService.logAction(
                    req.session.userId,
                    'token_list', 
                    `获取站点 ${site.name} 的令牌列表`,
                    { siteId, count: result.data.data.records.length }
                );

                res.json({
                    success: true,
                    data: result.data.data
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message || '获取令牌列表失败'
                });
            }
        } catch (error) {
            console.error('获取令牌列表失败:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 更新令牌状态
    async updateTokenStatus(req, res) {
        try {
            const { siteId } = req.params;
            const { id, status } = req.body;
            
            if (!id || (status !== 1 && status !== 2)) {
                return res.status(400).json({
                    success: false,
                    message: '参数错误：id必填，status必须为1或2'
                });
            }

            // 获取站点信息
            const site = await this.getSiteById(siteId);
            if (!site) {
                return res.status(404).json({
                    success: false,
                    message: '站点不存在'
                });
            }

            // 构建请求
            const result = await this.makeApiRequest(
                site, 
                '/api/token/?status_only=true', 
                'PUT',
                { id, status }
            );
            
            if (result.success) {
                // 记录操作日志
                const action = status === 1 ? '启用' : '禁用';
                await this.logService.logAction(
                    req.session.userId,
                    'token_status', 
                    `${action}站点 ${site.name} 的令牌 ${id}`,
                    { siteId, tokenId: id, status }
                );

                res.json({
                    success: true,
                    message: `令牌${action}成功`,
                    data: result.data
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message || '更新令牌状态失败'
                });
            }
        } catch (error) {
            console.error('更新令牌状态失败:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 删除令牌
    async deleteToken(req, res) {
        try {
            const { siteId, tokenId } = req.params;
            
            // 获取站点信息
            const site = await this.getSiteById(siteId);
            if (!site) {
                return res.status(404).json({
                    success: false,
                    message: '站点不存在'
                });
            }

            // 构建请求
            const result = await this.makeApiRequest(
                site, 
                `/api/token/${tokenId}`, 
                'DELETE'
            );
            
            if (result.success) {
                // 记录操作日志
                await this.logService.logAction(
                    req.session.userId,
                    'token_delete', 
                    `删除站点 ${site.name} 的令牌 ${tokenId}`,
                    { siteId, tokenId }
                );

                res.json({
                    success: true,
                    message: '令牌删除成功'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message || '删除令牌失败'
                });
            }
        } catch (error) {
            console.error('删除令牌失败:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 获取令牌组信息
    async getTokenGroups(req, res) {
        try {
            const { siteId } = req.params;
            
            // 获取站点信息
            const site = await this.getSiteById(siteId);
            if (!site) {
                return res.status(404).json({
                    success: false,
                    message: '站点不存在'
                });
            }

            // 构建请求
            const result = await this.makeApiRequest(site, '/api/user/self/groups', 'GET');
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message || '获取令牌组失败'
                });
            }
        } catch (error) {
            console.error('获取令牌组失败:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 创建令牌
    async createToken(req, res) {
        try {
            const { siteId } = req.params;
            const { name, remain_quota, expired_time, unlimited_quota, model_limits_enabled, model_limits, allow_ips, group } = req.body;
            
            // 参数验证
            if (!name || !group) {
                return res.status(400).json({
                    success: false,
                    message: '参数错误：name和group必填'
                });
            }

            // 获取站点信息
            const site = await this.getSiteById(siteId);
            if (!site) {
                return res.status(404).json({
                    success: false,
                    message: '站点不存在'
                });
            }

            // 构建创建令牌的数据
            const tokenData = {
                name,
                remain_quota: remain_quota || 500000,
                expired_time: expired_time || -1,
                unlimited_quota: unlimited_quota !== undefined ? unlimited_quota : true,
                model_limits_enabled: model_limits_enabled !== undefined ? model_limits_enabled : false,
                model_limits: model_limits || "",
                allow_ips: allow_ips || "",
                group
            };

            // 构建请求
            const result = await this.makeApiRequest(site, '/api/token/', 'POST', tokenData);
            
            if (result.success) {
                // 记录操作日志
                await this.logService.logAction(
                    req.session.userId,
                    'token_create', 
                    `在站点 ${site.name} 创建令牌 ${name}`,
                    { siteId, tokenName: name, group }
                );

                res.json({
                    success: true,
                    message: '令牌创建成功'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message || '创建令牌失败'
                });
            }
        } catch (error) {
            console.error('创建令牌失败:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 批量删除所有令牌
    async deleteAllTokens(req, res) {
        try {
            const { siteId } = req.params;
            
            // 获取站点信息
            const site = await this.getSiteById(siteId);
            if (!site) {
                return res.status(404).json({
                    success: false,
                    message: '站点不存在'
                });
            }

            // 先获取令牌列表
            const listResult = await this.makeApiRequest(site, '/api/token/?p=1&size=100', 'GET');
            
            if (!listResult.success || !listResult.data.data || !listResult.data.data.records) {
                return res.status(400).json({
                    success: false,
                    message: '获取令牌列表失败'
                });
            }

            const tokens = listResult.data.data.records;
            let deleteCount = 0;
            let failCount = 0;

            // 逐个删除令牌
            for (const token of tokens) {
                try {
                    const deleteResult = await this.makeApiRequest(
                        site, 
                        `/api/token/${token.id}`, 
                        'DELETE'
                    );
                    
                    if (deleteResult.success) {
                        deleteCount++;
                    } else {
                        failCount++;
                        console.warn(`删除令牌 ${token.id} 失败:`, deleteResult.message);
                    }
                } catch (error) {
                    failCount++;
                    console.error(`删除令牌 ${token.id} 异常:`, error.message);
                }
            }

            // 记录操作日志
            await this.logService.logAction(
                req.session.userId,
                'token_delete_all', 
                `批量删除站点 ${site.name} 的所有令牌`,
                { siteId, deleteCount, failCount }
            );

            res.json({
                success: true,
                message: `批量删除完成：成功${deleteCount}个，失败${failCount}个`,
                data: { deleteCount, failCount }
            });
        } catch (error) {
            console.error('批量删除令牌失败:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 自动创建令牌（为每个不存在的组创建令牌）
    async autoCreateTokens(req, res) {
        try {
            const { siteId } = req.params;
            
            // 获取站点信息
            const site = await this.getSiteById(siteId);
            if (!site) {
                return res.status(404).json({
                    success: false,
                    message: '站点不存在'
                });
            }

            // 获取令牌组信息
            const groupsResult = await this.makeApiRequest(site, '/api/user/self/groups', 'GET');
            if (!groupsResult.success || !groupsResult.data) {
                return res.status(400).json({
                    success: false,
                    message: '获取令牌组失败'
                });
            }

            // 获取现有令牌列表
            const tokensResult = await this.makeApiRequest(site, '/api/token/?p=1&size=100', 'GET');
            const existingTokens = tokensResult.success && tokensResult.data.data && tokensResult.data.data.records 
                ? tokensResult.data.data.records 
                : [];

            // 获取已存在的组名
            const existingGroups = new Set(existingTokens.map(token => token.group));
            const availableGroups = groupsResult.data;

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

                        const createResult = await this.makeApiRequest(site, '/api/token/', 'POST', tokenData);
                        
                        if (createResult.success) {
                            createCount++;
                        } else {
                            failCount++;
                            console.warn(`创建组 ${groupKey} 的令牌失败:`, createResult.message);
                        }
                    } catch (error) {
                        failCount++;
                        console.error(`创建组 ${groupKey} 的令牌异常:`, error.message);
                    }
                }
            }

            // 记录操作日志
            await this.logService.logAction(
                req.session.userId,
                'token_auto_create', 
                `自动创建站点 ${site.name} 的缺失组令牌`,
                { siteId, createCount, failCount }
            );

            res.json({
                success: true,
                message: `自动创建完成：成功${createCount}个，失败${failCount}个，已跳过${existingGroups.size}个已存在的组`,
                data: { createCount, failCount, existingCount: existingGroups.size }
            });
        } catch (error) {
            console.error('自动创建令牌失败:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 辅助方法：获取站点信息
    async getSiteById(siteId) {
        const databaseConfig = require('../config/database');
        const statements = databaseConfig.getStatements();
        return await statements.findApiSiteById.get(siteId);
    }

    // 辅助方法：发起API请求
    async makeApiRequest(site, path, method = 'GET', data = null) {
        try {
            const url = `${site.url.replace(/\/$/, '')}${path}`;
            
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // 处理认证信息
            let configCookies = '';

            if (site.auth_method === 'token' && site.token) {
                headers['Authorization'] = `Bearer ${site.token}`;
            } else if (site.auth_method === 'sessions' && site.sessions) {
                try {
                    const sessionData = JSON.parse(site.sessions);
                    if (sessionData.token) {
                        headers['Authorization'] = `Bearer ${sessionData.token}`;
                    }
                    if (sessionData.cookie) {
                        configCookies = sessionData.cookie;
                    }
                } catch (e) {
                    configCookies = site.sessions;
                }
            }

            if (configCookies) {
                headers['Cookie'] = configCookies;
            }

            // 根据API类型添加用户头信息
            if (site.user_id) {
                if (site.api_type === 'AnyRouter' || site.api_type === 'NewApi') {
                    headers['new-api-user'] = site.user_id;
                } else if (site.api_type === 'Veloera') {
                    headers['veloera-user'] = site.user_id;
                } else if (site.api_type === 'VoApi') {
                    headers['voapi-user'] = site.user_id;
                }
            }

            const requestConfig = {
                method,
                url,
                headers,
                timeout: 15000,
                validateStatus: (status) => status < 500
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                requestConfig.data = data;
            }

            const response = await axios(requestConfig);

            if (response.status >= 400) {
                return {
                    success: false,
                    message: `HTTP ${response.status}: ${response.statusText}`,
                    data: response.data
                };
            }

            const responseData = response.data;

            if (!responseData || typeof responseData !== 'object') {
                return {
                    success: false,
                    message: 'API返回数据格式错误',
                    data: null
                };
            }

            return {
                success: responseData.success !== undefined ? responseData.success : true,
                message: responseData.message || '',
                data: responseData.success !== undefined ? responseData.data : responseData
            };

        } catch (error) {
            console.error('API请求失败:', error.message);
            return {
                success: false,
                message: `请求失败: ${error.message}`,
                data: null
            };
        }
    }
}

module.exports = TokenController;