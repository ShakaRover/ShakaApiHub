const LogService = require('../services/LogService');
const TimeUtils = require('../utils/TimeUtils');

class LogController {
    constructor() {
        this.logService = new LogService();
    }

    // 获取系统日志
    async getSystemLogs(req, res) {
        try {
            const {
                type,
                limit = 50,
                offset = 0,
                startDate,
                endDate
            } = req.query;

            const options = {
                type: type || null,
                limit: parseInt(limit),
                offset: parseInt(offset),
                startDate: startDate || null,
                endDate: endDate || null
            };

            const result = await this.logService.getSystemLogs(options);
            
            // 为日志数据添加时区转换后的时间字段
            if (result.success && Array.isArray(result.data)) {
                const timeFields = ['timestamp', 'created_at', 'updated_at'];
                result.data = await TimeUtils.convertTimeFieldsInArray(result.data, timeFields);
            }
            
            res.json(result);
        } catch (error) {
            console.error('获取系统日志失败:', error);
            res.status(500).json({
                success: false,
                message: '获取系统日志失败'
            });
        }
    }

    // 获取用户操作日志
    async getUserLogs(req, res) {
        try {
            const {
                userId,
                action,
                resourceType,
                limit = 50,
                offset = 0,
                startDate,
                endDate
            } = req.query;

            const options = {
                userId: userId ? parseInt(userId) : null,
                action: action || null,
                resourceType: resourceType || null,
                limit: parseInt(limit),
                offset: parseInt(offset),
                startDate: startDate || null,
                endDate: endDate || null
            };

            const result = await this.logService.getUserLogs(options);
            
            // 为日志数据添加时区转换后的时间字段
            if (result.success && Array.isArray(result.data)) {
                const timeFields = ['timestamp', 'created_at', 'updated_at'];
                result.data = await TimeUtils.convertTimeFieldsInArray(result.data, timeFields);
            }
            
            res.json(result);
        } catch (error) {
            console.error('获取用户操作日志失败:', error);
            res.status(500).json({
                success: false,
                message: '获取用户操作日志失败'
            });
        }
    }

    // 获取API请求日志
    async getApiLogs(req, res) {
        try {
            const {
                method,
                endpoint,
                statusCode,
                userId,
                limit = 50,
                offset = 0,
                startDate,
                endDate
            } = req.query;

            const options = {
                method: method || null,
                endpoint: endpoint || null,
                statusCode: statusCode ? parseInt(statusCode) : null,
                userId: userId ? parseInt(userId) : null,
                limit: parseInt(limit),
                offset: parseInt(offset),
                startDate: startDate || null,
                endDate: endDate || null
            };

            const result = await this.logService.getApiLogs(options);
            
            // 为日志数据添加时区转换后的时间字段
            if (result.success && Array.isArray(result.data)) {
                const timeFields = ['timestamp', 'created_at', 'updated_at'];
                result.data = await TimeUtils.convertTimeFieldsInArray(result.data, timeFields);
            }
            
            res.json(result);
        } catch (error) {
            console.error('获取API请求日志失败:', error);
            res.status(500).json({
                success: false,
                message: '获取API请求日志失败'
            });
        }
    }

    // 获取站点检测日志
    async getSiteCheckLogs(req, res) {
        try {
            const {
                siteId,
                status,
                limit = 50,
                offset = 0,
                startDate,
                endDate
            } = req.query;

            const options = {
                siteId: siteId ? parseInt(siteId) : null,
                status: status || null,
                limit: parseInt(limit),
                offset: parseInt(offset),
                startDate: startDate || null,
                endDate: endDate || null
            };

            const result = await this.logService.getSiteCheckLogs(options);
            
            // 为日志数据添加时区转换后的时间字段
            if (result.success && Array.isArray(result.data)) {
                const timeFields = ['check_time', 'created_at', 'updated_at'];
                result.data = await TimeUtils.convertTimeFieldsInArray(result.data, timeFields);
            }
            
            res.json(result);
        } catch (error) {
            console.error('获取站点检测日志失败:', error);
            res.status(500).json({
                success: false,
                message: '获取站点检测日志失败'
            });
        }
    }

