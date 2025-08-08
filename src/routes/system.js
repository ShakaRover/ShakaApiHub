const express = require('express');
const systemController = require('../controllers/SystemController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 应用认证中间件
router.use(authMiddleware);

// 获取系统配置
router.get('/config', systemController.getConfig);

// 更新系统配置
router.put('/config', systemController.updateConfig);

// 获取支持的时区列表
router.get('/timezones', systemController.getTimezones);

// 获取系统状态
router.get('/status', systemController.getSystemStatus);

// 日志清理相关路由
router.get('/log-cleanup/status', systemController.getLogCleanupStatus);
router.post('/log-cleanup/trigger', systemController.triggerLogCleanup);
router.get('/log-cleanup/stats', systemController.getLogCleanupStats);

module.exports = router;