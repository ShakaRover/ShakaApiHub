const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const crypto = require('crypto');
const path = require('path');

// 确定数据目录
const dataDir = process.env.NODE_ENV === 'production' && process.env.DOCKER_ENV 
    ? '/app/data' 
    : path.join(__dirname, '../..');

// 创建 session 存储实例
const sessionStore = new SQLiteStore({
    db: 'sessions.db',
    dir: dataDir,
    table: 'sessions',
    // 清理过期 session 的间隔（毫秒）
    cleanupInterval: 300000, // 5分钟
    // session 过期时间（毫秒）
    ttl: 24 * 60 * 60 * 1000 // 24小时
});

const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'shaka-hub-default-secret-key-for-development',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        secure: false, // 在开发环境中设为 false，生产环境中根据 HTTPS 设置
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24小时
        sameSite: 'lax' // 改善跨站点兼容性
    },
    name: 'shakaHub.sid',
    // 在生产环境中启用 rolling sessions
    rolling: process.env.NODE_ENV === 'production'
};

module.exports = sessionConfig;