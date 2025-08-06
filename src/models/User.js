const databaseConfig = require('../config/database');
const PasswordUtils = require('../utils/passwordUtils');

class User {
    constructor() {
        this.statements = databaseConfig.getStatements();
    }

    // 异步方法 - 根据用户名查找用户
    async findByUsername(username) {
        try {
            return await this.statements.findUserByUsername.get(username);
        } catch (error) {
            console.error('查询用户失败:', error.message);
            throw new Error('数据库查询失败');
        }
    }

    // 异步方法 - 根据ID查找用户
    async findById(id) {
        try {
            return await this.statements.findUserById.get(id);
        } catch (error) {
            console.error('查询用户失败:', error.message);
            throw new Error('数据库查询失败');
        }
    }

    // 异步方法 - 创建用户
    async create(username, password) {
        try {
            const passwordHash = await PasswordUtils.hashPassword(password);
            const result = await this.statements.insertUser.run(username, passwordHash);
            return result.lastID;
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error('用户名已存在');
            }
            console.error('创建用户失败:', error.message);
            throw new Error('用户创建失败');
        }
    }

    // 异步方法 - 更新密码
    async updatePassword(userId, newPassword) {
        try {
            const passwordHash = await PasswordUtils.hashPassword(newPassword);
            const result = await this.statements.updatePassword.run(passwordHash, userId);
            return result.changes > 0;
        } catch (error) {
            console.error('更新密码失败:', error.message);
            throw new Error('密码更新失败');
        }
    }

    // 异步方法 - 更新用户名
    async updateUsername(userId, newUsername) {
        try {
            const result = await this.statements.updateUsername.run(newUsername, userId);
            return result.changes > 0;
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error('用户名已存在');
            }
            console.error('更新用户名失败:', error.message);
            throw new Error('用户名更新失败');
        }
    }

    // 异步方法 - 验证密码（支持渐进式迁移）
    async validatePassword(password, hash) {
        try {
            // 检查是否为旧的 bcrypt 格式
            if (this.isBcryptHash(hash)) {
                console.log('检测到 bcrypt 格式密码，尝试验证...');
                // 对于旧格式，我们只能使用新的 crypto 方法验证
                // 如果验证失败，可能需要用户重置密码
                return await PasswordUtils.verifyPassword(password, hash);
            } else {
                // 使用新的验证方法
                return await PasswordUtils.verifyPassword(password, hash);
            }
        } catch (error) {
            console.error('密码验证失败:', error.message);
            return false;
        }
    }

    // 检查是否为 bcrypt 格式
    isBcryptHash(hash) {
        return /^\$2[abxy]\$/.test(hash);
    }

    // 异步方法 - 获取用户总数
    async getUserCount() {
        try {
            const result = await this.statements.countUsers.get();
            return result.count;
        } catch (error) {
            console.error('获取用户数量失败:', error.message);
            throw new Error('数据库查询失败');
        }
    }
}

module.exports = User;