const cron = require('node-cron');
const LogService = require('./LogService');
const ConfigService = require('./ConfigService');

class LogCleanupService {
    constructor() {
        this.logService = null;
        this.task = null;
        this.running = false;
        this.lastRun = null;
        this.nextRun = null;
        this.init();
    }

    async init() {
        try {
            // 初始化LogService
            this.logService = new LogService();
            
            // 启动定时清理
            this.startScheduledCleanup();
            
            console.log('日志清理服务已初始化');
        } catch (error) {
            console.error('日志清理服务初始化失败:', error);
        }
    }

    // 启动定时清理任务
    startScheduledCleanup() {
        // 每天凌晨2点执行日志清理
        const schedule = '0 2 * * *'; // 秒 分 时 日 月 周
        
        this.task = cron.schedule(schedule, async () => {
            await this.performScheduledCleanup();
        }, {
            scheduled: true,
            timezone: 'Asia/Shanghai'
        });

        // 计算下次运行时间
        this.updateNextRunTime();
        
        console.log('日志定时清理任务已启动，每天凌晨2点执行');
    }

    // 执行定时清理
    async performScheduledCleanup() {
        if (this.running) {
            console.log('日志清理任务正在运行中，跳过本次执行');
            return;
        }

        try {
            this.running = true;
            this.lastRun = new Date();
            
            console.log('开始执行定时日志清理...');
            
            // 获取配置的保留天数
            const config = await ConfigService.getConfig();
            const retentionDays = config.logRetentionDays || 30;
            
            // 执行清理
            const result = await this.logService.cleanOldLogs(retentionDays);
            
            if (result.success) {
                console.log(`定时日志清理完成: ${result.message}`);
                
                // 记录清理操作到系统日志
                await this.logService.logSystem('scheduled_log_cleanup', result.message, {
                    deleted: result.deleted,
                    retentionDays,
                    scheduledAt: this.lastRun.toISOString()
                });
            } else {
                console.error(`定时日志清理失败: ${result.message}`);
                
                // 记录错误到系统日志
                await this.logService.logSystem('scheduled_log_cleanup_error', `定时日志清理失败: ${result.message}`, {
                    error: result.message,
                    retentionDays,
                    scheduledAt: this.lastRun.toISOString()
                });
            }
            
        } catch (error) {
            console.error('定时日志清理执行失败:', error);
            
            // 记录错误
            if (this.logService) {
                await this.logService.logSystem('scheduled_log_cleanup_error', `定时日志清理执行失败: ${error.message}`, {
                    error: error.message,
                    stack: error.stack,
                    scheduledAt: this.lastRun.toISOString()
                });
            }
        } finally {
            this.running = false;
            this.updateNextRunTime();
        }
    }

    // 手动触发清理
    async triggerManualCleanup(retentionDays = null) {
        if (this.running) {
            return { success: false, message: '清理任务正在运行中，请稍后再试' };
        }

        try {
            this.running = true;
            
            // 获取保留天数
            const daysToKeep = retentionDays || (await ConfigService.getConfig()).logRetentionDays || 30;
            
            console.log(`开始手动日志清理，保留${daysToKeep}天的记录...`);
            
            // 执行清理
            const result = await this.logService.cleanOldLogs(daysToKeep);
            
            if (result.success) {
                // 记录手动清理操作
                await this.logService.logSystem('manual_log_cleanup', result.message, {
                    deleted: result.deleted,
                    retentionDays: daysToKeep,
                    triggeredAt: new Date().toISOString()
                });
            }
            
            return result;
            
        } catch (error) {
            console.error('手动日志清理失败:', error);
            return { success: false, message: error.message };
        } finally {
            this.running = false;
        }
    }

    // 停止定时清理
    stopScheduledCleanup() {
        if (this.task) {
            this.task.stop();
            console.log('日志定时清理任务已停止');
        }
    }

    // 重新启动定时清理
    restartScheduledCleanup() {
        this.stopScheduledCleanup();
        this.startScheduledCleanup();
    }

    // 更新下次运行时间
    updateNextRunTime() {
        try {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            tomorrow.setHours(2, 0, 0, 0); // 设置为明天凌晨2点
            
            // 如果现在已经是今天凌晨2点之后，则下次运行时间是明天凌晨2点
            if (now.getHours() >= 2) {
                this.nextRun = tomorrow;
            } else {
                // 如果现在还没到今天凌晨2点，则下次运行时间是今天凌晨2点
                const today = new Date(now);
                today.setHours(2, 0, 0, 0);
                this.nextRun = today;
            }
        } catch (error) {
            console.error('更新下次运行时间失败:', error);
        }
    }

    // 获取清理状态
    getCleanupStatus() {
        return {
            running: this.running,
            lastRun: this.lastRun,
            nextRun: this.nextRun,
            taskActive: this.task ? this.task.running : false
        };
    }

    // 获取清理统计
    async getCleanupStats() {
        try {
            if (!this.logService) {
                return { success: false, message: 'LogService未初始化' };
            }

            // 获取清理历史（最近7次）
            const cleanupLogs = await this.logService.getSystemLogs({
                type: 'scheduled_log_cleanup',
                limit: 7,
                offset: 0
            });

            const manualCleanupLogs = await this.logService.getSystemLogs({
                type: 'manual_log_cleanup',
                limit: 7,
                offset: 0
            });

            // 合并并排序
            const allCleanupLogs = [
                ...(cleanupLogs.data || []),
                ...(manualCleanupLogs.data || [])
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
             .slice(0, 7);

            // 计算统计信息
            let totalDeleted = 0;
            allCleanupLogs.forEach(log => {
                if (log.data && log.data.deleted) {
                    totalDeleted += log.data.deleted;
                }
            });

            return {
                success: true,
                data: {
                    recentCleanups: allCleanupLogs,
                    totalDeletedRecords: totalDeleted,
                    status: this.getCleanupStatus()
                }
            };
        } catch (error) {
            console.error('获取清理统计失败:', error);
            return { success: false, message: error.message };
        }
    }
}

module.exports = new LogCleanupService();