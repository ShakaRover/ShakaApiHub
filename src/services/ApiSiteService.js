const ApiSite = require('../models/ApiSite');
const ApiTypeValidator = require('../utils/ApiTypeValidator');
const ImportDiagnostic = require('../utils/importDiagnostic');

class ApiSiteService {
    constructor() {
        this.apiSiteModel = new ApiSite();
    }

    // 获取所有API站点
    async getAllApiSites() {
        try {
            const sites = await this.apiSiteModel.findAll();
            return {
                success: true,
                data: sites,
                message: '获取API站点列表成功'
            };
        } catch (error) {
            console.error('ApiSiteService.getAllApiSites:', error.message);
            return {
                success: false,
                message: error.message || '获取API站点列表失败'
            };
        }
    }

    // 根据ID获取API站点
    async getApiSiteById(id) {
        try {
            if (!id || isNaN(id)) {
                return {
                    success: false,
                    message: '无效的API站点ID'
                };
            }

            const site = await this.apiSiteModel.findById(parseInt(id));
            if (!site) {
                return {
                    success: false,
                    message: 'API站点不存在'
                };
            }

            return {
                success: true,
                data: site,
                message: '获取API站点成功'
            };
        } catch (error) {
            console.error('ApiSiteService.getApiSiteById:', error.message);
            return {
                success: false,
                message: error.message || '获取API站点失败'
            };
        }
    }

    // 根据创建者获取API站点
    async getApiSitesByUser(userId) {
        try {
            if (!userId || isNaN(userId)) {
                return {
                    success: false,
                    message: '无效的用户ID'
                };
            }

            const sites = await this.apiSiteModel.findByCreatedBy(parseInt(userId));
            return {
                success: true,
                data: sites,
                message: '获取用户API站点成功'
            };
        } catch (error) {
            console.error('ApiSiteService.getApiSitesByUser:', error.message);
            return {
                success: false,
                message: error.message || '获取用户API站点失败'
            };
        }
    }

    // 创建API站点
    async createApiSite(apiSiteData, createdBy) {
        try {
            // 数据验证
            const validationResult = this.validateApiSiteData(apiSiteData);
            if (!validationResult.isValid) {
                return {
                    success: false,
                    message: validationResult.message
                };
            }

            // 添加创建者信息
            const data = {
                ...apiSiteData,
                createdBy: parseInt(createdBy)
            };

            const newSite = await this.apiSiteModel.create(data);
            return {
                success: true,
                data: newSite,
                message: 'API站点创建成功'
            };
        } catch (error) {
            console.error('ApiSiteService.createApiSite:', error.message);
            return {
                success: false,
                message: error.message || 'API站点创建失败'
            };
        }
    }

    // 更新API站点
    async updateApiSite(id, apiSiteData) {
        try {
            if (!id || isNaN(id)) {
                return {
                    success: false,
                    message: '无效的API站点ID'
                };
            }

            // 数据验证
            const validationResult = this.validateApiSiteData(apiSiteData);
            if (!validationResult.isValid) {
                return {
                    success: false,
                    message: validationResult.message
                };
            }

            const updatedSite = await this.apiSiteModel.update(parseInt(id), apiSiteData);
            return {
                success: true,
                data: updatedSite,
                message: 'API站点更新成功'
            };
        } catch (error) {
            console.error('ApiSiteService.updateApiSite:', error.message);
            return {
                success: false,
                message: error.message || 'API站点更新失败'
            };
        }
    }

    // 删除API站点
    async deleteApiSite(id) {
        try {
            if (!id || isNaN(id)) {
                return {
                    success: false,
                    message: '无效的API站点ID'
                };
            }

            await this.apiSiteModel.delete(parseInt(id));
            return {
                success: true,
                message: 'API站点删除成功'
            };
        } catch (error) {
            console.error('ApiSiteService.deleteApiSite:', error.message);
            return {
                success: false,
                message: error.message || 'API站点删除失败'
            };
        }
    }

