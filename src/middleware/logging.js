// 日志记录中间件
const LogService = require('../services/LogService');

class LogMiddleware {
    constructor() {
        this.logService = new LogService();
    }

    // API请求日志中间件
    apiLogger() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            // 监听响应完成事件
            res.on('finish', async () => {
                try {
                    const responseTime = Date.now() - startTime;
                    const userId = req.session?.userId || null;
                    
                    // 过滤掉静态文件请求
                    if (!req.path.startsWith('/api')) {
                        return;
                    }
                    
                    // 记录API请求日志
                    await this.logService.logApiRequest(
                        req.method,
                        req.originalUrl || req.url,
                        res.statusCode,
                        responseTime,
                        userId,
                        req,
                        res.statusCode >= 400 ? this.getErrorMessage(res) : null
                    );
                } catch (error) {
                    console.error('记录API日志失败:', error.message);
                }
            });

            next();
        };
    }

    // 用户操作日志中间件
    userActionLogger(action, resourceType = null) {
        return async (req, res, next) => {
            try {
                const userId = req.session?.userId;
                if (!userId) {
                    return next();
                }

                const resourceId = req.params.id || req.body.id || null;
                const details = this.extractRelevantData(req, action);

                await this.logService.logUserAction(
                    userId,
                    action,
                    resourceType,
                    resourceId,
                    details,
                    req
                );
            } catch (error) {
                console.error('记录用户操作日志失败:', error.message);
            }

            next();
        };
    }

    // 提取相关数据用于日志记录
    extractRelevantData(req, action) {
        const data = {};

        // 根据操作类型提取不同的数据
        switch (action) {
            case 'login':
                data.username = req.body.username;
                break;
            case 'create_api_site':
                data.name = req.body.name;
                data.url = req.body.url;
                data.apiType = req.body.apiType;
                break;
            case 'update_api_site':
                data.name = req.body.name;
                data.enabled = req.body.enabled;
                break;
            case 'delete_api_site':
                // 从查询参数或URL中获取站点信息
                break;
            case 'check_site':
                data.siteId = req.params.id;
                break;
            case 'backup_create':
                break;
            case 'backup_restore':
                data.fileName = req.body.fileName;
                break;
            case 'scheduled_check_config':
                data.interval = req.body.interval;
                data.enabled = req.body.enabled;
                break;
            default:
                // 对于其他操作，记录基本信息
                if (req.body && Object.keys(req.body).length > 0) {
                    data.requestBody = this.sanitizeData(req.body);
                }
                break;
        }

        return Object.keys(data).length > 0 ? data : null;
    }

    // 清理敏感数据
    sanitizeData(data) {
        const sanitized = { ...data };
        
        // 移除敏感字段
        const sensitiveFields = ['password', 'token', 'sessions', 'password_hash'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[HIDDEN]';
            }
        });

        return sanitized;
    }

    // 获取错误消息
    getErrorMessage(res) {
        return res.locals?.errorMessage || null;
    }

    // 系统日志记录方法（供其他服务调用）
    async logSystem(type, message, data = null) {
        try {
            await this.logService.logSystem(type, message, data);
        } catch (error) {
            console.error('记录系统日志失败:', error.message);
        }
    }
}

module.exports = new LogMiddleware();