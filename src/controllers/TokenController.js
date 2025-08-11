const TokenService = require('../services/TokenService');

class TokenController {
    constructor() {
        this.tokenService = new TokenService();
    }

    // 获取站点令牌列表
    async getTokens(req, res) {
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

            const result = await this.tokenService.getTokens(site, req.session.userId);
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message
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

            const result = await this.tokenService.toggleTokenStatus(site, id, status, req.session.userId);
            
            if (result.success) {
                const action = status === 1 ? '启用' : '禁用';
                res.json({
                    success: true,
                    message: `令牌${action}成功`,
                    data: result.data
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message
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

            const result = await this.tokenService.deleteToken(site, tokenId, req.session.userId);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: '令牌删除成功'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message
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

            const result = await this.tokenService.getTokenGroups(site);
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message
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

            const result = await this.tokenService.createToken(site, tokenData, req.session.userId);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: '令牌创建成功'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message
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

            const result = await this.tokenService.deleteAllTokens(site, req.session.userId);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: result.message,
                    data: { 
                        deleteCount: result.deletedCount, 
                        failCount: result.errors?.length || 0 
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message
                });
            }
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

            const result = await this.tokenService.autoCreateTokens(site, req.session.userId);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: result.message,
                    data: result.data
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message
                });
            }
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
}

module.exports = TokenController;