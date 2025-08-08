const configService = require('../services/ConfigService');
const RateLimitService = require('../services/RateLimitService');
const LogCleanupService = require('../services/LogCleanupService');

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
            const timezones = configService.getSupportedTimezones();
            res.json({
                success: true,
                data: timezones
            });
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
            const status = LogCleanupService.getCleanupStatus();
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

            const result = await LogCleanupService.triggerManualCleanup(retentionDays);
            
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
            const stats = await LogCleanupService.getCleanupStats();
            
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

    // 获取速率限制配置
    async getRateLimitConfig(req, res) {
        try {
            const config = await RateLimitService.getCurrentConfig();
            res.json({
                success: true,
                data: config
            });
        } catch (error) {
            console.error('获取速率限制配置失败:', error);
            res.status(500).json({
                success: false,
                message: '获取速率限制配置失败'
            });
        }
    }

    // 更新速率限制配置
    async updateRateLimitConfig(req, res) {
        try {
            const { rateLimiting } = req.body;

            // 验证输入数据
            if (!rateLimiting || typeof rateLimiting !== 'object') {
                return res.status(400).json({
                    success: false,
                    message: '速率限制配置格式错误'
                });
            }

            if (!rateLimiting.general || !rateLimiting.login) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必要的速率限制配置'
                });
            }

            // 验证数值范围
            const { general, login } = rateLimiting;
            
            if (!Number.isInteger(general.windowMs) || general.windowMs < 60000 || general.windowMs > 3600000) {
                return res.status(400).json({
                    success: false,
                    message: '一般请求时间窗口必须在1-60分钟之间'
                });
            }

            if (!Number.isInteger(general.maxRequests) || general.maxRequests < 10 || general.maxRequests > 1000) {
                return res.status(400).json({
                    success: false,
                    message: '一般请求最大次数必须在10-1000之间'
                });
            }

            if (!Number.isInteger(login.windowMs) || login.windowMs < 60000 || login.windowMs > 3600000) {
                return res.status(400).json({
                    success: false,
                    message: '登录尝试时间窗口必须在1-60分钟之间'
                });
            }

            if (!Number.isInteger(login.maxAttempts) || login.maxAttempts < 3 || login.maxAttempts > 50) {
                return res.status(400).json({
                    success: false,
                    message: '登录最大尝试次数必须在3-50之间'
                });
            }

            const result = await RateLimitService.updateRateLimitConfig(rateLimiting);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: result.message,
                    data: {
                        requiresRestart: result.requiresRestart
                    }
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('更新速率限制配置失败:', error);
            res.status(500).json({
                success: false,
                message: '更新速率限制配置失败'
            });
        }
    }

    // 获取速率限制状态统计
    async getRateLimitStats(req, res) {
        try {
            const stats = RateLimitService.getRateLimitStats();
            const config = await RateLimitService.getCurrentConfig();
            
            res.json({
                success: true,
                data: {
                    ...stats,
                    config
                }
            });
        } catch (error) {
            console.error('获取速率限制统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取速率限制统计失败'
            });
        }
    }
}

module.exports = new SystemController();