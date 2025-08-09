const configService = require('../services/ConfigService');
const { logCleanupService } = require('../services/LogCleanupService');
const { systemSettingsService } = require('../services/SystemSettingsService');
const { timezoneManager } = require('../utils/TimezoneManager');
const ApiTypeValidator = require('../utils/ApiTypeValidator');
const { getSupportedApiTypes, getSupportedAuthMethods, getApiTypeConfig } = require('../config/apiTypes');

class SystemController {
    // 获取系统配置
    async getConfig(req, res) {
        try {
            const config = await configService.getConfig();
            res.json({
                success: true,
                data: config
            });
        } catch (error) {
            console.error('获取系统配置失败:', error);
            res.status(500).json({
                success: false,
                message: '获取系统配置失败'
            });
        }
    }

    // 更新系统配置
    async updateConfig(req, res) {
        try {
            const updates = req.body;
            
            // 验证配置数据
            if (updates.timezone && typeof updates.timezone !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: '时区配置格式错误'
                });
            }

            if (updates.logRetentionDays && (!Number.isInteger(updates.logRetentionDays) || updates.logRetentionDays < 1)) {
                return res.status(400).json({
                    success: false,
                    message: '日志保留天数必须是正整数'
                });
            }

            const config = await configService.updateConfig(updates);
            
            res.json({
                success: true,
                message: '系统配置更新成功',
                data: config
            });
        } catch (error) {
            console.error('更新系统配置失败:', error);
            res.status(500).json({
                success: false,
                message: '更新系统配置失败'
            });
        }
    }

    // 获取支持的时区列表
    async getTimezones(req, res) {
        try {
            if (systemSettingsService.initialized) {
                // 使用新的时区管理系统
                const timezoneSettings = systemSettingsService.getTimezoneSettings();
                res.json({
                    success: true,
                    data: {
                        current: timezoneSettings.current,
                        currentInfo: timezoneSettings.info,
                        available: timezoneSettings.available,
                        // 保持向后兼容
                        timezones: Object.values(timezoneSettings.available).reduce((acc, group) => {
                            return acc.concat(group.timezones);
                        }, [])
                    }
                });
            } else {
                // 降级到原始方法
                const timezones = configService.getSupportedTimezones();
                res.json({
                    success: true,
                    data: { timezones }
                });
            }
        } catch (error) {
            console.error('获取时区列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取时区列表失败'
            });
        }
    }

    // 获取系统状态信息
    async getSystemStatus(req, res) {
        try {
            const config = await configService.getConfig();
            const uptime = process.uptime();
            const memoryUsage = process.memoryUsage();

            res.json({
                success: true,
                data: {
                    uptime: Math.floor(uptime),
                    memory: {
                        used: Math.round(memoryUsage.rss / 1024 / 1024),
                        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
                    },
                    timezone: config.timezone,
                    nodeVersion: process.version,
                    platform: process.platform,
                    currentTime: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('获取系统状态失败:', error);
            res.status(500).json({
                success: false,
                message: '获取系统状态失败'
            });
        }
    }

    // 获取日志清理状态
    async getLogCleanupStatus(req, res) {
        try {
            const status = logCleanupService.getStatus();
            const config = await configService.getConfig();
            
            res.json({
                success: true,
                data: {
                    ...status,
                    retentionDays: config.logRetentionDays || 30
                }
            });
        } catch (error) {
            console.error('获取日志清理状态失败:', error);
            res.status(500).json({
                success: false,
                message: '获取日志清理状态失败'
            });
        }
    }

    // 触发手动日志清理
    async triggerLogCleanup(req, res) {
        try {
            const { retentionDays } = req.body;
            
            // 验证输入参数
            if (retentionDays && (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 365)) {
                return res.status(400).json({
                    success: false,
                    message: '保留天数必须是1-365之间的整数'
                });
            }

            const result = await logCleanupService.manualCleanup(retentionDays);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: result.message,
                    data: {
                        deleted: result.deleted
                    }
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('触发日志清理失败:', error);
            res.status(500).json({
                success: false,
                message: '触发日志清理失败'
            });
        }
    }

    // 获取日志清理统计
    async getLogCleanupStats(req, res) {
        try {
            const stats = await logCleanupService.getCleanupStats();
            
            if (stats.success) {
                res.json({
                    success: true,
                    data: stats.data
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: stats.message
                });
            }
        } catch (error) {
            console.error('获取日志清理统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取日志清理统计失败'
            });
        }
    }




    // 获取API类型配置信息
    async getApiTypes(req, res) {
        try {
            const apiTypes = getSupportedApiTypes();
            const authMethods = getSupportedAuthMethods();
            const configs = {};
            
            apiTypes.forEach(apiType => {
                configs[apiType] = getApiTypeConfig(apiType);
            });

            res.json({
                success: true,
                data: {
                    supportedApiTypes: apiTypes,
                    supportedAuthMethods: authMethods,
                    configs
                }
            });
        } catch (error) {
            console.error('获取API类型配置失败:', error.message);
            res.status(500).json({
                success: false,
                message: '获取API类型配置失败'
            });
        }
    }

    // 验证API站点配置
    async validateApiSite(req, res) {
        try {
            const siteData = req.body;

            const validation = ApiTypeValidator.validateApiSiteData(siteData);
            
            res.json({
                success: true,
                data: {
                    isValid: validation.isValid,
                    errors: validation.errors,
                    warnings: validation.warnings,
                    formattedMessage: validation.isValid ? '验证通过' : 
                        ApiTypeValidator.formatValidationErrors(validation)
                }
            });
        } catch (error) {
            console.error('验证API站点配置失败:', error.message);
            res.status(500).json({
                success: false,
                message: '验证失败'
            });
        }
    }

    // 获取时区配置详情
    async getTimezoneConfig(req, res) {
        try {
            if (!systemSettingsService.initialized) {
                return res.status(503).json({
                    success: false,
                    message: '系统设置服务未初始化'
                });
            }

            const timezoneSettings = systemSettingsService.getTimezoneSettings();
            res.json({
                success: true,
                data: timezoneSettings
            });
        } catch (error) {
            console.error('获取时区配置失败:', error.message);
            res.status(500).json({
                success: false,
                message: '获取时区配置失败'
            });
        }
    }

    // 更新时区配置
    async updateTimezone(req, res) {
        try {
            const { timezone } = req.body;

            if (!timezone) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必填字段: timezone'
                });
            }

            if (!systemSettingsService.initialized) {
                return res.status(503).json({
                    success: false,
                    message: '系统设置服务未初始化'
                });
            }

            await systemSettingsService.setTimezone(timezone);
            const timezoneSettings = systemSettingsService.getTimezoneSettings();
            
            res.json({
                success: true,
                message: '时区设置已更新',
                data: timezoneSettings
            });
        } catch (error) {
            console.error('设置时区失败:', error.message);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new SystemController();