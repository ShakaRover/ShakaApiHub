const User = require('../models/User');

class UserService {
    constructor() {
        this.userModel = new User();
    }

    // 用户认证 - 混合同步/异步操作
    async authenticateUser(username, password) {
        try {
            // 同步查找用户（性能提升）
            const user = this.userModel.findByUsername(username);
            if (!user) {
                return { success: false, message: '用户名或密码错误' };
            }

            // 异步验证密码（bcrypt需要异步）
            const isValidPassword = await this.userModel.validatePassword(password, user.password_hash);
            if (!isValidPassword) {
                return { success: false, message: '用户名或密码错误' };
            }

            return { 
                success: true, 
                user: { 
                    id: user.id, 
                    username: user.username,
                    created_at: user.created_at 
                } 
            };
        } catch (error) {
            console.error('用户认证失败:', error.message);
            return { success: false, message: '认证过程中发生错误' };
        }
    }

    // 更新密码 - 优化性能
    async updateUserPassword(userId, currentPassword, newPassword) {
        try {
            // 同步查找用户（快速失败）
            const user = this.userModel.findById(userId);
            if (!user) {
                return { success: false, message: '用户不存在' };
            }

            // 异步验证当前密码
            const isCurrentPasswordValid = await this.userModel.validatePassword(currentPassword, user.password_hash);
            if (!isCurrentPasswordValid) {
                return { success: false, message: '当前密码错误' };
            }

            // 异步更新密码（bcrypt哈希是异步的）
            const success = await this.userModel.updatePassword(userId, newPassword);
            if (success) {
                return { success: true, message: '密码更新成功' };
            } else {
                return { success: false, message: '密码更新失败' };
            }
        } catch (error) {
            console.error('密码更新失败:', error.message);
            return { success: false, message: error.message };
        }
    }

    // 更新用户名 - 完全同步化
    updateUserUsername(userId, newUsername) {
        try {
            // 同步查找用户
            const user = this.userModel.findById(userId);
            if (!user) {
                return { success: false, message: '用户不存在' };
            }

            if (user.username === newUsername) {
                return { success: false, message: '新用户名不能与当前用户名相同' };
            }

            // 同步更新用户名
            const success = this.userModel.updateUsername(userId, newUsername);
            if (success) {
                return { success: true, message: '用户名更新成功' };
            } else {
                return { success: false, message: '用户名更新失败' };
            }
        } catch (error) {
            console.error('用户名更新失败:', error.message);
            return { success: false, message: error.message };
        }
    }

    // 获取用户资料 - 完全同步化
    getUserProfile(userId) {
        try {
            const user = this.userModel.findById(userId);
            if (!user) {
                return { success: false, message: '用户不存在' };
            }

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    created_at: user.created_at,
                    updated_at: user.updated_at
                }
            };
        } catch (error) {
            console.error('获取用户信息失败:', error.message);
            return { success: false, message: '获取用户信息失败' };
        }
    }

    // 新增：创建用户 - 异步方法
    async createUser(username, password) {
        try {
            const userId = await this.userModel.create(username, password);
            return { 
                success: true, 
                message: '用户创建成功',
                userId 
            };
        } catch (error) {
            console.error('创建用户失败:', error.message);
            return { success: false, message: error.message };
        }
    }

    // 新增：获取用户统计 - 同步方法
    getUserStats() {
        try {
            const totalUsers = this.userModel.getUserCount();
            return {
                success: true,
                stats: {
                    totalUsers,
                    activeUsers: 1 // 目前只有一个活跃用户（演示数据）
                }
            };
        } catch (error) {
            console.error('获取用户统计失败:', error.message);
            return { success: false, message: '获取统计信息失败' };
        }
    }

    // 新增：验证用户名是否可用 - 同步方法
    isUsernameAvailable(username) {
        try {
            const existingUser = this.userModel.findByUsername(username);
            return {
                success: true,
                available: !existingUser
            };
        } catch (error) {
            console.error('检查用户名可用性失败:', error.message);
            return { success: false, message: '检查失败' };
        }
    }
}

module.exports = UserService;