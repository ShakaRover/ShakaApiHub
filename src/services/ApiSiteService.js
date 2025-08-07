const ApiSite = require('../models/ApiSite');
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
        if (!apiType || typeof apiType !== 'string' || !['NewApi', 'Veloera', 'AnyRouter'].includes(apiType)) {
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
            if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
                return { isValid: false, message: 'Token授权方式必须提供userId信息' };
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
                    apiType: 'API类型 (NewApi, Veloera, AnyRouter)',
                    name: '站点名称 (不超过100字符)',
                    url: 'API地址 (有效的URL)',
                    authMethod: '授权方式 (sessions, token)'
                },
                conditionalFields: {
                    sessions: '当authMethod为sessions时必需',
                    token: '当authMethod为token时必需',
                    userId: '当authMethod为token或apiType为AnyRouter时必需'
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
}

module.exports = ApiSiteService;