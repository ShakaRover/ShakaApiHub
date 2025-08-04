const ApiSite = require('../models/ApiSite');

class ApiSiteService {
    constructor() {
        this.apiSiteModel = new ApiSite();
    }

    // 获取所有API站点
    async getAllApiSites() {
        try {
            const sites = this.apiSiteModel.findAll();
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

            const site = this.apiSiteModel.findById(parseInt(id));
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

            const sites = this.apiSiteModel.findByCreatedBy(parseInt(userId));
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

            const newSite = this.apiSiteModel.create(data);
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

            const updatedSite = this.apiSiteModel.update(parseInt(id), apiSiteData);
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
            const stats = this.apiSiteModel.getStats();
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

    // 验证API站点数据
    validateApiSiteData(data) {
        const { apiType, name, url, authMethod, sessions, token, userId } = data;

        // 必填字段验证
        if (!apiType || typeof apiType !== 'string' || !['NewApi', 'Veloera'].includes(apiType)) {
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
}

module.exports = ApiSiteService;