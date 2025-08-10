const express = require('express');
const ApiSiteController = require('../controllers/ApiSiteController');
const LogController = require('../controllers/LogController');

const router = express.Router();
const apiSiteController = new ApiSiteController();
const logController = new LogController();

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
    
    if (!apiType || !['NewApi', 'Veloera', 'AnyRouter', 'VoApi'].includes(apiType)) {
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

// GET /api/sites/import/help - 获取导入帮助信息
router.get('/sites/import/help', requireAuth, (req, res) => {
    apiSiteController.getImportHelp(req, res);
});

// POST /api/sites/import/diagnose - 诊断导入数据
router.post('/sites/import/diagnose', requireAuth, (req, res) => {
    apiSiteController.diagnoseImportData(req, res);
});

// POST /api/sites/import - 导入API站点配置
router.post('/sites/import', requireAuth, (req, res) => {
    apiSiteController.importApiSites(req, res);
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

// POST /api/sites/:id/topup - 兑换码
router.post('/sites/:id/topup', requireAuth, (req, res) => {
    apiSiteController.topupSite(req, res);
});

// PUT /api/sites/:id/token/:tokenId/toggle - 切换令牌状态
router.put('/sites/:id/token/:tokenId/toggle', requireAuth, (req, res) => {
    apiSiteController.toggleToken(req, res);
});

// DELETE /api/sites/:id/token/:tokenId - 删除令牌
router.delete('/sites/:id/token/:tokenId', requireAuth, (req, res) => {
    apiSiteController.deleteToken(req, res);
});

// DELETE /api/sites/:id/tokens/deleteAll - 全部删除令牌
router.delete('/sites/:id/tokens/deleteAll', requireAuth, (req, res) => {
    apiSiteController.deleteAllTokens(req, res);
});

// POST /api/sites/:id/tokens/autoCreate - 自动创建令牌
router.post('/sites/:id/tokens/autoCreate', requireAuth, (req, res) => {
    apiSiteController.autoCreateTokens(req, res);
});

// GET /api/sites/:id/check-history - 获取检测历史
router.get('/sites/:id/check-history', requireAuth, (req, res) => {
    apiSiteController.getCheckHistory(req, res);
});

// GET /api/sites/:id/checkin-status - 获取签到状态
router.get('/sites/:id/checkin-status', requireAuth, (req, res) => {
    apiSiteController.getCheckinStatus(req, res);
});

// 密码管理相关路由
// GET /api/sites/:id/user/self - 获取站点用户信息
router.get('/sites/:id/user/self', requireAuth, (req, res) => {
    apiSiteController.getSiteUserInfo(req, res);
});

// PUT /api/sites/:id/user/password - 修改站点用户密码
router.put('/sites/:id/user/password', requireAuth, (req, res) => {
    apiSiteController.changeSiteUserPassword(req, res);
});

// GET /api/sites/:id/password-history - 获取站点密码修改历史
router.get('/sites/:id/password-history', requireAuth, (req, res) => {
    apiSiteController.getPasswordChangeHistory(req, res);
});

// GET /api/user/password-history - 获取用户密码修改历史
router.get('/user/password-history', requireAuth, (req, res) => {
    apiSiteController.getUserPasswordChangeHistory(req, res);
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

// GET /api/backups/:fileName/download - 下载备份文件
router.get('/backups/:fileName/download', requireAuth, (req, res) => {
    apiSiteController.downloadBackup(req, res);
});

// 定时检测相关路由

// GET /api/scheduled-check/config - 获取定时检测配置
router.get('/scheduled-check/config', requireAuth, (req, res) => {
    const scheduledCheckService = req.app.locals.scheduledCheckService;
    if (!scheduledCheckService) {
        return res.status(500).json({ success: false, message: '定时检测服务未启动' });
    }
    
    scheduledCheckService.getConfig().then(result => {
        res.json(result);
    }).catch(error => {
        res.status(500).json({ success: false, message: error.message });
    });
});

// PUT /api/scheduled-check/config - 更新定时检测配置
router.put('/scheduled-check/config', requireAuth, (req, res) => {
    const { interval, enabled } = req.body;
    
    // 输入验证
    if (typeof interval !== 'number' || interval < 1 || interval > 1440) {
        return res.status(400).json({
            success: false,
            message: '检测间隔必须在1-1440分钟之间'
        });
    }
    
    const scheduledCheckService = req.app.locals.scheduledCheckService;
    if (!scheduledCheckService) {
        return res.status(500).json({ success: false, message: '定时检测服务未启动' });
    }
    
    scheduledCheckService.updateConfig(interval, enabled).then(result => {
        res.json(result);
    }).catch(error => {
        res.status(500).json({ success: false, message: error.message });
    });
});

// POST /api/scheduled-check/trigger - 手动触发检测
router.post('/scheduled-check/trigger', requireAuth, (req, res) => {
    const scheduledCheckService = req.app.locals.scheduledCheckService;
    if (!scheduledCheckService) {
        return res.status(500).json({ success: false, message: '定时检测服务未启动' });
    }
    
    scheduledCheckService.triggerManualCheck().then(result => {
        res.json(result);
    }).catch(error => {
        res.status(500).json({ success: false, message: error.message });
    });
});

// GET /api/scheduled-check/history - 获取定时检测历史
router.get('/scheduled-check/history', requireAuth, (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    
    const scheduledCheckService = req.app.locals.scheduledCheckService;
    if (!scheduledCheckService) {
        return res.status(500).json({ success: false, message: '定时检测服务未启动' });
    }
    
    scheduledCheckService.getCheckHistory(limit).then(result => {
        res.json(result);
    }).catch(error => {
        res.status(500).json({ success: false, message: error.message });
    });
});

// 日志管理相关路由

// GET /api/logs/stats - 获取日志统计信息
router.get('/logs/stats', requireAuth, (req, res) => {
    logController.getLogStats(req, res);
});

// GET /api/logs/types - 获取日志类型列表
router.get('/logs/types', requireAuth, (req, res) => {
    logController.getLogTypes(req, res);
});

// GET /api/logs/all - 获取综合日志
router.get('/logs/all', requireAuth, (req, res) => {
    logController.getAllLogs(req, res);
});

// GET /api/logs/system - 获取系统日志
router.get('/logs/system', requireAuth, (req, res) => {
    logController.getSystemLogs(req, res);
});

// GET /api/logs/user - 获取用户操作日志
router.get('/logs/user', requireAuth, (req, res) => {
    logController.getUserLogs(req, res);
});

// GET /api/logs/api - 获取API请求日志
router.get('/logs/api', requireAuth, (req, res) => {
    logController.getApiLogs(req, res);
});

// GET /api/logs/site - 获取站点检测日志
router.get('/logs/site', requireAuth, (req, res) => {
    logController.getSiteCheckLogs(req, res);
});

// POST /api/logs/clean - 清理旧日志
router.post('/logs/clean', requireAuth, (req, res) => {
    logController.cleanOldLogs(req, res);
});

module.exports = router;