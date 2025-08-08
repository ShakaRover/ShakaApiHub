const rateLimit = require('express-rate-limit');
const configService = require('./ConfigService');

class RateLimitService {
    constructor() {
        this.generalLimiter = null;
        this.authLimiter = null;
        this.app = null;
    }

    // 初始化速率限制器
    async initRateLimiters(app) {
        this.app = app;
        const config = await configService.getConfig();
        const rateLimitConfig = config.rateLimiting;

        // 创建一般API限制器
        this.generalLimiter = rateLimit({
            windowMs: rateLimitConfig.general.windowMs,
            max: rateLimitConfig.general.maxRequests,
            message: { success: false, message: '请求过于频繁，请稍后再试' },
            standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
            legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        });

        // 创建登录限制器
        this.authLimiter = rateLimit({
            windowMs: rateLimitConfig.login.windowMs,
            max: rateLimitConfig.login.maxAttempts,
            message: { success: false, message: '登录尝试过于频繁，请稍后再试' },
            standardHeaders: true,
            legacyHeaders: false,
        });

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
            // 更新配置
            await configService.updateConfig({ rateLimiting: newConfig });
            
            // 重新创建限制器（注意：这不会影响已经运行的中间件，需要重启服务）
            const config = await configService.getConfig();
            const rateLimitConfig = config.rateLimiting;

            // 创建新的限制器实例（但现有的中间件仍会使用旧实例）
            this.generalLimiter = rateLimit({
                windowMs: rateLimitConfig.general.windowMs,
                max: rateLimitConfig.general.maxRequests,
                message: { success: false, message: '请求过于频繁，请稍后再试' },
                standardHeaders: true,
                legacyHeaders: false,
            });

            this.authLimiter = rateLimit({
                windowMs: rateLimitConfig.login.windowMs,
                max: rateLimitConfig.login.maxAttempts,
                message: { success: false, message: '登录尝试过于频繁，请稍后再试' },
                standardHeaders: true,
                legacyHeaders: false,
            });

            console.log('速率限制配置已更新:', {
                general: `${rateLimitConfig.general.maxRequests} 次/${Math.floor(rateLimitConfig.general.windowMs / 60000)} 分钟`,
                login: `${rateLimitConfig.login.maxAttempts} 次/${Math.floor(rateLimitConfig.login.windowMs / 60000)} 分钟`
            });

            return {
                success: true,
                message: '速率限制配置已更新，将在下次服务重启时生效',
                requiresRestart: true
            };

        } catch (error) {
            console.error('更新速率限制配置失败:', error);
            return {
                success: false,
                message: `更新速率限制配置失败: ${error.message}`,
                requiresRestart: false
            };
        }
    }

    // 获取当前速率限制配置
    async getCurrentConfig() {
        const config = await configService.getConfig();
        return config.rateLimiting;
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