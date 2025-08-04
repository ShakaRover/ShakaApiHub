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

        try {
            // 使用事务确保原子性
            const transaction = this.db.transaction(() => {
                this.db.exec(createUsersTable);
                this.db.exec(createUsernameIndex);
                
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
            countUsers: this.db.prepare('SELECT COUNT(*) as count FROM users')
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