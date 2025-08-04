const SecurityUtils = require('../utils/security');

const authMiddleware = (req, res, next) => {
    if (!SecurityUtils.isAuthenticated(req)) {
        return res.status(401).json({ 
            success: false, 
            message: '请先登录' 
        });
    }
    next();
};

module.exports = authMiddleware;