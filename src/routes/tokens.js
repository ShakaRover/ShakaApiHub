const express = require('express');
const TokenController = require('../controllers/TokenController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const tokenController = new TokenController();

// 应用认证中间件
router.use(authMiddleware);

// 获取站点令牌列表
router.get('/sites/:siteId/tokens', async (req, res) => {
    await tokenController.getTokens(req, res);
});

// 更新令牌状态
router.put('/sites/:siteId/tokens/status', async (req, res) => {
    await tokenController.updateTokenStatus(req, res);
});

// 删除令牌
router.delete('/sites/:siteId/tokens/:tokenId', async (req, res) => {
    await tokenController.deleteToken(req, res);
});

// 获取令牌组信息
router.get('/sites/:siteId/token-groups', async (req, res) => {
    await tokenController.getTokenGroups(req, res);
});

// 创建令牌
router.post('/sites/:siteId/tokens', async (req, res) => {
    await tokenController.createToken(req, res);
});

// 批量删除所有令牌
router.delete('/sites/:siteId/tokens', async (req, res) => {
    await tokenController.deleteAllTokens(req, res);
});

// 自动创建令牌
router.post('/sites/:siteId/tokens/auto-create', async (req, res) => {
    await tokenController.autoCreateTokens(req, res);
});

module.exports = router;