    // 切换API站点启用状态
    async toggleApiSiteEnabled(id, enabled) {
        try {
            if (!id || isNaN(id)) {
                return {
                    success: false,
                    message: '无效的API站点ID'
                };
            }

            const updatedSite = this.apiSiteModel.toggleEnabled(parseInt(id), Boolean(enabled));
            return {
                success: true,
                data: updatedSite,
                message: `API站点已${enabled ? '启用' : '禁用'}`
            };
        } catch (error) {
            console.error('ApiSiteService.toggleApiSiteEnabled:', error.message);
            return {
                success: false,
                message: error.message || '切换API站点状态失败'
            };
        }
    }

    // 获取API站点统计
    async getApiSiteStats() {
        try {
            const stats = await this.apiSiteModel.getStats();
            return {
                success: true,
                data: stats,
                message: '获取统计数据成功'
            };
        } catch (error) {
            console.error('ApiSiteService.getApiSiteStats:', error.message);
            return {
                success: false,
                message: error.message || '获取统计数据失败'
            };
        }
    }

    // 导出API站点配置
    async exportApiSites(userId = null, siteIds = null) {
        try {
            let sites;
            if (siteIds && Array.isArray(siteIds) && siteIds.length > 0) {
                // 导出指定站点
                sites = [];
                for (const id of siteIds) {
                    const site = await this.apiSiteModel.findById(parseInt(id));
                    if (site) {
                        sites.push(site);
                    }
                }
            } else if (userId) {
                // 导出指定用户的站点
                sites = await this.apiSiteModel.findByCreatedBy(parseInt(userId));
            } else {
                // 导出所有站点
                sites = await this.apiSiteModel.findAll();
            }

            // 过滤掉敏感的数据库信息并添加导出元数据
            const exportData = {
                metadata: {
                    exportTime: new Date().toISOString(),
                    version: '1.0',
                    totalSites: sites.length
                },
                sites: sites.map(site => ({
                    apiType: site.api_type,
                    name: site.name,
                    url: site.url,
                    authMethod: site.auth_method,
                    sessions: site.sessions,
                    token: site.token,
                    userId: site.user_id,
                    enabled: Boolean(site.enabled),
                    autoCheckin: Boolean(site.auto_checkin)
                }))
            };

            return {
                success: true,
                data: exportData,
                message: `成功导出${sites.length}个站点配置`
            };
        } catch (error) {
            console.error('ApiSiteService.exportApiSites:', error.message);
            return {
                success: false,
                message: error.message || '导出站点配置失败'
            };
        }
    }

