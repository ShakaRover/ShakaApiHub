const databaseConfig = require('../config/database');

class LogService {
    constructor() {
        this.db = databaseConfig.getDatabase();
        this.statements = databaseConfig.getStatements();
        this.init();
    }

    // 初始化日志表
    async init() {
        try {
            await this.createLogTables();
            console.log('日志服务已初始化');
        } catch (error) {
            console.error('日志服务初始化失败:', error.message);
        }
    }

    // 创建日志相关表
    async createLogTables() {
        try {
            // 系统日志表 (已存在于ScheduledCheckService中，这里确保存在)
            const createSystemLogsTable = `
                CREATE TABLE IF NOT EXISTS system_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    data TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // 用户操作日志表
            const createUserLogsTable = `
                CREATE TABLE IF NOT EXISTS user_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    action TEXT NOT NULL,
                    resource_type TEXT,
                    resource_id TEXT,
                    details TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `;

            // API请求日志表
            const createApiLogsTable = `
                CREATE TABLE IF NOT EXISTS api_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    method TEXT NOT NULL,
                    endpoint TEXT NOT NULL,
                    status_code INTEGER NOT NULL,
                    response_time INTEGER,
                    user_id INTEGER,
                    ip_address TEXT,
                    user_agent TEXT,
                    error_message TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                )
            `;

            // 创建索引
            const createIndexes = `
                CREATE INDEX IF NOT EXISTS idx_system_logs_type ON system_logs(type);
                CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
                CREATE INDEX IF NOT EXISTS idx_user_logs_user_id ON user_logs(user_id);
                CREATE INDEX IF NOT EXISTS idx_user_logs_action ON user_logs(action);
                CREATE INDEX IF NOT EXISTS idx_user_logs_created_at ON user_logs(created_at);
                CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
                CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON api_logs(status_code);
                CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);
            `;

            this.db.exec(createSystemLogsTable);
            this.db.exec(createUserLogsTable);
            this.db.exec(createApiLogsTable);
            this.db.exec(createIndexes);

            console.log('日志表创建完成');
        } catch (error) {
            console.error('创建日志表失败:', error.message);
            throw error;
        }
    }

    // 记录系统日志
    async logSystem(type, message, data = null) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO system_logs (type, message, data) 
                VALUES (?, ?, ?)
            `);
            
            stmt.run(type, message, data ? JSON.stringify(data) : null);
        } catch (error) {
            console.error('记录系统日志失败:', error.message);
        }
    }

    // 记录用户操作日志
    async logUserAction(userId, action, resourceType = null, resourceId = null, details = null, req = null) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO user_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            const ipAddress = req ? (req.ip || req.connection.remoteAddress) : null;
            const userAgent = req ? req.get('User-Agent') : null;
            
            stmt.run(
                userId, 
                action, 
                resourceType, 
                resourceId, 
                details ? JSON.stringify(details) : null,
                ipAddress,
                userAgent
            );
        } catch (error) {
            console.error('记录用户操作日志失败:', error.message);
        }
    }

    // 记录API请求日志
    async logApiRequest(method, endpoint, statusCode, responseTime = null, userId = null, req = null, errorMessage = null) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO api_logs (method, endpoint, status_code, response_time, user_id, ip_address, user_agent, error_message) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const ipAddress = req ? (req.ip || req.connection.remoteAddress) : null;
            const userAgent = req ? req.get('User-Agent') : null;
            
            stmt.run(
                method,
                endpoint,
                statusCode,
                responseTime,
                userId,
                ipAddress,
                userAgent,
                errorMessage
            );
        } catch (error) {
            console.error('记录API请求日志失败:', error.message);
        }
    }

    // 获取系统日志
    async getSystemLogs(options = {}) {
        try {
            const {
                type = null,
                limit = 50,
                offset = 0,
                startDate = null,
                endDate = null
            } = options;

            let query = 'SELECT * FROM system_logs WHERE 1=1';
            const params = [];

            if (type) {
                query += ' AND type = ?';
                params.push(type);
            }

            if (startDate) {
                query += ' AND created_at >= ?';
                params.push(startDate);
            }

            if (endDate) {
                query += ' AND created_at <= ?';
                params.push(endDate);
            }

            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const stmt = this.db.prepare(query);
            const logs = stmt.all(...params);

            // 解析data字段
            const parsedLogs = logs.map(log => ({
                ...log,
                data: log.data ? JSON.parse(log.data) : null
            }));

            return {
                success: true,
                data: parsedLogs,
                total: this.getSystemLogsCount({ type, startDate, endDate })
            };
        } catch (error) {
            console.error('获取系统日志失败:', error.message);
            return { success: false, message: error.message, data: [] };
        }
    }

    // 获取用户操作日志
    async getUserLogs(options = {}) {
        try {
            const {
                userId = null,
                action = null,
                resourceType = null,
                limit = 50,
                offset = 0,
                startDate = null,
                endDate = null
            } = options;

            let query = `
                SELECT ul.*, u.username 
                FROM user_logs ul 
                LEFT JOIN users u ON ul.user_id = u.id 
                WHERE 1=1
            `;
            const params = [];

            if (userId) {
                query += ' AND ul.user_id = ?';
                params.push(userId);
            }

            if (action) {
                query += ' AND ul.action LIKE ?';
                params.push(`%${action}%`);
            }

            if (resourceType) {
                query += ' AND ul.resource_type = ?';
                params.push(resourceType);
            }

            if (startDate) {
                query += ' AND ul.created_at >= ?';
                params.push(startDate);
            }

            if (endDate) {
                query += ' AND ul.created_at <= ?';
                params.push(endDate);
            }

            query += ' ORDER BY ul.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const stmt = this.db.prepare(query);
            const logs = stmt.all(...params);

            // 解析details字段
            const parsedLogs = logs.map(log => ({
                ...log,
                details: log.details ? JSON.parse(log.details) : null
            }));

            return {
                success: true,
                data: parsedLogs,
                total: this.getUserLogsCount({ userId, action, resourceType, startDate, endDate })
            };
        } catch (error) {
            console.error('获取用户操作日志失败:', error.message);
            return { success: false, message: error.message, data: [] };
        }
    }

    // 获取API请求日志
    async getApiLogs(options = {}) {
        try {
            const {
                method = null,
                endpoint = null,
                statusCode = null,
                userId = null,
                limit = 50,
                offset = 0,
                startDate = null,
                endDate = null
            } = options;

            let query = `
                SELECT al.*, u.username 
                FROM api_logs al 
                LEFT JOIN users u ON al.user_id = u.id 
                WHERE 1=1
            `;
            const params = [];

            if (method) {
                query += ' AND al.method = ?';
                params.push(method);
            }

            if (endpoint) {
                query += ' AND al.endpoint LIKE ?';
                params.push(`%${endpoint}%`);
            }

            if (statusCode) {
                query += ' AND al.status_code = ?';
                params.push(statusCode);
            }

            if (userId) {
                query += ' AND al.user_id = ?';
                params.push(userId);
            }

            if (startDate) {
                query += ' AND al.created_at >= ?';
                params.push(startDate);
            }

            if (endDate) {
                query += ' AND al.created_at <= ?';
                params.push(endDate);
            }

            query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const stmt = this.db.prepare(query);
            const logs = stmt.all(...params);

            return {
                success: true,
                data: logs,
                total: this.getApiLogsCount({ method, endpoint, statusCode, userId, startDate, endDate })
            };
        } catch (error) {
            console.error('获取API请求日志失败:', error.message);
            return { success: false, message: error.message, data: [] };
        }
    }

    // 获取站点检测日志
    async getSiteCheckLogs(options = {}) {
        try {
            const {
                siteId = null,
                status = null,
                limit = 50,
                offset = 0,
                startDate = null,
                endDate = null
            } = options;

            let query = `
                SELECT scl.*, aps.name as site_name 
                FROM site_check_logs scl 
                LEFT JOIN api_sites aps ON scl.site_id = aps.id 
                WHERE 1=1
            `;
            const params = [];

            if (siteId) {
                query += ' AND scl.site_id = ?';
                params.push(siteId);
            }

            if (status) {
                query += ' AND scl.status = ?';
                params.push(status);
            }

            if (startDate) {
                query += ' AND scl.check_time >= ?';
                params.push(startDate);
            }

            if (endDate) {
                query += ' AND scl.check_time <= ?';
                params.push(endDate);
            }

            query += ' ORDER BY scl.check_time DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const stmt = this.db.prepare(query);
            const logs = stmt.all(...params);

            // 解析response_data字段
            const parsedLogs = logs.map(log => ({
                ...log,
                response_data: log.response_data ? JSON.parse(log.response_data) : null
            }));

            return {
                success: true,
                data: parsedLogs,
                total: this.getSiteCheckLogsCount({ siteId, status, startDate, endDate })
            };
        } catch (error) {
            console.error('获取站点检测日志失败:', error.message);
            return { success: false, message: error.message, data: [] };
        }
    }

    // 获取日志统计信息
    async getLogStats() {
        try {
            const stats = {
                systemLogs: this.getSystemLogsCount(),
                userLogs: this.getUserLogsCount(),
                apiLogs: this.getApiLogsCount(),
                siteCheckLogs: this.getSiteCheckLogsCount(),
                recentErrors: this.getRecentErrorsCount(),
                todayRequests: this.getTodayRequestsCount()
            };

            return { success: true, data: stats };
        } catch (error) {
            console.error('获取日志统计失败:', error.message);
            return { success: false, message: error.message };
        }
    }

    // 清理旧日志
    async cleanOldLogs(daysToKeep = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const cutoffDateStr = cutoffDate.toISOString();

            const systemDeleted = this.db.prepare('DELETE FROM system_logs WHERE created_at < ?').run(cutoffDateStr).changes;
            const userDeleted = this.db.prepare('DELETE FROM user_logs WHERE created_at < ?').run(cutoffDateStr).changes;
            const apiDeleted = this.db.prepare('DELETE FROM api_logs WHERE created_at < ?').run(cutoffDateStr).changes;

            const totalDeleted = systemDeleted + userDeleted + apiDeleted;
            
            const message = `日志清理完成，删除了 ${totalDeleted} 条记录（${daysToKeep}天前的记录）`;
            console.log(message);
            
            // 记录清理操作
            await this.logSystem('log_cleanup', message, {
                systemDeleted,
                userDeleted,
                apiDeleted,
                totalDeleted,
                daysToKeep
            });

            return { success: true, message, deleted: totalDeleted };
        } catch (error) {
            console.error('清理旧日志失败:', error.message);
            return { success: false, message: error.message };
        }
    }

    // 辅助方法：获取各类日志数量
    getSystemLogsCount(filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM system_logs WHERE 1=1';
        const params = [];

        if (filters.type) {
            query += ' AND type = ?';
            params.push(filters.type);
        }

        if (filters.startDate) {
            query += ' AND created_at >= ?';
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ' AND created_at <= ?';
            params.push(filters.endDate);
        }

        const stmt = this.db.prepare(query);
        return stmt.get(...params).count;
    }

    getUserLogsCount(filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM user_logs WHERE 1=1';
        const params = [];

        if (filters.userId) {
            query += ' AND user_id = ?';
            params.push(filters.userId);
        }

        if (filters.action) {
            query += ' AND action LIKE ?';
            params.push(`%${filters.action}%`);
        }

        if (filters.resourceType) {
            query += ' AND resource_type = ?';
            params.push(filters.resourceType);
        }

        if (filters.startDate) {
            query += ' AND created_at >= ?';
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ' AND created_at <= ?';
            params.push(filters.endDate);
        }

        const stmt = this.db.prepare(query);
        return stmt.get(...params).count;
    }

    getApiLogsCount(filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM api_logs WHERE 1=1';
        const params = [];

        if (filters.method) {
            query += ' AND method = ?';
            params.push(filters.method);
        }

        if (filters.endpoint) {
            query += ' AND endpoint LIKE ?';
            params.push(`%${filters.endpoint}%`);
        }

        if (filters.statusCode) {
            query += ' AND status_code = ?';
            params.push(filters.statusCode);
        }

        if (filters.userId) {
            query += ' AND user_id = ?';
            params.push(filters.userId);
        }

        if (filters.startDate) {
            query += ' AND created_at >= ?';
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ' AND created_at <= ?';
            params.push(filters.endDate);
        }

        const stmt = this.db.prepare(query);
        return stmt.get(...params).count;
    }

    getSiteCheckLogsCount(filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM site_check_logs WHERE 1=1';
        const params = [];

        if (filters.siteId) {
            query += ' AND site_id = ?';
            params.push(filters.siteId);
        }

        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        if (filters.startDate) {
            query += ' AND check_time >= ?';
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ' AND check_time <= ?';
            params.push(filters.endDate);
        }

        const stmt = this.db.prepare(query);
        return stmt.get(...params).count;
    }

    getRecentErrorsCount() {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const oneDayAgoStr = oneDayAgo.toISOString();

        const systemErrors = this.db.prepare("SELECT COUNT(*) as count FROM system_logs WHERE type LIKE '%error%' AND created_at >= ?").get(oneDayAgoStr).count;
        const apiErrors = this.db.prepare('SELECT COUNT(*) as count FROM api_logs WHERE status_code >= 400 AND created_at >= ?').get(oneDayAgoStr).count;
        const checkErrors = this.db.prepare("SELECT COUNT(*) as count FROM site_check_logs WHERE status = 'error' AND check_time >= ?").get(oneDayAgoStr).count;

        return systemErrors + apiErrors + checkErrors;
    }

    getTodayRequestsCount() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM api_logs WHERE created_at >= ?');
        return stmt.get(todayStr).count;
    }
}

module.exports = LogService;