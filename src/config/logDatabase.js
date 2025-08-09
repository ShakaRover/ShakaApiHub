const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class LogDatabaseConfig {
    constructor() {
        // Docker环境下使用持久化目录，否则使用项目根目录
        const dataDir = process.env.NODE_ENV === 'production' && process.env.DOCKER_ENV 
            ? '/app/data' 
            : path.join(__dirname, '../..');
        this.dbPath = path.join(dataDir, 'log.db');
        this.db = null;
        this.isInitialized = false;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('日志数据库连接失败:', err.message);
                    reject(err);
                    return;
                }
                
                console.log('日志数据库连接成功 (log.db)');
                
                // 优化配置
                this.db.run('PRAGMA journal_mode = WAL');
                this.db.run('PRAGMA foreign_keys = ON');
                this.db.run('PRAGMA synchronous = NORMAL');
                this.db.run('PRAGMA cache_size = 1000');
                this.db.run('PRAGMA temp_store = memory');
                
                // 初始化日志表结构
                this.initializeLogSchema()
                    .then(() => {
                        this.isInitialized = true;
                        resolve(this.db);
                    })
                    .catch(reject);
            });
        });
    }

    async initializeLogSchema() {
        return new Promise((resolve, reject) => {
            const createSystemLogsTable = `
                CREATE TABLE IF NOT EXISTS system_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    data TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createUserLogsTable = `
                CREATE TABLE IF NOT EXISTS user_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    action TEXT NOT NULL,
                    resource_type TEXT,
                    resource_id TEXT,
                    details TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createApiLogsTable = `
                CREATE TABLE IF NOT EXISTS api_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    method TEXT NOT NULL,
                    path TEXT NOT NULL,
                    status_code INTEGER,
                    response_time INTEGER,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createSiteCheckLogsTable = `
                CREATE TABLE IF NOT EXISTS site_check_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    check_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
                    message TEXT,
                    response_data TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createTokenLogsTable = `
                CREATE TABLE IF NOT EXISTS token_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    site_id INTEGER NOT NULL,
                    token_id TEXT,
                    action TEXT NOT NULL,
                    details TEXT,
                    status TEXT,
                    error_message TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createSiteLogsTable = `
                CREATE TABLE IF NOT EXISTS site_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    site_id INTEGER NOT NULL,
                    action TEXT NOT NULL,
                    details TEXT,
                    status TEXT,
                    error_message TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createSiteOperationLogsTable = `
                CREATE TABLE IF NOT EXISTS site_operation_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    site_id INTEGER NOT NULL,
                    operation TEXT NOT NULL,
                    step TEXT NOT NULL,
                    step_order INTEGER DEFAULT 1,
                    status TEXT DEFAULT 'success',
                    details TEXT,
                    error_message TEXT,
                    execution_time INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // 创建索引
            const createIndexes = [
                'CREATE INDEX IF NOT EXISTS idx_system_logs_type ON system_logs(type)',
                'CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at)',
                'CREATE INDEX IF NOT EXISTS idx_user_logs_user_id ON user_logs(user_id)',
                'CREATE INDEX IF NOT EXISTS idx_user_logs_created ON user_logs(created_at)',
                'CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id)',
                'CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at)',
                'CREATE INDEX IF NOT EXISTS idx_site_check_logs_site_id ON site_check_logs(site_id)',
                'CREATE INDEX IF NOT EXISTS idx_site_check_logs_created ON site_check_logs(created_at)',
                'CREATE INDEX IF NOT EXISTS idx_token_logs_user_id ON token_logs(user_id)',
                'CREATE INDEX IF NOT EXISTS idx_token_logs_site_id ON token_logs(site_id)',
                'CREATE INDEX IF NOT EXISTS idx_token_logs_created ON token_logs(created_at)',
                'CREATE INDEX IF NOT EXISTS idx_site_logs_user_id ON site_logs(user_id)',
                'CREATE INDEX IF NOT EXISTS idx_site_logs_site_id ON site_logs(site_id)',
                'CREATE INDEX IF NOT EXISTS idx_site_logs_created ON site_logs(created_at)',
                'CREATE INDEX IF NOT EXISTS idx_site_operation_logs_user_id ON site_operation_logs(user_id)',
                'CREATE INDEX IF NOT EXISTS idx_site_operation_logs_site_id ON site_operation_logs(site_id)',
                'CREATE INDEX IF NOT EXISTS idx_site_operation_logs_created ON site_operation_logs(created_at)'
            ];

            // 创建表
            this.db.serialize(() => {
                this.db.run(createSystemLogsTable, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    this.db.run(createUserLogsTable, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        this.db.run(createApiLogsTable, (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            
                            this.db.run(createSiteCheckLogsTable, (err) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                
                                this.db.run(createTokenLogsTable, (err) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }
                                    
                                    this.db.run(createSiteLogsTable, (err) => {
                                        if (err) {
                                            reject(err);
                                            return;
                                        }
                                        
                                        this.db.run(createSiteOperationLogsTable, (err) => {
                                            if (err) {
                                                reject(err);
                                                return;
                                            }
                                            
                                            // 创建所有索引
                                            let indexCount = 0;
                                            createIndexes.forEach(indexSQL => {
                                                this.db.run(indexSQL, (err) => {
                                                    if (err) {
                                                        console.error('创建日志数据库索引失败:', err.message);
                                                    }
                                                    indexCount++;
                                                    if (indexCount === createIndexes.length) {
                                                        console.log('日志数据库表结构初始化完成');
                                                        resolve();
                                                    }
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    async getDatabase() {
        if (!this.db || !this.isInitialized) {
            return await this.connect();
        }
        return this.db;
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('关闭日志数据库失败:', err.message);
                } else {
                    console.log('日志数据库已关闭');
                }
            });
            this.db = null;
            this.isInitialized = false;
        }
    }
}

module.exports = new LogDatabaseConfig();