const cron = require('node-cron');
const LogService = require('./LogService');
const { systemSettingsService } = require('./SystemSettingsService');

class LogCleanupService {
    constructor() {
        this.logService = new LogService();
        this.cleanupTask = null;
        this.initialized = false;
    }

    /**
     * 初始化日志清理服务
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            console.log('正在初始化日志清理服务...');
            
            // 等待系统设置服务初始化完成
            if (!systemSettingsService.initialized) {
                await systemSettingsService.initialize();
            }

            // 启动定时清理任务
            await this.setupCleanupSchedule();
            
            this.initialized = true;
            console.log('日志清理服务已初始化');
        } catch (error) {
            console.error('日志清理服务初始化失败:', error.message);
            throw error;
        }
    }

    /**
     * 设置清理调度
     */
    async setupCleanupSchedule() {
        try {
            // 获取配置
            const enabled = systemSettingsService.getSetting('logCleanupEnabled', 'true') === 'true';
            const cleanupTime = systemSettingsService.getSetting('logCleanupTime', '02:00');
            
            if (!enabled) {
                console.log('日志自动清理已禁用');
                return;
            }

            // 停止现有任务
            if (this.cleanupTask) {
                this.cleanupTask.stop();
                this.cleanupTask = null;
            }

            // 解析时间配置 (HH:mm 格式)
            const [hours, minutes] = cleanupTime.split(':').map(Number);
            
            // 创建cron表达式: 分钟 小时 日 月 星期
            const cronExpression = `${minutes} ${hours} * * *`;
            
            console.log(`设置日志清理定时任务: ${cleanupTime} (cron: ${cronExpression})`);
            
            // 创建定时任务
            this.cleanupTask = cron.schedule(cronExpression, async () => {
                await this.performCleanup();
            }, {
                scheduled: false,
                timezone: systemSettingsService.getSetting('timezone', 'Asia/Shanghai')
            });

            // 启动任务
            this.cleanupTask.start();
            
            console.log(`日志清理定时任务已启动，将在每天 ${cleanupTime} 执行`);
        } catch (error) {
            console.error('设置日志清理调度失败:', error.message);
            throw error;
        }
    }

    /**
     * 执行日志清理
     */
    async performCleanup() {
        try {
            console.log('开始执行日志定时清理...');
            
            const retentionDays = parseInt(systemSettingsService.getSetting('logRetentionDays', '30'));
            
            if (isNaN(retentionDays) || retentionDays <= 0) {
                console.warn('无效的日志保留天数配置，跳过清理');
                return;
            }

            console.log(`执行日志清理，保留天数: ${retentionDays}`);
            
            // 执行清理
            const result = await this.logService.cleanOldLogs(retentionDays);
            
            if (result.success) {
                console.log(`日志清理完成: ${result.message}`);
                
                // 记录清理日志
                await this.logService.logSystem('log_cleanup_scheduled', 
                    `定时日志清理完成，删除了 ${result.deleted} 条记录`, {
                    retentionDays,
                    deletedCount: result.deleted,
                    scheduledTime: new Date().toISOString()
                });
            } else {
                console.error(`日志清理失败: ${result.message}`);
                
                // 记录清理失败日志
                await this.logService.logSystem('log_cleanup_error', 
                    `定时日志清理失败: ${result.message}`, {
                    retentionDays,
                    error: result.message
                });
            }
        } catch (error) {
            console.error('执行日志清理时发生异常:', error.message);
            
            // 记录异常日志
            try {
                await this.logService.logSystem('log_cleanup_exception', 
                    `日志清理异常: ${error.message}`, {
                    error: error.message,
                    stack: error.stack
                });
            } catch (logError) {
                console.error('记录清理异常日志失败:', logError.message);
            }
        }
    }

    /**
     * 手动执行日志清理
     */
    async manualCleanup(retentionDays = null) {
        try {
            const days = retentionDays || parseInt(systemSettingsService.getSetting('logRetentionDays', '30'));
            
            if (isNaN(days) || days <= 0) {
                throw new Error('无效的保留天数');
            }

            console.log(`手动执行日志清理，保留天数: ${days}`);
            
            const result = await this.logService.cleanOldLogs(days);
            
            if (result.success) {
                // 记录手动清理日志
                await this.logService.logSystem('log_cleanup_manual', 
                    `手动日志清理完成，删除了 ${result.deleted} 条记录`, {
                    retentionDays: days,
                    deletedCount: result.deleted,
                    manualTime: new Date().toISOString()
                });
            }
            
            return result;
        } catch (error) {
            console.error('手动清理日志失败:', error.message);
            
            // 记录手动清理失败日志
            try {
                await this.logService.logSystem('log_cleanup_manual_error', 
                    `手动日志清理失败: ${error.message}`, {
                    retentionDays: retentionDays,
                    error: error.message
                });
            } catch (logError) {
                console.error('记录手动清理错误日志失败:', logError.message);
            }
            
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * 重新配置清理调度
     */
    async reconfigureSchedule() {
        try {
            console.log('重新配置日志清理调度...');
            await this.setupCleanupSchedule();
            console.log('日志清理调度已重新配置');
        } catch (error) {
            console.error('重新配置日志清理调度失败:', error.message);
            throw error;
        }
    }

    /**
     * 停止清理服务
     */
    stop() {
        if (this.cleanupTask) {
            this.cleanupTask.stop();
            this.cleanupTask = null;
            console.log('日志清理定时任务已停止');
        }
    }

    /**
     * 获取清理状态
     */
    getStatus() {
        const enabled = systemSettingsService.getSetting('logCleanupEnabled', 'true') === 'true';
        const cleanupTime = systemSettingsService.getSetting('logCleanupTime', '02:00');
        const retentionDays = parseInt(systemSettingsService.getSetting('logRetentionDays', '30'));
        
        return {
            initialized: this.initialized,
            enabled,
            cleanupTime,
            retentionDays,
            isRunning: this.cleanupTask !== null && this.cleanupTask.scheduled,
            nextExecution: this.cleanupTask ? this.getNextExecutionTime() : null
        };
    }

    /**
     * 获取下次执行时间
     */
    getNextExecutionTime() {
        if (!this.cleanupTask) {
            return null;
        }

        try {
            // 计算下次执行时间
            const now = new Date();
            const cleanupTime = systemSettingsService.getSetting('logCleanupTime', '02:00');
            const [hours, minutes] = cleanupTime.split(':').map(Number);
            
            const nextExecution = new Date();
            nextExecution.setHours(hours, minutes, 0, 0);
            
            // 如果今天的时间已过，则设为明天
            if (nextExecution <= now) {
                nextExecution.setDate(nextExecution.getDate() + 1);
            }
            
            return nextExecution.toISOString();
        } catch (error) {
            console.error('计算下次执行时间失败:', error.message);
            return null;
        }
    }

    /**
     * 获取清理统计信息
     */
    async getCleanupStats() {
        try {
            const status = this.getStatus();
            
            // 从日志服务获取统计信息
            const stats = {
                status: {
                    initialized: this.initialized,
                    enabled: status.enabled,
                    retentionDays: status.retentionDays,
                    taskActive: status.isRunning,
                    lastRun: null,
                    nextRun: status.nextExecution
                },
                totalDeletedRecords: 0, // 这里可以从数据库查询历史清理记录
                recentCleanups: [] // 这里可以查询最近的清理日志
            };
            
            return {
                success: true,
                data: stats
            };
        } catch (error) {
            console.error('获取清理统计失败:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

// 导出单例实例
const logCleanupService = new LogCleanupService();

module.exports = {
    LogCleanupService,
    logCleanupService
};