    // 获取日志统计信息
    async getLogStats(req, res) {
        try {
            const result = await this.logService.getLogStats();
            res.json(result);
        } catch (error) {
            console.error('获取日志统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取日志统计失败'
            });
        }
    }

    // 清理旧日志
    async cleanOldLogs(req, res) {
        try {
            const { daysToKeep = 30 } = req.body;
            
            if (daysToKeep < 7) {
                return res.status(400).json({
                    success: false,
                    message: '保留天数不能少于7天'
                });
            }

            const result = await this.logService.cleanOldLogs(parseInt(daysToKeep));
            res.json(result);
        } catch (error) {
            console.error('清理旧日志失败:', error);
            res.status(500).json({
                success: false,
                message: '清理旧日志失败'
            });
        }
    }

    // 获取日志类型列表
    async getLogTypes(req, res) {
        try {
            const systemTypes = this.logService.db.prepare(`
                SELECT DISTINCT type FROM system_logs 
                ORDER BY type
            `).all().map(row => row.type);

            const userActions = this.logService.db.prepare(`
                SELECT DISTINCT action FROM user_logs 
                ORDER BY action
            `).all().map(row => row.action);

            const apiMethods = this.logService.db.prepare(`
                SELECT DISTINCT method FROM api_logs 
                ORDER BY method
            `).all().map(row => row.method);

            const siteStatuses = this.logService.db.prepare(`
                SELECT DISTINCT status FROM site_check_logs 
                ORDER BY status
            `).all().map(row => row.status);

            res.json({
                success: true,
                data: {
                    systemTypes,
                    userActions,
                    apiMethods,
                    siteStatuses
                }
            });
        } catch (error) {
            console.error('获取日志类型失败:', error);
            res.status(500).json({
                success: false,
                message: '获取日志类型失败'
            });
        }
    }

    // 获取综合日志（所有类型混合）
    async getAllLogs(req, res) {
        try {
            const {
                type = 'all',
                limit = 50,
                offset = 0,
                startDate,
                endDate,
                search
            } = req.query;

            let logs = [];
            const limitInt = parseInt(limit);
            const offsetInt = parseInt(offset);

            // 根据类型获取不同的日志
            switch (type) {
                case 'system':
                    const systemResult = await this.logService.getSystemLogs({
                        limit: limitInt,
                        offset: offsetInt,
                        startDate,
                        endDate
                    });
                    logs = systemResult.data.map(log => ({
                        ...log,
                        logType: 'system',
                        timestamp: log.created_at
                    }));
                    break;

                case 'user':
                    const userResult = await this.logService.getUserLogs({
                        action: search,
                        limit: limitInt,
                        offset: offsetInt,
                        startDate,
                        endDate
                    });
                    logs = userResult.data.map(log => ({
                        ...log,
                        logType: 'user',
                        timestamp: log.created_at
                    }));
                    break;

                case 'api':
                    const apiResult = await this.logService.getApiLogs({
                        endpoint: search,
                        limit: limitInt,
                        offset: offsetInt,
                        startDate,
                        endDate
                    });
                    logs = apiResult.data.map(log => ({
                        ...log,
                        logType: 'api',
                        timestamp: log.created_at
                    }));
                    break;

                case 'site':
                    const siteResult = await this.logService.getSiteCheckLogs({
                        limit: limitInt,
                        offset: offsetInt,
                        startDate,
                        endDate
                    });
                    logs = siteResult.data.map(log => ({
                        ...log,
                        logType: 'site',
                        timestamp: log.check_time
                    }));
                    break;

                default: // 'all'
                    // 获取所有类型的日志并混合
                    const [systemRes, userRes, apiRes, siteRes] = await Promise.all([
                        this.logService.getSystemLogs({ limit: Math.ceil(limitInt/4), offset: 0, startDate, endDate }),
                        this.logService.getUserLogs({ limit: Math.ceil(limitInt/4), offset: 0, startDate, endDate }),
                        this.logService.getApiLogs({ limit: Math.ceil(limitInt/4), offset: 0, startDate, endDate }),
                        this.logService.getSiteCheckLogs({ limit: Math.ceil(limitInt/4), offset: 0, startDate, endDate })
                    ]);

                    logs = [
                        ...systemRes.data.map(log => ({ ...log, logType: 'system', timestamp: log.created_at })),
                        ...userRes.data.map(log => ({ ...log, logType: 'user', timestamp: log.created_at })),
                        ...apiRes.data.map(log => ({ ...log, logType: 'api', timestamp: log.created_at })),
                        ...siteRes.data.map(log => ({ ...log, logType: 'site', timestamp: log.check_time }))
                    ];

                    // 按时间排序
                    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    
                    // 应用分页
                    logs = logs.slice(offsetInt, offsetInt + limitInt);
                    break;
            }

            res.json({
                success: true,
                data: logs,
                pagination: {
                    limit: limitInt,
                    offset: offsetInt,
                    total: logs.length
                }
            });
        } catch (error) {
            console.error('获取综合日志失败:', error);
            res.status(500).json({
                success: false,
                message: '获取综合日志失败'
            });
        }
    }
}

module.exports = LogController;