    // 导入API站点配置
    async importApiSites(importData, createdBy, options = { skipExisting: false, overwrite: false }) {
        try {
            // 使用诊断工具验证导入数据
            const diagnostic = ImportDiagnostic.diagnoseImportData(importData);
            
            if (!diagnostic.isValid) {
                const report = ImportDiagnostic.generateReport(diagnostic);
                console.error('数据导入验证失败:\n', report);
                
                // 返回第一个严重问题的信息
                const firstIssue = diagnostic.issues[0];
                return {
                    success: false,
                    message: firstIssue ? firstIssue.message : '导入数据格式验证失败',
                    diagnostic: diagnostic,
                    report: report
                };
            }

            // 如果有警告，记录但继续处理
            if (diagnostic.warnings.length > 0) {
                console.warn('数据导入警告:', diagnostic.warnings.map(w => w.message).join('; '));
            }

            const results = {
                total: importData.sites.length,
                success: 0,
                failed: 0,
                skipped: 0,
                errors: []
            };

            // 处理每个站点
            for (let i = 0; i < importData.sites.length; i++) {
                const siteData = importData.sites[i];
                try {
                    // 验证站点数据
                    const validationResult = this.validateApiSiteData(siteData);
                    if (!validationResult.isValid) {
                        results.failed++;
                        results.errors.push({
                            index: i + 1,
                            name: siteData.name || '未知',
                            error: validationResult.message
                        });
                        continue;
                    }

                    // 检查是否已存在同名站点
                    const existingSites = await this.apiSiteModel.findAll();
                    const existingSite = existingSites.find(site => 
                        site.name === siteData.name && site.created_by === parseInt(createdBy)
                    );

                    if (existingSite) {
                        if (options.skipExisting) {
                            results.skipped++;
                            continue;
                        } else if (options.overwrite) {
                            // 更新现有站点
                            await this.updateApiSite(existingSite.id, siteData);
                            results.success++;
                            continue;
                        } else {
                            results.failed++;
                            results.errors.push({
                                index: i + 1,
                                name: siteData.name,
                                error: '站点名称已存在'
                            });
                            continue;
                        }
                    }

                    // 创建新站点
                    const createResult = await this.createApiSite(siteData, createdBy);
                    if (createResult.success) {
                        results.success++;
                    } else {
                        results.failed++;
                        results.errors.push({
                            index: i + 1,
                            name: siteData.name,
                            error: createResult.message
                        });
                    }
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        index: i + 1,
                        name: siteData.name || '未知',
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                data: results,
                message: `导入完成：成功${results.success}个，失败${results.failed}个，跳过${results.skipped}个`
            };
        } catch (error) {
            console.error('ApiSiteService.importApiSites:', error.message);
            return {
                success: false,
                message: error.message || '导入站点配置失败'
            };
        }
    }

    // 验证API站点数据
    validateApiSiteData(data) {
        const { apiType, name, url, authMethod, sessions, token, userId } = data;

        // 必填字段验证
        if (!apiType || typeof apiType !== 'string' || !['NewApi', 'Veloera', 'AnyRouter', 'VoApi', 'DoneHub'].includes(apiType)) {
            return { isValid: false, message: '请选择有效的API类型' };
        }

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return { isValid: false, message: 'API站点名称不能为空' };
        }

        if (name.trim().length > 100) {
            return { isValid: false, message: 'API站点名称长度不能超过100个字符' };
        }

        if (!url || typeof url !== 'string' || url.trim().length === 0) {
            return { isValid: false, message: 'API地址不能为空' };
        }

        // URL格式验证
        try {
            new URL(url.trim());
        } catch (error) {
            return { isValid: false, message: '请输入有效的URL地址' };
        }

        if (!authMethod || !['sessions', 'token'].includes(authMethod)) {
            return { isValid: false, message: '请选择有效的授权方式' };
        }

        // AnyRouter只支持sessions模式
        if (apiType === 'AnyRouter' && authMethod === 'token') {
            return { isValid: false, message: 'AnyRouter只支持Sessions授权方式' };
        }

        // AnyRouter必须提供User ID
        if (apiType === 'AnyRouter' && (!userId || typeof userId !== 'string' || userId.trim().length === 0)) {
            return { isValid: false, message: 'AnyRouter类型必须提供User ID信息' };
        }

        // 根据授权方式验证特定字段
        if (authMethod === 'sessions') {
            if (!sessions || typeof sessions !== 'string' || sessions.trim().length === 0) {
                return { isValid: false, message: 'Sessions授权方式必须提供sessions信息' };
            }
        }

        if (authMethod === 'token') {
            if (!token || typeof token !== 'string' || token.trim().length === 0) {
                return { isValid: false, message: 'Token授权方式必须提供token信息' };
            }
            // 使用 ApiTypeValidator 检查是否需要 userId
            if (ApiTypeValidator.requiresUserId(apiType, authMethod)) {
                if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
                    return { isValid: false, message: `${apiType} 的 Token授权方式必须提供userId信息` };
                }
            }
        }

