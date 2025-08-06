const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const sessionConfig = require('./config/session');
const databaseConfig = require('./config/database');
const BackupService = require('./services/BackupService');
const ScheduledCheckService = require('./services/ScheduledCheckService');

const app = express();
const PORT = process.env.PORT || 3000;

// 异步启动应用
async function startApp() {
    try {
        // 连接数据库（现在是同步的）
        databaseConfig.connect();

        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:"]
                }
            }
        }));

        app.use(cors({
            origin: process.env.NODE_ENV === 'production' ? false : true,
            credentials: true
        }));

        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15分钟
            max: 100, // 限制每个IP每15分钟最多100个请求
            message: { success: false, message: '请求过于频繁，请稍后再试' }
        });
        app.use('/api', limiter);

        const authLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15分钟
            max: 5, // 限制每个IP每15分钟最多5次登录尝试
            message: { success: false, message: '登录尝试过于频繁，请15分钟后再试' }
        });
        app.use('/api/auth/login', authLimiter);

        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        app.use(session(sessionConfig));

        // 保护dashboard页面 - 服务器端检查（在静态文件中间件之前）
        app.get('/dashboard.html', (req, res, next) => {
            if (!req.session.userId) {
                res.redirect('/index.html');
                return;
            }
            next();
        });

        app.use(express.static(path.join(__dirname, '../public')));

        // 数据库连接完成后再加载路由
        const authRoutes = require('./routes/auth');
        const apiSiteRoutes = require('./routes/apiSites');
        
        app.use('/api/auth', authRoutes);
        app.use('/api', apiSiteRoutes);

        app.get('/', (req, res) => {
            if (req.session.userId) {
                res.redirect('/dashboard.html');
            } else {
                res.redirect('/index.html');
            }
        });

        app.use((req, res) => {
            res.status(404).json({ success: false, message: '页面未找到' });
        });

        app.use((error, req, res, next) => {
            console.error('服务器错误:', error.message);
            res.status(500).json({ success: false, message: '服务器内部错误' });
        });

        process.on('SIGINT', () => {
            console.log('正在关闭服务器...');
            databaseConfig.close();
            process.exit(0);
        });

        app.listen(PORT, () => {
            console.log(`ShakaHub认证系统运行在端口 ${PORT}`);
            console.log(`访问地址: http://localhost:${PORT}`);
        });

        // 启动自动备份服务
        const backupService = new BackupService();
        await backupService.scheduleAutoBackup();

        // 启动定时检测服务
        const scheduledCheckService = new ScheduledCheckService();
        await scheduledCheckService.start();
        
        // 将服务实例添加到app，供路由访问
        app.locals.scheduledCheckService = scheduledCheckService;
    } catch (error) {
        console.error('应用启动失败:', error.message);
        process.exit(1);
    }
}

startApp();