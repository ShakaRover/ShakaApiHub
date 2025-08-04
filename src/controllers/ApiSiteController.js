const ApiSiteService = require('../services/ApiSiteService');

class ApiSiteController {
    constructor() {
        this.apiSiteService = new ApiSiteService();
    }

    // 获取所有API站点
    async getAllApiSites(req, res) {
        try {
            const result = await this.apiSiteService.getAllApiSites();
            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.getAllApiSites:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 根据ID获取API站点
    async getApiSiteById(req, res) {
        try {
            const { id } = req.params;
            const result = await this.apiSiteService.getApiSiteById(id);
            
            if (!result.success) {
                return res.status(404).json(result);
            }
            
            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.getApiSiteById:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 获取当前用户的API站点
    async getUserApiSites(req, res) {
        try {
            const userId = req.session.userId;
            const result = await this.apiSiteService.getApiSitesByUser(userId);
            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.getUserApiSites:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 创建API站点
    async createApiSite(req, res) {
        try {
            const userId = req.session.userId;
            const apiSiteData = req.body;
            
            const result = await this.apiSiteService.createApiSite(apiSiteData, userId);
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            
            res.status(201).json(result);
        } catch (error) {
            console.error('ApiSiteController.createApiSite:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 更新API站点
    async updateApiSite(req, res) {
        try {
            const { id } = req.params;
            const apiSiteData = req.body;
            
            const result = await this.apiSiteService.updateApiSite(id, apiSiteData);
            
            if (!result.success) {
                const statusCode = result.message.includes('不存在') ? 404 : 400;
                return res.status(statusCode).json(result);
            }
            
            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.updateApiSite:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 删除API站点
    async deleteApiSite(req, res) {
        try {
            const { id } = req.params;
            
            const result = await this.apiSiteService.deleteApiSite(id);
            
            if (!result.success) {
                const statusCode = result.message.includes('不存在') ? 404 : 400;
                return res.status(statusCode).json(result);
            }
            
            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.deleteApiSite:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 切换API站点启用状态
    async toggleApiSiteEnabled(req, res) {
        try {
            const { id } = req.params;
            const { enabled } = req.body;
            
            if (typeof enabled !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: '启用状态必须是布尔值'
                });
            }
            
            const result = await this.apiSiteService.toggleApiSiteEnabled(id, enabled);
            
            if (!result.success) {
                const statusCode = result.message.includes('不存在') ? 404 : 400;
                return res.status(statusCode).json(result);
            }
            
            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.toggleApiSiteEnabled:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 获取API站点统计
    async getApiSiteStats(req, res) {
        try {
            const result = await this.apiSiteService.getApiSiteStats();
            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.getApiSiteStats:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }
}

module.exports = ApiSiteController;