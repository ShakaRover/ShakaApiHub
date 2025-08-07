const ApiSiteService = require('../services/ApiSiteService');
const SiteCheckService = require('../services/SiteCheckService');
const BackupService = require('../services/BackupService');

class ApiSiteController {
    constructor() {
        this.apiSiteService = new ApiSiteService();
        this.siteCheckService = new SiteCheckService();
        this.backupService = new BackupService();
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

    // 检测站点
    async checkSite(req, res) {
        try {
            const { id } = req.params;
            
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: '无效的站点ID'
                });
            }

            const result = await this.siteCheckService.checkSite(parseInt(id));
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            
            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.checkSite:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 获取检测历史
    async getCheckHistory(req, res) {
        try {
            const { id } = req.params;
            
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: '无效的站点ID'
                });
            }

            const result = await this.siteCheckService.getCheckHistory(parseInt(id));
            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.getCheckHistory:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 导出API站点配置
    async exportApiSites(req, res) {
        console.log('=== exportApiSites called ===');
        console.log('Query params:', req.query);
        console.log('User ID:', req.session.userId);
        try {
            const userId = req.session.userId;
            const { siteIds, exportType = 'user' } = req.query;
            
            let targetUserId = null;
            let targetSiteIds = null;

            if (exportType === 'selected' && siteIds) {
                // 导出指定站点
                targetSiteIds = siteIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
                if (targetSiteIds.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: '没有选择有效的站点'
                    });
                }
            } else if (exportType === 'user') {
                // 导出当前用户的站点
                targetUserId = userId;
            }
            // exportType === 'all' 时，导出所有站点（管理员功能，这里先简化处理）

            console.log('Target user ID:', targetUserId);
            console.log('Target site IDs:', targetSiteIds);

            const result = await this.apiSiteService.exportApiSites(targetUserId, targetSiteIds);
            
            console.log('Export result:', result.success ? 'Success' : 'Failed');
            console.log('Export message:', result.message);

            if (!result.success) {
                return res.status(400).json(result);
            }

            // 设置下载响应头
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `api_sites_export_${timestamp}.json`;
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.json(result.data);
        } catch (error) {
            console.error('ApiSiteController.exportApiSites:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 导入API站点配置
    async importApiSites(req, res) {
        try {
            const userId = req.session.userId;
            const { importData, options = {} } = req.body;

            if (!importData) {
                return res.status(400).json({
                    success: false,
                    message: '缺少导入数据'
                });
            }

            const result = await this.apiSiteService.importApiSites(importData, userId, options);
            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.importApiSites:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 创建备份
    async createBackup(req, res) {
        try {
            const userId = req.session.userId;
            const { backupType = 'manual', includeAllUsers = false } = req.body;

            // 如果includeAllUsers为true，则备份所有用户的站点（管理员功能）
            const targetUserId = includeAllUsers ? null : userId;

            const result = await this.backupService.createBackup(targetUserId, backupType);
            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.createBackup:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 获取备份列表
    async getBackupList(req, res) {
        try {
            const userId = req.session.userId;
            const { includeAllUsers = false } = req.query;

            // 如果includeAllUsers为true，则获取所有备份（管理员功能）
            const targetUserId = includeAllUsers === 'true' ? null : userId;

            const result = await this.backupService.getBackupList(targetUserId);
            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.getBackupList:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 恢复备份
    async restoreBackup(req, res) {
        try {
            const userId = req.session.userId;
            const { fileName, options = {} } = req.body;

            if (!fileName) {
                return res.status(400).json({
                    success: false,
                    message: '缺少备份文件名'
                });
            }

            const result = await this.backupService.restoreFromBackup(fileName, userId, options);
            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.restoreBackup:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 删除备份
    async deleteBackup(req, res) {
        try {
            const { fileName } = req.params;

            if (!fileName) {
                return res.status(400).json({
                    success: false,
                    message: '缺少备份文件名'
                });
            }

            const result = await this.backupService.deleteBackup(fileName);
            
            if (!result.success) {
                const statusCode = result.message.includes('不存在') ? 404 : 400;
                return res.status(statusCode).json(result);
            }

            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.deleteBackup:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 验证备份文件
    async validateBackup(req, res) {
        try {
            const { fileName } = req.params;

            if (!fileName) {
                return res.status(400).json({
                    success: false,
                    message: '缺少备份文件名'
                });
            }

            const result = await this.backupService.validateBackupFile(fileName);
            
            if (!result.valid) {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }

            res.json({
                success: true,
                data: result.data,
                message: result.message
            });
        } catch (error) {
            console.error('ApiSiteController.validateBackup:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 下载备份文件
    async downloadBackup(req, res) {
        try {
            const { fileName } = req.params;

            if (!fileName) {
                return res.status(400).json({
                    success: false,
                    message: '缺少备份文件名'
                });
            }

            const result = await this.backupService.downloadBackup(fileName);
            
            if (!result.success) {
                const statusCode = result.message.includes('不存在') ? 404 : 400;
                return res.status(statusCode).json(result);
            }

            // 设置下载响应头
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Length', result.data.fileSize);

            // 发送文件内容
            res.send(result.data.content);
        } catch (error) {
            console.error('ApiSiteController.downloadBackup:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    // 获取导入帮助信息
    getImportHelp(req, res) {
        try {
            const result = this.apiSiteService.getImportHelp();
            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.getImportHelp:', error.message);
            res.status(500).json({
                success: false,
                message: '获取导入帮助失败'
            });
        }
    }

    // 诊断导入数据
    async diagnoseImportData(req, res) {
        try {
            const { importData } = req.body;
            const result = await this.apiSiteService.diagnoseImportData(importData);
            res.json(result);
        } catch (error) {
            console.error('ApiSiteController.diagnoseImportData:', error.message);
            res.status(500).json({
                success: false,
                message: '诊断导入数据失败'
            });
        }
    }
}

module.exports = ApiSiteController;