const SecurityUtils = require('../utils/security');

const validationMiddleware = {
    validateLogin: (req, res, next) => {
        const { username, password } = req.body;
        
        const usernameValidation = SecurityUtils.validateUsername(username);
        if (!usernameValidation.valid) {
            return res.status(400).json({
                success: false,
                message: usernameValidation.message
            });
        }
        
        const passwordValidation = SecurityUtils.validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: passwordValidation.message
            });
        }
        
        req.body.username = usernameValidation.value;
        req.body.password = passwordValidation.value;
        next();
    },

    validatePasswordUpdate: (req, res, next) => {
        const { currentPassword, newPassword } = req.body;
        
        const currentPasswordValidation = SecurityUtils.validatePassword(currentPassword);
        if (!currentPasswordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: '当前密码' + currentPasswordValidation.message.substring(2)
            });
        }
        
        const newPasswordValidation = SecurityUtils.validatePassword(newPassword);
        if (!newPasswordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: '新密码' + newPasswordValidation.message.substring(2)
            });
        }
        
        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: '新密码不能与当前密码相同'
            });
        }
        
        next();
    },

    validateUsernameUpdate: (req, res, next) => {
        const { newUsername } = req.body;
        
        const usernameValidation = SecurityUtils.validateUsername(newUsername);
        if (!usernameValidation.valid) {
            return res.status(400).json({
                success: false,
                message: usernameValidation.message
            });
        }
        
        req.body.newUsername = usernameValidation.value;
        next();
    }
};

module.exports = validationMiddleware;