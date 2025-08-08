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

// 获取时区配置详情
router.get('/timezone/config', systemController.getTimezoneConfig);

// 更新时区配置
router.put('/timezone/config', systemController.updateTimezone);

// 获取API类型配置信息
router.get('/api-types', systemController.getApiTypes);

// 验证API站点配置
router.post('/validate-api-site', systemController.validateApiSite);

// 获取系统状态
router.get('/status', systemController.getSystemStatus);

// 日志清理相关路由
router.get('/log-cleanup/status', systemController.getLogCleanupStatus);
router.post('/log-cleanup/trigger', systemController.triggerLogCleanup);
router.get('/log-cleanup/stats', systemController.getLogCleanupStats);

// 速率限制相关路由
router.get('/rate-limit/config', systemController.getRateLimitConfig);
router.put('/rate-limit/config', systemController.updateRateLimitConfig);
router.get('/rate-limit/stats', systemController.getRateLimitStats);

module.exports = router;