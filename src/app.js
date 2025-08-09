const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const sessionConfig = require('./config/session');
const databaseConfig = require('./config/database');
const logDatabaseConfig = require('./config/logDatabase');
const configService = require('./services/ConfigService');
const BackupService = require('./services/BackupService');
const ScheduledCheckService = require('./services/ScheduledCheckService');
const { logCleanupService } = require('./services/LogCleanupService');
const logMiddleware = require('./middleware/logging');
const { systemSettingsService } = require('./services/SystemSettingsService');

const app = express();
const PORT = process.env.PORT || 3000;

// 异步启动应用
async function startApp() {
    try {
        // 连接数据库（现在是异步的）
        await databaseConfig.connect();

        // 初始化系统设置服务
        try {
            await systemSettingsService.initialize();
            console.log('系统设置服务已初始化');
        } catch (error) {
            console.warn('系统设置服务初始化失败，将使用默认设置:', error.message);
        }

        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrcAttr: ["'unsafe-inline'"],
                    imgSrc: ["'self'", "data:"]
                }
            }
        }));

        app.use(cors({
            origin: process.env.NODE_ENV === 'production' ? false : true,
            credentials: true
        }));


        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        app.use(session(sessionConfig));

        // 添加日志记录中间件
        app.use(logMiddleware.apiLogger());

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
        const systemRoutes = require('./routes/system');
        const tokenRoutes = require('./routes/tokens');
        
        app.use('/api/auth', authRoutes);
        app.use('/api', apiSiteRoutes);
        app.use('/api/system', systemRoutes);
        app.use('/api', tokenRoutes);

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
            logDatabaseConfig.close();
            process.exit(0);
        });

        app.listen(PORT, () => {
            console.log(`ShakaHub认证系统运行在端口 ${PORT}`);
            console.log(`访问地址: http://localhost:${PORT}`);
        });

        // 启动自动备份服务
        const backupService = new BackupService();
        await backupService.scheduleAutoBackup();

        // 启动定时检测服务 (暂时禁用以修复数据库问题)
        const scheduledCheckService = new ScheduledCheckService();
        
        // 启动日志清理服务
        console.log('正在初始化日志清理服务...');
        try {
            await logCleanupService.initialize();
        } catch (error) {
            console.warn('日志清理服务初始化失败:', error.message);
        }
        
        try {
            await scheduledCheckService.start();
        } catch (error) {
            console.warn('定时检测服务启动失败，将在后续版本中修复:', error.message);
        }
        
        // 将服务实例添加到app，供路由访问
        app.locals.scheduledCheckService = scheduledCheckService;
        app.locals.logCleanupService = logCleanupService;
    } catch (error) {
        console.error('应用启动失败:', error.message);
        process.exit(1);
    }
}

startApp();