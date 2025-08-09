const rateLimit = require('express-rate-limit');
const configService = require('./ConfigService');
const { systemSettingsService } = require('./SystemSettingsService');
const LogService = require('./LogService');

class RateLimitService {
    constructor() {
        this.generalLimiter = null;
        this.authLimiter = null;
        this.app = null;
        this.logService = new LogService();
    }

    // 获取速率限制配置（优先使用SystemSettings，降级到ConfigService）
    async getRateLimitConfig() {
        let rateLimitConfig;
        
        // 优先从系统设置获取
        if (systemSettingsService.initialized) {
            const generalTimeWindow = parseInt(systemSettingsService.getSetting('rateLimitGeneralTimeWindow', '5')) * 60 * 1000;
            const generalMaxRequests = parseInt(systemSettingsService.getSetting('rateLimitGeneralMaxRequests', '200'));
            const loginTimeWindow = parseInt(systemSettingsService.getSetting('rateLimitLoginTimeWindow', '5')) * 60 * 1000;
            const loginMaxAttempts = parseInt(systemSettingsService.getSetting('rateLimitLoginMaxAttempts', '10'));

            rateLimitConfig = {
                general: {
                    windowMs: generalTimeWindow,
                    maxRequests: generalMaxRequests
                },
                login: {
                    windowMs: loginTimeWindow,
                    maxAttempts: loginMaxAttempts
                }
            };
            
            console.log('使用系统设置中的速率限制配置');
        } else {
            // 降级到ConfigService
            const config = await configService.getConfig();
            rateLimitConfig = config.rateLimiting;
            console.log('使用ConfigService中的速率限制配置');
        }

        return rateLimitConfig;
    }

    // 创建带有详细日志的速率限制器
    createRateLimiter(config, type) {
        const limiterType = type === 'auth' ? '登录' : '一般API';
        
        return rateLimit({
            windowMs: config.windowMs,
            max: config.max || config.maxRequests || config.maxAttempts,
            message: { 
                success: false, 
                message: type === 'auth' ? '登录尝试过于频繁，请稍后再试' : '请求过于频繁，请稍后再试'
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: async (req, res) => {
                // 详细的速率限制违规日志
                const clientInfo = {
                    ip: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent'),
                    url: req.url,
                    method: req.method,
                    timestamp: new Date().toISOString()
                };

                const violationDetails = {
                    limitType: limiterType,
                    windowMs: config.windowMs,
                    limit: config.max || config.maxRequests || config.maxAttempts,
                    timeWindow: `${Math.floor(config.windowMs / 60000)}分钟`,
                    currentHits: req.rateLimit?.totalHits || req.rateLimit?.used || 'unknown',
                    remainingRequests: req.rateLimit?.remaining || 'unknown',
                    resetsAt: req.rateLimit?.resetTime ? new Date(req.rateLimit.resetTime) : 'unknown'
                };

                console.warn(`[速率限制] ${limiterType}违规:`, {
                    ...clientInfo,
                    ...violationDetails
                });

                // 记录到日志服务
                try {
                    await this.logService.logSystem('rate_limit_violation', 
                        `${limiterType}速率限制违规`, {
                        client: clientInfo,
                        violation: violationDetails,
                        config: {
                            limit: violationDetails.limit,
                            window: violationDetails.timeWindow
                        }
                    });
                } catch (logError) {
                    console.error('记录速率限制违规日志失败:', logError.message);
                }

                // 发送限制响应
                res.status(429).json({ 
                    success: false, 
                    message: type === 'auth' ? '登录尝试过于频繁，请稍后再试' : '请求过于频繁，请稍后再试'
                });
            },
            skip: () => {
                // 可以在这里添加跳过逻辑，比如白名单IP等
                return false;
            }
        });
    }

    // 初始化速率限制器
    async initRateLimiters(app) {
        this.app = app;
        const rateLimitConfig = await this.getRateLimitConfig();

        // 创建一般API限制器
        this.generalLimiter = this.createRateLimiter(rateLimitConfig.general, 'general');

        // 创建登录限制器
        this.authLimiter = this.createRateLimiter(rateLimitConfig.login, 'auth');

        console.log('速率限制器初始化完成:', {
            general: `${rateLimitConfig.general.maxRequests} 次/${Math.floor(rateLimitConfig.general.windowMs / 60000)} 分钟`,
            login: `${rateLimitConfig.login.maxAttempts} 次/${Math.floor(rateLimitConfig.login.windowMs / 60000)} 分钟`
        });

        return {
            generalLimiter: this.generalLimiter,
            authLimiter: this.authLimiter
        };
    }

    // 更新速率限制配置
    async updateRateLimitConfig(newConfig) {
        try {
            // 保存到系统设置中
            if (systemSettingsService.initialized) {
                await systemSettingsService.setSetting('rateLimitGeneralTimeWindow', String(Math.floor(newConfig.general.windowMs / 60000)));
                await systemSettingsService.setSetting('rateLimitGeneralMaxRequests', String(newConfig.general.maxRequests));
                await systemSettingsService.setSetting('rateLimitLoginTimeWindow', String(Math.floor(newConfig.login.windowMs / 60000)));
                await systemSettingsService.setSetting('rateLimitLoginMaxAttempts', String(newConfig.login.maxAttempts));
                
                console.log('速率限制配置已保存到系统设置');
            } else {
                // 降级到ConfigService
                await configService.updateConfig({ rateLimiting: newConfig });
                console.log('速率限制配置已保存到ConfigService');
            }
            
            // 重新创建限制器实现热更新
            const rateLimitConfig = await this.getRateLimitConfig();

            this.generalLimiter = this.createRateLimiter(rateLimitConfig.general, 'general');
            this.authLimiter = this.createRateLimiter(rateLimitConfig.login, 'auth');

            console.log('速率限制器已热更新:', {
                general: `${rateLimitConfig.general.maxRequests} 次/${Math.floor(rateLimitConfig.general.windowMs / 60000)} 分钟`,
                login: `${rateLimitConfig.login.maxAttempts} 次/${Math.floor(rateLimitConfig.login.windowMs / 60000)} 分钟`
            });

            // 记录配置更新日志
            await this.logService.logSystem('rate_limit_config_updated', 
                '速率限制配置已更新', {
                previous: await configService.getConfig().rateLimiting,
                new: rateLimitConfig,
                hotReload: true
            });

            return {
                success: true,
                message: '速率限制配置已更新并立即生效',
                requiresRestart: false,
                config: rateLimitConfig
            };

        } catch (error) {
            console.error('更新速率限制配置失败:', error);
            
            await this.logService.logSystem('rate_limit_config_update_failed', 
                '速率限制配置更新失败', {
                error: error.message,
                config: newConfig
            });

            return {
                success: false,
                message: `更新速率限制配置失败: ${error.message}`,
                requiresRestart: false
            };
        }
    }

    // 获取当前速率限制配置
    async getCurrentConfig() {
        return await this.getRateLimitConfig();
    }

    // 获取速率限制统计信息（如果需要的话）
    getRateLimitStats() {
        // 这里可以添加统计信息收集逻辑
        return {
            generalLimiter: {
                enabled: !!this.generalLimiter,
                type: 'general'
            },
            authLimiter: {
                enabled: !!this.authLimiter,
                type: 'auth'
            }
        };
    }
}

module.exports = new RateLimitService();