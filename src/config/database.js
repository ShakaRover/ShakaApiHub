const Database = require('better-sqlite3');
const path = require('path');

class DatabaseConfig {
    constructor() {
        this.dbPath = path.join(__dirname, '../../shakaHub.db');
        this.db = null;
        this.statements = null;
    }

    connect() {
        try {
            this.db = new Database(this.dbPath, { verbose: console.log });
            
            // 优化配置
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('cache_size = 1000');
            this.db.pragma('temp_store = memory');
            
            this.initializeSchema();
            this.prepareStatements();
            console.log('数据库连接成功 (better-sqlite3)');
            return this.db;
        } catch (error) {
            console.error('数据库连接失败:', error.message);
            throw error;
        }
    }

    migrateDatabase() {
        try {
            // 检查当前表结构
            const tableInfo = this.db.prepare("PRAGMA table_info(api_sites)").all();
            const hasAutoCheckin = tableInfo.some(column => column.name === 'auto_checkin');
            const hasLastCheckin = tableInfo.some(column => column.name === 'last_checkin');
            
            // 检查是否需要重建表以支持AnyRouter和检测功能
            const currentSchema = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='api_sites'").get();
            const needsRebuild = !currentSchema.sql.includes('AnyRouter') || !currentSchema.sql.includes('site_quota');
            
            if (needsRebuild || !hasAutoCheckin || !hasLastCheckin) {
                console.log('需要重建api_sites表以支持新功能...');
                this.rebuildApiSitesTable();
            }
            
            // 创建检测日志表
            this.createCheckLogTable();
            
            console.log('数据库结构已是最新版本');
        } catch (error) {
            console.error('数据库迁移失败:', error.message);
            // 迁移失败不应该阻止应用启动
        }
    }

    rebuildApiSitesTable() {
        const transaction = this.db.transaction(() => {
            // 1. 备份现有数据
            this.db.exec(`
                CREATE TABLE api_sites_backup AS 
                SELECT * FROM api_sites
            `);
            
            // 2. 删除旧表
            this.db.exec('DROP TABLE api_sites');
            
            // 3. 创建新表
            this.db.exec(`
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
            `);
            
            // 4. 恢复数据
            this.db.exec(`
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
            `);
            
            // 5. 删除备份表
            this.db.exec('DROP TABLE api_sites_backup');
            
            // 6. 重建索引
            this.db.exec('CREATE INDEX IF NOT EXISTS idx_api_sites_name ON api_sites(name)');
            this.db.exec('CREATE INDEX IF NOT EXISTS idx_api_sites_enabled ON api_sites(enabled)');
            
            console.log('api_sites表重建完成，已支持AnyRouter类型');
        });
        
        transaction();
    }

    createCheckLogTable() {
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

        try {
            this.db.exec(createCheckLogsTable);
            this.db.exec(createCheckLogsIndex);
            this.db.exec(createCheckLogsTimeIndex);
            console.log('检测日志表创建完成');
        } catch (error) {
            console.error('创建检测日志表失败:', error.message);
        }
    }

    initializeSchema() {
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

        try {
            // 使用事务确保原子性
            const transaction = this.db.transaction(() => {
                this.db.exec(createUsersTable);
                this.db.exec(createUsernameIndex);
                this.db.exec(createApiSitesTable);
                this.db.exec(createApiSitesIndex);
                this.db.exec(createApiSitesEnabledIndex);
                
                // 数据库迁移：为现有表添加新字段
                this.migrateDatabase();
                
                // 创建默认管理员用户（仅在表为空时）
                const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
                if (userCount === 0) {
                    const bcrypt = require('bcrypt');
                    const defaultPasswordHash = bcrypt.hashSync('admin123', 12);
                    this.db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
                           .run('admin', defaultPasswordHash);
                    console.log('默认管理员用户已创建: admin/admin123');
                }
            });
            
            transaction();
        } catch (error) {
            console.error('数据库模式初始化失败:', error.message);
            throw error;
        }
    }

    prepareStatements() {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }

        this.statements = {
            // 用户查询语句
            findUserByUsername: this.db.prepare('SELECT * FROM users WHERE username = ?'),
            findUserById: this.db.prepare('SELECT * FROM users WHERE id = ?'),
            insertUser: this.db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)'),
            updatePassword: this.db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
            updateUsername: this.db.prepare('UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
            countUsers: this.db.prepare('SELECT COUNT(*) as count FROM users'),
            
            // API站点查询语句
            findAllApiSites: this.db.prepare('SELECT * FROM api_sites ORDER BY created_at DESC'),
            findApiSiteById: this.db.prepare('SELECT * FROM api_sites WHERE id = ?'),
            findApiSitesByCreatedBy: this.db.prepare('SELECT * FROM api_sites WHERE created_by = ? ORDER BY created_at DESC'),
            insertApiSite: this.db.prepare('INSERT INTO api_sites (api_type, name, url, auth_method, sessions, token, user_id, enabled, auto_checkin, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
            updateApiSite: this.db.prepare('UPDATE api_sites SET api_type = ?, name = ?, url = ?, auth_method = ?, sessions = ?, token = ?, user_id = ?, enabled = ?, auto_checkin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
            updateLastCheckin: this.db.prepare('UPDATE api_sites SET last_checkin = CURRENT_TIMESTAMP WHERE id = ?'),
            deleteApiSite: this.db.prepare('DELETE FROM api_sites WHERE id = ?'),
            toggleApiSiteEnabled: this.db.prepare('UPDATE api_sites SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
            countApiSites: this.db.prepare('SELECT COUNT(*) as count FROM api_sites'),
            countEnabledApiSites: this.db.prepare('SELECT COUNT(*) as count FROM api_sites WHERE enabled = 1'),
            
            // 站点检测相关语句
            updateSiteCheckInfo: this.db.prepare(`
                UPDATE api_sites SET 
                    site_quota = ?, site_used_quota = ?, site_request_count = ?, 
                    site_user_group = ?, site_aff_code = ?, site_aff_count = ?, 
                    site_aff_quota = ?, site_aff_history_quota = ?, site_username = ?,
                    site_last_check_in_time = ?, last_check_time = CURRENT_TIMESTAMP,
                    last_check_status = ?, last_check_message = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `),
            updateSiteCheckStatus: this.db.prepare(`
                UPDATE api_sites SET 
                    last_check_time = CURRENT_TIMESTAMP, last_check_status = ?, 
                    last_check_message = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `),
            
            // 检测日志相关语句
            insertCheckLog: this.db.prepare('INSERT INTO site_check_logs (site_id, status, message, response_data) VALUES (?, ?, ?, ?)'),
            findCheckLogsBySiteId: this.db.prepare('SELECT * FROM site_check_logs WHERE site_id = ? ORDER BY check_time DESC LIMIT 10'),
            findLatestCheckLog: this.db.prepare('SELECT * FROM site_check_logs WHERE site_id = ? ORDER BY check_time DESC LIMIT 1')
        };
    }

    getDatabase() {
        if (!this.db) {
            return this.connect();
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
            try {
                this.db.close();
                console.log('数据库已关闭');
            } catch (error) {
                console.error('关闭数据库失败:', error.message);
            }
            this.db = null;
            this.statements = null;
        }
    }
}

module.exports = new DatabaseConfig();