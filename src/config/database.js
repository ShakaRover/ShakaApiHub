const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { promisify } = require('util');

class DatabaseConfig {
    constructor() {
        // Docker环境下使用持久化目录，否则使用项目根目录
        const dataDir = process.env.NODE_ENV === 'production' && process.env.DOCKER_ENV 
            ? '/app/data' 
            : path.join(__dirname, '../..');
        this.dbPath = path.join(dataDir, 'shakaHub.db');
        this.db = null;
        this.statements = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('数据库连接失败:', err.message);
                    reject(err);
                    return;
                }
                
                console.log('数据库连接成功 (sqlite3)');
                
                // 优化配置 - 在事务外执行
                this.db.run('PRAGMA journal_mode = WAL');
                this.db.run('PRAGMA foreign_keys = ON');
                this.db.run('PRAGMA synchronous = NORMAL');
                this.db.run('PRAGMA cache_size = 1000');
                this.db.run('PRAGMA temp_store = memory');
                
                // 初始化数据库结构
                this.initializeSchema()
                    .then(() => this.prepareStatements())
                    .then(() => resolve(this.db))
                    .catch(reject);
            });
        });
    }

    async migrateDatabase() {
        return new Promise((resolve) => {
            // 首先检查 api_sites 表是否存在
            this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='api_sites'", (err, tableExists) => {
                if (err) {
                    console.error('数据库迁移失败:', err.message);
                    resolve();
                    return;
                }
                
                // 如果表不存在，跳过迁移（表会在 initializeSchema 中创建）
                if (!tableExists) {
                    console.log('api_sites表不存在，跳过迁移');
                    this.createCheckLogTable()
                        .then(() => {
                            console.log('数据库结构已是最新版本');
                            resolve();
                        })
                        .catch(() => resolve());
                    return;
                }
                
                // 表存在，检查结构
                this.db.all("PRAGMA table_info(api_sites)", (err, tableInfo) => {
                    if (err) {
                        console.error('数据库迁移失败:', err.message);
                        resolve();
                        return;
                    }
                    
                    const hasAutoCheckin = tableInfo.some(column => column.name === 'auto_checkin');
                    const hasLastCheckin = tableInfo.some(column => column.name === 'last_checkin');
                    
                    // 检查是否需要重建表以支持AnyRouter和检测功能
                    this.db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='api_sites'", (err, currentSchema) => {
                        if (err) {
                            console.error('数据库迁移失败:', err.message);
                            resolve();
                            return;
                        }
                        
                        const needsRebuild = !currentSchema || !currentSchema.sql.includes('AnyRouter') || !currentSchema.sql.includes('site_quota');
                        
                        if (needsRebuild || !hasAutoCheckin || !hasLastCheckin) {
                            console.log('需要重建api_sites表以支持新功能...');
                            this.rebuildApiSitesTable()
                                .then(() => this.createCheckLogTable())
                                .then(() => {
                                    console.log('数据库结构已是最新版本');
                                    resolve();
                                })
                                .catch(() => resolve());
                        } else {
                            // 创建检测日志表
                            this.createCheckLogTable()
                                .then(() => {
                                    console.log('数据库结构已是最新版本');
                                    resolve();
                                })
                                .catch(() => resolve());
                        }
                    });
                });
            });
        });
    }

    async rebuildApiSitesTable() {
        return new Promise((resolve, reject) => {
            // 简化版本，不使用事务，避免嵌套事务问题
            // 1. 备份现有数据
            this.db.run(`
                CREATE TABLE api_sites_backup AS 
                SELECT * FROM api_sites
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // 2. 删除旧表
                this.db.run('DROP TABLE api_sites', (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    // 3. 创建新表
                    this.db.run(`
                        CREATE TABLE api_sites (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            api_type TEXT NOT NULL CHECK (api_type IN ('NewApi', 'Veloera', 'AnyRouter')),
                            name TEXT NOT NULL,
                            url TEXT NOT NULL,
                            auth_method TEXT NOT NULL CHECK (auth_method IN ('sessions', 'token')),
                            sessions TEXT,
                            token TEXT,
                            user_id TEXT,
                            enabled INTEGER DEFAULT 1 CHECK (enabled IN (0, 1)),
                            auto_checkin INTEGER DEFAULT 0 CHECK (auto_checkin IN (0, 1)),
                            last_checkin DATETIME,
                            -- 站点检测相关字段
                            site_quota REAL DEFAULT 0,
                            site_used_quota REAL DEFAULT 0,
                            site_request_count INTEGER DEFAULT 0,
                            site_user_group TEXT,
                            site_aff_code TEXT,
                            site_aff_count INTEGER DEFAULT 0,
                            site_aff_quota REAL DEFAULT 0,
                            site_aff_history_quota REAL DEFAULT 0,
                            site_username TEXT,
                            site_last_check_in_time DATETIME,
                            last_check_time DATETIME,
                            last_check_status TEXT DEFAULT 'pending',
                            last_check_message TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            created_by INTEGER NOT NULL,
                            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
                        )
                    `, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        // 4. 恢复数据
                        this.db.run(`
                            INSERT INTO api_sites (
                                id, api_type, name, url, auth_method, sessions, token, user_id, 
                                enabled, created_at, updated_at, created_by,
                                auto_checkin, last_checkin
                            )
                            SELECT 
                                id, api_type, name, url, auth_method, sessions, token, user_id,
                                enabled, created_at, updated_at, created_by,
                                COALESCE(auto_checkin, 0) as auto_checkin,
                                last_checkin
                            FROM api_sites_backup
                        `, (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            
                            // 5. 删除备份表
                            this.db.run('DROP TABLE api_sites_backup', (err) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                
                                // 6. 重建索引
                                this.db.run('CREATE INDEX IF NOT EXISTS idx_api_sites_name ON api_sites(name)', (err) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }
                                    
                                    this.db.run('CREATE INDEX IF NOT EXISTS idx_api_sites_enabled ON api_sites(enabled)', (err) => {
                                        if (err) {
                                            reject(err);
                                            return;
                                        }
                                        
                                        console.log('api_sites表重建完成，已支持AnyRouter类型');
                                        resolve();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    async createCheckLogTable() {
        return new Promise((resolve) => {
            const createCheckLogsTable = `
                CREATE TABLE IF NOT EXISTS site_check_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    check_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
                    message TEXT,
                    response_data TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (site_id) REFERENCES api_sites(id) ON DELETE CASCADE
                )
            `;

            const createCheckLogsIndex = `
                CREATE INDEX IF NOT EXISTS idx_check_logs_site_id ON site_check_logs(site_id)
            `;

            const createCheckLogsTimeIndex = `
                CREATE INDEX IF NOT EXISTS idx_check_logs_time ON site_check_logs(check_time)
            `;

            this.db.serialize(() => {
                this.db.run(createCheckLogsTable, (err) => {
                    if (err) {
                        console.error('创建检测日志表失败:', err.message);
                        resolve();
                        return;
                    }
                    
                    this.db.run(createCheckLogsIndex, (err) => {
                        if (err) {
                            console.error('创建检测日志表索引失败:', err.message);
                        }
                        
                        this.db.run(createCheckLogsTimeIndex, (err) => {
                            if (err) {
                                console.error('创建检测日志表时间索引失败:', err.message);
                            } else {
                                console.log('检测日志表创建完成');
                            }
                            resolve();
                        });
                    });
                });
            });
        });
    }

    async initializeSchema() {
        return new Promise((resolve, reject) => {
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createUsernameIndex = `
                CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
            `;

            const createApiSitesTable = `
                CREATE TABLE IF NOT EXISTS api_sites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    api_type TEXT NOT NULL CHECK (api_type IN ('NewApi', 'Veloera', 'AnyRouter')),
                    name TEXT NOT NULL,
                    url TEXT NOT NULL,
                    auth_method TEXT NOT NULL CHECK (auth_method IN ('sessions', 'token')),
                    sessions TEXT,
                    token TEXT,
                    user_id TEXT,
                    enabled INTEGER DEFAULT 1 CHECK (enabled IN (0, 1)),
                    auto_checkin INTEGER DEFAULT 0 CHECK (auto_checkin IN (0, 1)),
                    last_checkin DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_by INTEGER NOT NULL,
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
                )
            `;

            const createApiSitesIndex = `
                CREATE INDEX IF NOT EXISTS idx_api_sites_name ON api_sites(name)
            `;

            const createApiSitesEnabledIndex = `
                CREATE INDEX IF NOT EXISTS idx_api_sites_enabled ON api_sites(enabled)
            `;

            // 简化版本，不使用事务，让每个操作独立执行
            this.db.run(createUsersTable, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                this.db.run(createUsernameIndex, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    this.db.run(createApiSitesTable, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        this.db.run(createApiSitesIndex, (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            
                            this.db.run(createApiSitesEnabledIndex, async (err) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                
                                try {
                                    // 数据库迁移：为现有表添加新字段
                                    await this.migrateDatabase();
                                    
                                    // 创建默认管理员用户（仅在表为空时）
                                    this.db.get('SELECT COUNT(*) as count FROM users', async (err, row) => {
                                        if (err) {
                                            console.error('检查用户数量失败:', err.message);
                                            resolve();
                                            return;
                                        }
                                        
                                        if (row.count === 0) {
                                            const PasswordUtils = require('../utils/passwordUtils');
                                            const defaultPasswordHash = PasswordUtils.hashPasswordSync('admin123');
                                            this.db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', 
                                                ['admin', defaultPasswordHash], (err) => {
                                                    if (err) {
                                                        console.error('创建默认用户失败:', err.message);
                                                    } else {
                                                        console.log('默认管理员用户已创建: admin/admin123');
                                                    }
                                                    resolve();
                                                });
                                        } else {
                                            resolve();
                                        }
                                    });
                                } catch (error) {
                                    console.error('数据库迁移失败:', error.message);
                                    resolve();
                                }
                            });
                        });
                    });
                });
            });
        });
    }

    prepareStatements() {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }

        this.statements = {
            // 用户查询语句
            findUserByUsername: {
                get: (username) => new Promise((resolve, reject) => {
                    this.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                })
            },
            findUserById: {
                get: (id) => new Promise((resolve, reject) => {
                    this.db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                })
            },
            insertUser: {
                run: (username, passwordHash) => new Promise((resolve, reject) => {
                    this.db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, passwordHash], function(err) {
                        if (err) reject(err);
                        else resolve({ lastID: this.lastID, changes: this.changes });
                    });
                })
            },
            updatePassword: {
                run: (passwordHash, id) => new Promise((resolve, reject) => {
                    this.db.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [passwordHash, id], function(err) {
                        if (err) reject(err);
                        else resolve({ changes: this.changes });
                    });
                })
            },
            updateUsername: {
                run: (username, id) => new Promise((resolve, reject) => {
                    this.db.run('UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [username, id], function(err) {
                        if (err) reject(err);
                        else resolve({ changes: this.changes });
                    });
                })
            },
            countUsers: {
                get: () => new Promise((resolve, reject) => {
                    this.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                })
            },
            
            // API站点查询语句
            findAllApiSites: {
                all: () => new Promise((resolve, reject) => {
                    this.db.all('SELECT * FROM api_sites ORDER BY created_at DESC', (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                })
            },
            findApiSiteById: {
                get: (id) => new Promise((resolve, reject) => {
                    this.db.get('SELECT * FROM api_sites WHERE id = ?', [id], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                })
            },
            findApiSitesByCreatedBy: {
                all: (createdBy) => new Promise((resolve, reject) => {
                    this.db.all('SELECT * FROM api_sites WHERE created_by = ? ORDER BY created_at DESC', [createdBy], (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                })
            },
            insertApiSite: {
                run: (apiType, name, url, authMethod, sessions, token, userId, enabled, autoCheckin, createdBy) => new Promise((resolve, reject) => {
                    this.db.run('INSERT INTO api_sites (api_type, name, url, auth_method, sessions, token, user_id, enabled, auto_checkin, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                        [apiType, name, url, authMethod, sessions, token, userId, enabled, autoCheckin, createdBy], function(err) {
                        if (err) reject(err);
                        else resolve({ lastID: this.lastID, changes: this.changes });
                    });
                })
            },
            updateApiSite: {
                run: (apiType, name, url, authMethod, sessions, token, userId, enabled, autoCheckin, id) => new Promise((resolve, reject) => {
                    this.db.run('UPDATE api_sites SET api_type = ?, name = ?, url = ?, auth_method = ?, sessions = ?, token = ?, user_id = ?, enabled = ?, auto_checkin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                        [apiType, name, url, authMethod, sessions, token, userId, enabled, autoCheckin, id], function(err) {
                        if (err) reject(err);
                        else resolve({ changes: this.changes });
                    });
                })
            },
            updateLastCheckin: {
                run: (id) => new Promise((resolve, reject) => {
                    this.db.run('UPDATE api_sites SET last_checkin = CURRENT_TIMESTAMP WHERE id = ?', [id], function(err) {
                        if (err) reject(err);
                        else resolve({ changes: this.changes });
                    });
                })
            },
            deleteApiSite: {
                run: (id) => new Promise((resolve, reject) => {
                    this.db.run('DELETE FROM api_sites WHERE id = ?', [id], function(err) {
                        if (err) reject(err);
                        else resolve({ changes: this.changes });
                    });
                })
            },
            toggleApiSiteEnabled: {
                run: (enabled, id) => new Promise((resolve, reject) => {
                    this.db.run('UPDATE api_sites SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [enabled, id], function(err) {
                        if (err) reject(err);
                        else resolve({ changes: this.changes });
                    });
                })
            },
            countApiSites: {
                get: () => new Promise((resolve, reject) => {
                    this.db.get('SELECT COUNT(*) as count FROM api_sites', (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                })
            },
            countEnabledApiSites: {
                get: () => new Promise((resolve, reject) => {
                    this.db.get('SELECT COUNT(*) as count FROM api_sites WHERE enabled = 1', (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                })
            },
            
            // 站点检测相关语句
            updateSiteCheckInfo: {
                run: (siteQuota, siteUsedQuota, siteRequestCount, siteUserGroup, siteAffCode, siteAffCount, siteAffQuota, siteAffHistoryQuota, siteUsername, siteLastCheckInTime, lastCheckStatus, lastCheckMessage, id) => new Promise((resolve, reject) => {
                    this.db.run(`
                        UPDATE api_sites SET 
                            site_quota = ?, site_used_quota = ?, site_request_count = ?, 
                            site_user_group = ?, site_aff_code = ?, site_aff_count = ?, 
                            site_aff_quota = ?, site_aff_history_quota = ?, site_username = ?,
                            site_last_check_in_time = ?, last_check_time = CURRENT_TIMESTAMP,
                            last_check_status = ?, last_check_message = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `, [siteQuota, siteUsedQuota, siteRequestCount, siteUserGroup, siteAffCode, siteAffCount, siteAffQuota, siteAffHistoryQuota, siteUsername, siteLastCheckInTime, lastCheckStatus, lastCheckMessage, id], function(err) {
                        if (err) reject(err);
                        else resolve({ changes: this.changes });
                    });
                })
            },
            updateSiteCheckStatus: {
                run: (lastCheckStatus, lastCheckMessage, id) => new Promise((resolve, reject) => {
                    this.db.run(`
                        UPDATE api_sites SET 
                            last_check_time = CURRENT_TIMESTAMP, last_check_status = ?, 
                            last_check_message = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `, [lastCheckStatus, lastCheckMessage, id], function(err) {
                        if (err) reject(err);
                        else resolve({ changes: this.changes });
                    });
                })
            },
            
            // 检测日志相关语句
            insertCheckLog: {
                run: (siteId, status, message, responseData) => new Promise((resolve, reject) => {
                    this.db.run('INSERT INTO site_check_logs (site_id, status, message, response_data) VALUES (?, ?, ?, ?)', [siteId, status, message, responseData], function(err) {
                        if (err) reject(err);
                        else resolve({ lastID: this.lastID, changes: this.changes });
                    });
                })
            },
            findCheckLogsBySiteId: {
                all: (siteId) => new Promise((resolve, reject) => {
                    this.db.all('SELECT * FROM site_check_logs WHERE site_id = ? ORDER BY check_time DESC LIMIT 10', [siteId], (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                })
            },
            findLatestCheckLog: {
                get: (siteId) => new Promise((resolve, reject) => {
                    this.db.get('SELECT * FROM site_check_logs WHERE site_id = ? ORDER BY check_time DESC LIMIT 1', [siteId], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                })
            }
        };
    }

    async getDatabase() {
        if (!this.db) {
            return await this.connect();
        }
        return this.db;
    }

    getStatements() {
        if (!this.statements) {
            throw new Error('预编译语句未初始化');
        }
        return this.statements;
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('关闭数据库失败:', err.message);
                } else {
                    console.log('数据库已关闭');
                }
            });
            this.db = null;
            this.statements = null;
        }
    }
}

module.exports = new DatabaseConfig();