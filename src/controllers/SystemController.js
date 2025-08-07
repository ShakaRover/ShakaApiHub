const configService = require('../services/ConfigService');

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
}

module.exports = new SystemController();