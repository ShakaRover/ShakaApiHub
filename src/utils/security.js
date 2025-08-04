const crypto = require('crypto');

class SecurityUtils {
    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        return input.trim().replace(/[<>]/g, '');
    }

    static validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return { valid: false, message: '用户名不能为空' };
        }
        
        const sanitized = this.sanitizeInput(username);
        if (sanitized.length < 3 || sanitized.length > 20) {
            return { valid: false, message: '用户名长度必须在3-20个字符之间' };
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(sanitized)) {
            return { valid: false, message: '用户名只能包含字母、数字和下划线' };
        }
        
        return { valid: true, value: sanitized };
    }

    static validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { valid: false, message: '密码不能为空' };
        }
        
        if (password.length < 6 || password.length > 50) {
            return { valid: false, message: '密码长度必须在6-50个字符之间' };
        }
        
        return { valid: true, value: password };
    }

    static generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    static isAuthenticated(req) {
        return req.session && req.session.userId;
    }
}

module.exports = SecurityUtils;