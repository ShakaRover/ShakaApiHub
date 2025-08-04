const bcrypt = require('bcrypt');
const databaseConfig = require('../config/database');

class User {
    constructor() {
        this.db = databaseConfig.getDatabase();
        this.statements = databaseConfig.getStatements();
    }

    // 同步方法 - 根据用户名查找用户
    findByUsername(username) {
        try {
            return this.statements.findUserByUsername.get(username);
        } catch (error) {
            console.error('查询用户失败:', error.message);
            throw new Error('数据库查询失败');
        }
    }

    // 同步方法 - 根据ID查找用户
    findById(id) {
        try {
            return this.statements.findUserById.get(id);
        } catch (error) {
            console.error('查询用户失败:', error.message);
            throw new Error('数据库查询失败');
        }
    }

    // 异步方法 - 创建用户（保持异步因为需要密码哈希）
    async create(username, password) {
        try {
            const passwordHash = await bcrypt.hash(password, 12);
            const result = this.statements.insertUser.run(username, passwordHash);
            return result.lastInsertRowid;
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error('用户名已存在');
            }
            console.error('创建用户失败:', error.message);
            throw new Error('用户创建失败');
        }
    }

    // 异步方法 - 更新密码（保持异步因为需要密码哈希）
    async updatePassword(userId, newPassword) {
        try {
            const passwordHash = await bcrypt.hash(newPassword, 12);
            const result = this.statements.updatePassword.run(passwordHash, userId);
            return result.changes > 0;
        } catch (error) {
            console.error('更新密码失败:', error.message);
            throw new Error('密码更新失败');
        }
    }

    // 同步方法 - 更新用户名
    updateUsername(userId, newUsername) {
        try {
            const result = this.statements.updateUsername.run(newUsername, userId);
            return result.changes > 0;
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error('用户名已存在');
            }
            console.error('更新用户名失败:', error.message);
            throw new Error('用户名更新失败');
        }
    }

    // 异步方法 - 验证密码（保持异步因为bcrypt.compare是异步的）
    async validatePassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            console.error('密码验证失败:', error.message);
            return false;
        }
    }

    // 同步方法 - 获取用户总数
    getUserCount() {
        try {
            return this.statements.countUsers.get().count;
        } catch (error) {
            console.error('获取用户数量失败:', error.message);
            throw new Error('数据库查询失败');
        }
    }

    // 事务方法 - 批量操作示例
    createUserTransaction(username, password) {
        const transaction = this.db.transaction(async () => {
            const passwordHash = await bcrypt.hash(password, 12);
            const result = this.statements.insertUser.run(username, passwordHash);
            return result.lastInsertRowid;
        });
        
        return transaction();
    }
}

module.exports = User;