        return { isValid: true };
    }

    // 获取导入帮助信息
    getImportHelp() {
        return {
            success: true,
            data: {
                format: '导入数据必须是JSON格式，包含sites数组',
                requiredFields: {
                    apiType: 'API类型 (NewApi, Veloera, AnyRouter, VoApi, DoneHub)',
                    name: '站点名称 (不超过100字符)',
                    url: 'API地址 (有效的URL)',
                    authMethod: '授权方式 (sessions, token)'
                },
                conditionalFields: {
                    sessions: '当authMethod为sessions时必需',
                    token: '当authMethod为token时必需',
                    userId: '根据API类型和授权方式可能需要（NewApi/Veloera/VoApi的token模式，AnyRouter的任何模式）'
                },
                optionalFields: {
                    enabled: '是否启用 (默认true)',
                    autoCheckin: '是否自动签到 (默认false)'
                },
                specialRules: {
                    AnyRouter: '只支持sessions授权方式，必须提供userId',
                    token: '授权方式必须同时提供token和userId'
                },
                sampleData: ImportDiagnostic.generateSampleData()
            },
            message: '导入数据格式说明'
        };
    }

    // 诊断导入数据
    async diagnoseImportData(importData) {
        try {
            const diagnostic = ImportDiagnostic.diagnoseImportData(importData);
            const report = ImportDiagnostic.generateReport(diagnostic);
            
            return {
                success: true,
                data: {
                    isValid: diagnostic.isValid,
                    issues: diagnostic.issues,
                    warnings: diagnostic.warnings,
                    suggestions: diagnostic.suggestions,
                    report: report
                },
                message: diagnostic.isValid ? '数据格式验证通过' : '数据格式存在问题'
            };
        } catch (error) {
            console.error('ApiSiteService.diagnoseImportData:', error.message);
            return {
                success: false,
                message: '诊断过程中发生错误: ' + error.message
            };
        }
    }

    // 兑换码充值
    async topupSite(siteId, topupKey) {
        const axios = require('axios');
        
        try {
            // 获取站点信息
            const site = await this.apiSiteModel.findById(siteId);
            if (!site) {
                return {
                    success: false,
                    message: 'API站点不存在'
                };
            }

            // 构建兑换码API URL
            const topupUrl = `${site.url.replace(/\/$/, '')}/api/user/topup`;
            
            // 准备请求头
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // 处理认证信息
            if (site.auth_method === 'token' && site.token) {
                headers['Authorization'] = `Bearer ${site.token}`;
            } else if (site.auth_method === 'sessions' && site.sessions) {
                try {
                    const sessionData = JSON.parse(site.sessions);
                    if (sessionData.token) {
                        headers['Authorization'] = `Bearer ${sessionData.token}`;
                    }
                    if (sessionData.cookie) {
                        headers['Cookie'] = sessionData.cookie;
                    }
                } catch (e) {
                    // 如果不是JSON，直接作为cookie使用
                    headers['Cookie'] = site.sessions;
                }
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

            console.log(`发起兑换码请求: ${topupUrl}`);
            console.log('请求头:', headers);
            console.log('兑换码:', topupKey);

            // 发送兑换码请求
            const response = await axios.post(topupUrl, {
                key: topupKey
            }, {
                headers,
                timeout: 15000,
                validateStatus: (status) => status < 500
            });

            console.log(`兑换码响应状态: ${response.status}`);
            console.log('响应数据:', response.data);

            const data = response.data;

            // 检查响应格式
            if (!data || typeof data !== 'object') {
                return {
                    success: false,
                    message: 'API返回数据格式错误'
                };
            }

            // 记录兑换操作日志
            try {
                const LogService = require('./LogService');
                const logService = new LogService();
                await logService.logUserAction(
                    null, // 暂时没有用户ID，可以从session获取
                    'api_site_topup',
                    `站点 ${site.name} 兑换码操作`,
                    {
                        site_id: siteId,
                        site_name: site.name,
                        topup_key: topupKey.substring(0, 4) + '****', // 只记录前4位
                        success: data.success,
                        message: data.message
                    }
                );
            } catch (logError) {
                console.error('记录兑换日志失败:', logError);
            }

            return {
                success: data.success || false,
                message: data.message || (data.success ? '兑换成功' : '兑换失败')
            };

        } catch (error) {
            console.error('兑换码处理失败:', error);
            
            // 记录错误日志
            try {
                const LogService = require('./LogService');
                const logService = new LogService();
                await logService.logUserAction(
                    null,
                    'api_site_topup_error',
                    `站点兑换码操作失败: ${error.message}`,
                    {
                        site_id: siteId,
                        error: error.message
                    }
                );
            } catch (logError) {
                console.error('记录错误日志失败:', logError);
            }

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
                    message: error.message || '兑换码处理失败'
                };
            }
        }
    }

    // 切换令牌状态
    async toggleToken(siteId, tokenId, newStatus) {
        const axios = require('axios');
        
        try {
            // 获取站点信息
            const site = await this.apiSiteModel.findById(siteId);
            if (!site) {
                return {
                    success: false,
                    message: 'API站点不存在'
                };
            }

            // 构建令牌状态切换API URL (修正为规范路径)
            const toggleUrl = `${site.url.replace(/\/$/, '')}/api/token/?status_only=true`;
            
            // 准备请求头
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // 处理认证信息
            if (site.auth_method === 'token' && site.token) {
                headers['Authorization'] = `Bearer ${site.token}`;
            } else if (site.auth_method === 'sessions' && site.sessions) {
                try {
                    const sessionData = JSON.parse(site.sessions);
                    if (sessionData.token) {
                        headers['Authorization'] = `Bearer ${sessionData.token}`;
                    }
                    if (sessionData.cookie) {
                        headers['Cookie'] = sessionData.cookie;
                    }
                } catch (e) {
                    headers['Cookie'] = site.sessions;
                }
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

            console.log(`发起令牌状态切换请求: ${toggleUrl}`);
            console.log('新状态:', newStatus);

            // 发送状态切换请求 (修正请求体为 {id, status})
            const response = await axios.put(toggleUrl, {
                id: tokenId,
                status: newStatus
            }, {
                headers,
                timeout: 15000,
                validateStatus: (status) => status < 500
            });

            console.log(`令牌状态切换响应状态: ${response.status}`);
            console.log('响应数据:', response.data);

            const data = response.data;

            return {
                success: data.success || false,
                message: data.message || (data.success ? '令牌状态更新成功' : '令牌状态更新失败')
            };

        } catch (error) {
            console.error('令牌状态切换失败:', error);
            
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
                    message: error.message || '令牌状态切换失败'
                };
            }
        }
    }

    // 删除令牌
    async deleteToken(siteId, tokenId) {
        const axios = require('axios');
        
        try {
            // 获取站点信息
            const site = await this.apiSiteModel.findById(siteId);
            if (!site) {
                return {
                    success: false,
                    message: 'API站点不存在'
                };
            }

            // 构建令牌删除API URL
            const deleteUrl = `${site.url.replace(/\/$/, '')}/api/token/${tokenId}`;
            
            // 准备请求头
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // 处理认证信息
            if (site.auth_method === 'token' && site.token) {
                headers['Authorization'] = `Bearer ${site.token}`;
            } else if (site.auth_method === 'sessions' && site.sessions) {
                try {
                    const sessionData = JSON.parse(site.sessions);
                    if (sessionData.token) {
                        headers['Authorization'] = `Bearer ${sessionData.token}`;
                    }
                    if (sessionData.cookie) {
                        headers['Cookie'] = sessionData.cookie;
                    }
                } catch (e) {
                    headers['Cookie'] = site.sessions;
                }
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

            console.log(`发起令牌删除请求: ${deleteUrl}`);

            // 发送删除请求
            const response = await axios.delete(deleteUrl, {
                headers,
                timeout: 15000,
                validateStatus: (status) => status < 500
            });

            console.log(`令牌删除响应状态: ${response.status}`);
            console.log('响应数据:', response.data);

            const data = response.data;

            return {
                success: data.success || false,
                message: data.message || (data.success ? '令牌删除成功' : '令牌删除失败')
            };

        } catch (error) {
            console.error('令牌删除失败:', error);
            
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
                    message: error.message || '令牌删除失败'
                };
            }
        }
    }

    // 全部删除令牌
    async deleteAllTokens(siteId) {
        const axios = require('axios');
        
        try {
            // 获取站点信息
            const site = await this.apiSiteModel.findById(siteId);
            if (!site) {
                return {
                    success: false,
                    message: 'API站点不存在'
                };
            }

            // 首先获取令牌列表
            const tokenListUrl = `${site.url.replace(/\/$/, '')}/api/token/?p=0&size=10`;
            
            // 准备请求头
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // 处理认证信息
            if (site.auth_method === 'token' && site.token) {
                headers['Authorization'] = `Bearer ${site.token}`;
            } else if (site.auth_method === 'sessions' && site.sessions) {
                try {
                    const sessionData = JSON.parse(site.sessions);
                    if (sessionData.token) {
                        headers['Authorization'] = `Bearer ${sessionData.token}`;
                    }
                    if (sessionData.cookie) {
                        headers['Cookie'] = sessionData.cookie;
                    }
                } catch (e) {
                    headers['Cookie'] = site.sessions;
                }
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

            console.log(`获取令牌列表: ${tokenListUrl}`);

            // 获取令牌列表
            const listResponse = await axios.get(tokenListUrl, {
                headers,
                timeout: 15000,
                validateStatus: (status) => status < 500
            });

            console.log(`令牌列表响应状态: ${listResponse.status}`);

            if (!listResponse.data || !listResponse.data.success) {
                return {
                    success: false,
                    message: '获取令牌列表失败'
                };
            }

            const tokens = listResponse.data.data?.records || [];
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
                    const deleteUrl = `${site.url.replace(/\/$/, '')}/api/token/${token.id}`;
                    const deleteResponse = await axios.delete(deleteUrl, {
                        headers,
                        timeout: 10000,
                        validateStatus: (status) => status < 500
                    });

                    if (deleteResponse.data && deleteResponse.data.success) {
                        deletedCount++;
                        console.log(`成功删除令牌: ${token.name}`);
                    } else {
                        errors.push(`删除令牌 ${token.name} 失败: ${deleteResponse.data?.message || '未知错误'}`);
                    }
                } catch (deleteError) {
                    errors.push(`删除令牌 ${token.name} 失败: ${deleteError.message}`);
                }
            }

            return {
                success: true,
                message: `删除操作完成，成功删除${deletedCount}个令牌${errors.length > 0 ? `，${errors.length}个失败` : ''}`,
                deletedCount: deletedCount,
                errors: errors
            };

        } catch (error) {
            console.error('批量删除令牌失败:', error);
            
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
                    message: error.message || '批量删除令牌失败'
                };
            }
        }
    }

    // 自动创建令牌
    async autoCreateTokens(siteId) {
        const axios = require('axios');
        
        try {
            // 获取站点信息
            const site = await this.apiSiteModel.findById(siteId);
            if (!site) {
                return {
                    success: false,
                    message: 'API站点不存在'
                };
            }

            // 构建令牌创建API URL
            const createUrl = `${site.url.replace(/\/$/, '')}/api/token`;
            
            // 准备请求头
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // 处理认证信息
            if (site.auth_method === 'token' && site.token) {
                headers['Authorization'] = `Bearer ${site.token}`;
            } else if (site.auth_method === 'sessions' && site.sessions) {
                try {
                    const sessionData = JSON.parse(site.sessions);
                    if (sessionData.token) {
                        headers['Authorization'] = `Bearer ${sessionData.token}`;
                    }
                    if (sessionData.cookie) {
                        headers['Cookie'] = sessionData.cookie;
                    }
                } catch (e) {
                    headers['Cookie'] = site.sessions;
                }
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

            // 自动创建多个令牌的配置
            const tokenConfigs = [
                { name: `AutoToken_${Date.now()}_1`, expired_time: -1, remain_quota: 500000 },
                { name: `AutoToken_${Date.now()}_2`, expired_time: -1, remain_quota: 500000 },
                { name: `AutoToken_${Date.now()}_3`, expired_time: -1, remain_quota: 500000 }
            ];

            console.log(`开始自动创建${tokenConfigs.length}个令牌`);

            let createdCount = 0;
            const errors = [];

            // 逐个创建令牌
            for (const tokenConfig of tokenConfigs) {
                try {
                    console.log(`创建令牌: ${tokenConfig.name}`);
                    
                    const response = await axios.post(createUrl, tokenConfig, {
                        headers,
                        timeout: 15000,
                        validateStatus: (status) => status < 500
                    });

                    console.log(`令牌创建响应: ${response.status}`, response.data);

                    if (response.data && response.data.success) {
                        createdCount++;
                        console.log(`成功创建令牌: ${tokenConfig.name}`);
                    } else {
                        errors.push(`创建令牌 ${tokenConfig.name} 失败: ${response.data?.message || '未知错误'}`);
                    }
                } catch (createError) {
                    errors.push(`创建令牌 ${tokenConfig.name} 失败: ${createError.message}`);
                }

                // 添加延迟避免频率限制
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            return {
                success: true,
                message: `创建操作完成，成功创建${createdCount}个令牌${errors.length > 0 ? `，${errors.length}个失败` : ''}`,
                createdCount: createdCount,
                errors: errors
            };

        } catch (error) {
            console.error('自动创建令牌失败:', error);
            
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
                    message: error.message || '自动创建令牌失败'
                };
            }
        }
    }
}

module.exports = ApiSiteService;