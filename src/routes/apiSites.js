const express = require('express');
const ApiSiteController = require('../controllers/ApiSiteController');

const router = express.Router();
const apiSiteController = new ApiSiteController();

// 认证中间件 - 检查用户是否已登录
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            message: '请先登录'
        });
    }
    next();
};

// 输入验证中间件
const validateApiSiteInput = (req, res, next) => {
    const { apiType, name, url, authMethod } = req.body;
    
    if (!apiType || !['NewApi', 'Veloera', 'AnyRouter'].includes(apiType)) {
        return res.status(400).json({
            success: false,
            message: '请选择有效的API类型'
        });
    }
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'API站点名称不能为空'
        });
    }
    
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'API地址不能为空'
        });
    }
    
    if (!authMethod || !['sessions', 'token'].includes(authMethod)) {
        return res.status(400).json({
            success: false,
            message: '请选择有效的授权方式'
        });
    }
    
    // URL格式验证
    try {
        new URL(url.trim());
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: '请输入有效的URL地址'
        });
    }
    
    next();
};

// 路由定义
// GET /api/sites - 获取所有API站点
router.get('/sites', requireAuth, (req, res) => {
    apiSiteController.getAllApiSites(req, res);
});

// GET /api/sites/my - 获取当前用户的API站点
router.get('/sites/my', requireAuth, (req, res) => {
    apiSiteController.getUserApiSites(req, res);
});

// GET /api/sites/stats - 获取API站点统计
router.get('/sites/stats', requireAuth, (req, res) => {
    apiSiteController.getApiSiteStats(req, res);
});

// 导出导入和备份路由 - 必须在 :id 路由之前定义
// GET /api/sites/export - 导出API站点配置
router.get('/sites/export', requireAuth, (req, res) => {
    apiSiteController.exportApiSites(req, res);
});

// GET /api/sites/:id - 根据ID获取API站点
router.get('/sites/:id', requireAuth, (req, res) => {
    apiSiteController.getApiSiteById(req, res);
});

// POST /api/sites - 创建新API站点
router.post('/sites', requireAuth, validateApiSiteInput, (req, res) => {
    apiSiteController.createApiSite(req, res);
});

// PUT /api/sites/:id - 更新API站点
router.put('/sites/:id', requireAuth, validateApiSiteInput, (req, res) => {
    apiSiteController.updateApiSite(req, res);
});

// PATCH /api/sites/:id/toggle - 切换API站点启用状态
router.patch('/sites/:id/toggle', requireAuth, (req, res) => {
    apiSiteController.toggleApiSiteEnabled(req, res);
});

// DELETE /api/sites/:id - 删除API站点
router.delete('/sites/:id', requireAuth, (req, res) => {
    apiSiteController.deleteApiSite(req, res);
});

// POST /api/sites/:id/check - 检测站点
router.post('/sites/:id/check', requireAuth, (req, res) => {
    apiSiteController.checkSite(req, res);
});

// GET /api/sites/:id/check-history - 获取检测历史
router.get('/sites/:id/check-history', requireAuth, (req, res) => {
    apiSiteController.getCheckHistory(req, res);
});

// POST /api/sites/import - 导入API站点配置
router.post('/sites/import', requireAuth, (req, res) => {
    apiSiteController.importApiSites(req, res);
});

// POST /api/backups - 创建备份
router.post('/backups', requireAuth, (req, res) => {
    apiSiteController.createBackup(req, res);
});

// GET /api/backups - 获取备份列表
router.get('/backups', requireAuth, (req, res) => {
    apiSiteController.getBackupList(req, res);
});

// POST /api/backups/restore - 恢复备份
router.post('/backups/restore', requireAuth, (req, res) => {
    apiSiteController.restoreBackup(req, res);
});

// DELETE /api/backups/:fileName - 删除备份
router.delete('/backups/:fileName', requireAuth, (req, res) => {
    apiSiteController.deleteBackup(req, res);
});

// GET /api/backups/:fileName/validate - 验证备份文件
router.get('/backups/:fileName/validate', requireAuth, (req, res) => {
    apiSiteController.validateBackup(req, res);
});

module.exports = router;