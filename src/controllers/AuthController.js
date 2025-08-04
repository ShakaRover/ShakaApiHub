const UserService = require('../services/UserService');

class AuthController {
    constructor() {
        this.userService = new UserService();
    }

    async login(req, res) {
        try {
            const { username, password } = req.body;
            const result = await this.userService.authenticateUser(username, password);

            if (result.success) {
                req.session.userId = result.user.id;
                req.session.username = result.user.username;
                
                res.json({
                    success: true,
                    message: '登录成功',
                    user: result.user
                });
            } else {
                res.status(401).json(result);
            }
        } catch (error) {
            console.error('登录处理失败:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    logout(req, res) {
        req.session.destroy((err) => {
            if (err) {
                console.error('登出失败:', err.message);
                return res.status(500).json({
                    success: false,
                    message: '登出失败'
                });
            }

            res.clearCookie('shakaHub.sid');
            res.json({
                success: true,
                message: '已成功登出'
            });
        });
    }

    async updatePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.session.userId;

            const result = await this.userService.updateUserPassword(userId, currentPassword, newPassword);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('密码更新处理失败:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    updateUsername(req, res) {
        try {
            const { newUsername } = req.body;
            const userId = req.session.userId;

            // 同步调用（性能提升）
            const result = this.userService.updateUserUsername(userId, newUsername);
            
            if (result.success) {
                req.session.username = newUsername;
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('用户名更新处理失败:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }

    getProfile(req, res) {
        try {
            const userId = req.session.userId;
            
            // 同步调用（性能提升）
            const result = this.userService.getUserProfile(userId);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(404).json(result);
            }
        } catch (error) {
            console.error('获取用户信息处理失败:', error.message);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }
}

module.exports = AuthController;