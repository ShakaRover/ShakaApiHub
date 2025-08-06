const cron = require('node-cron');
const databaseConfig = require('../config/database');
const SiteCheckService = require('./SiteCheckService');

class ScheduledCheckService {
    constructor() {
        this.db = databaseConfig.getDatabase();
        this.statements = databaseConfig.getStatements();
        this.siteCheckService = new SiteCheckService();
        this.scheduledTask = null;
        this.isRunning = false;
        
        // 默认配置：15分钟检测一次
        this.defaultInterval = 15;
        this.currentInterval = this.defaultInterval;
        
        console.log('定时检测服务已初始化');
    }

    /**
     * 启动定时检测服务
     */
    async start() {
        try {
            // 创建配置表
            await this.createConfigTable();
            
            // 加载配置
            const config = await this.loadConfig();
            this.currentInterval = config.interval;
            
            // 启动定时任务
            await this.scheduleCheck();
            
            console.log(`🚀 定时检测服务已启动，检测间隔: ${this.currentInterval} 分钟`);
        } catch (error) {
            console.error('启动定时检测服务失败:', error.message);
            throw error;
        }
    }

    /**
     * 停止定时检测服务
     */
    stop() {
        if (this.scheduledTask) {
            this.scheduledTask.stop();
            this.scheduledTask = null;
            console.log('⏹️ 定时检测服务已停止');
        }
    }

    /**
     * 重启定时检测服务
     */
    async restart() {
        console.log('🔄 重启定时检测服务...');
        this.stop();
        await this.start();
    }

    /**
     * 创建配置表
     */
    async createConfigTable() {
        try {
            const createConfigTable = `
                CREATE TABLE IF NOT EXISTS scheduled_check_config (
                    id INTEGER PRIMARY KEY,
                    interval_minutes INTEGER NOT NULL DEFAULT 15,
                    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
                    last_run DATETIME,
                    next_run DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            this.db.exec(createConfigTable);

            // 插入默认配置（如果不存在）
            const existingConfig = this.db.prepare('SELECT COUNT(*) as count FROM scheduled_check_config').get();
            if (existingConfig.count === 0) {
                this.db.prepare(`
                    INSERT INTO scheduled_check_config (interval_minutes, enabled)
                    VALUES (?, ?)
                `).run(this.defaultInterval, 1);
                
                console.log(`✅ 创建默认定时检测配置: ${this.defaultInterval} 分钟间隔`);
            }
        } catch (error) {
            console.error('创建配置表失败:', error.message);
            throw error;
        }
    }

    /**
     * 加载配置
     */
    async loadConfig() {
        try {
            const config = this.db.prepare('SELECT * FROM scheduled_check_config WHERE id = 1').get();
            
            if (!config) {
                // 如果没有配置，返回默认值
                return {
                    interval: this.defaultInterval,
                    enabled: true
                };
            }

            return {
                interval: config.interval_minutes,
                enabled: config.enabled === 1,
                lastRun: config.last_run,
                nextRun: config.next_run
            };
        } catch (error) {
            console.error('加载配置失败:', error.message);
            return {
                interval: this.defaultInterval,
                enabled: true
            };
        }
    }

    /**
     * 更新配置
     */
    async updateConfig(intervalMinutes, enabled = true) {
        try {
            const nextRun = this.calculateNextRun(intervalMinutes);
            
            this.db.prepare(`
                UPDATE scheduled_check_config 
                SET interval_minutes = ?, enabled = ?, next_run = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `).run(intervalMinutes, enabled ? 1 : 0, nextRun);

            this.currentInterval = intervalMinutes;
            
            console.log(`✅ 定时检测配置已更新: ${intervalMinutes} 分钟间隔, 启用: ${enabled}`);
            
            // 重启定时任务以应用新配置
            await this.restart();
            
            return { success: true, message: '配置更新成功' };
        } catch (error) {
            console.error('更新配置失败:', error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * 获取当前配置
     */
    async getConfig() {
        try {
            const config = await this.loadConfig();
            const status = {
                interval: config.interval,
                enabled: config.enabled,
                lastRun: config.lastRun,
                nextRun: config.nextRun,
                isRunning: this.isRunning,
                taskActive: this.scheduledTask ? this.scheduledTask.running : false
            };

            return { success: true, data: status };
        } catch (error) {
            console.error('获取配置失败:', error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * 计算下次运行时间
     */
    calculateNextRun(intervalMinutes) {
        const now = new Date();
        const nextRun = new Date(now.getTime() + intervalMinutes * 60 * 1000);
        return nextRun.toISOString();
    }

    /**
     * 根据间隔生成cron表达式
     */
    generateCronExpression(intervalMinutes) {
        if (intervalMinutes < 1) {
            intervalMinutes = 1; // 最小1分钟
        } else if (intervalMinutes > 1440) {
            intervalMinutes = 1440; // 最大24小时
        }

        if (intervalMinutes === 1) {
            return '* * * * *'; // 每分钟
        } else if (intervalMinutes <= 59) {
            return `*/${intervalMinutes} * * * *`; // 每N分钟
        } else {
            const hours = Math.floor(intervalMinutes / 60);
            const minutes = intervalMinutes % 60;
            
            if (minutes === 0) {
                // 整点运行
                return `0 */${hours} * * *`;
            } else {
                // 每小时的特定分钟运行
                return `${minutes} */${hours} * * *`;
            }
        }
    }

    /**
     * 调度检测任务
     */
    async scheduleCheck() {
        try {
            const config = await this.loadConfig();
            
            if (!config.enabled) {
                console.log('⚠️ 定时检测已禁用，跳过调度');
                return;
            }

            // 停止现有任务
            if (this.scheduledTask) {
                this.scheduledTask.stop();
            }

            const cronExpression = this.generateCronExpression(config.interval);
            console.log(`📅 生成定时任务表达式: ${cronExpression} (间隔: ${config.interval} 分钟)`);

            // 创建定时任务
            this.scheduledTask = cron.schedule(cronExpression, async () => {
                await this.executeScheduledCheck();
            }, {
                scheduled: true,
                timezone: 'Asia/Shanghai'
            });

            console.log('✅ 定时检测任务已调度');
            
            // 更新下次运行时间
            const nextRun = this.calculateNextRun(config.interval);
            this.db.prepare(`
                UPDATE scheduled_check_config 
                SET next_run = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `).run(nextRun);

        } catch (error) {
            console.error('调度定时检测失败:', error.message);
            throw error;
        }
    }

    /**
     * 执行定时检测
     */
    async executeScheduledCheck() {
        if (this.isRunning) {
            console.log('⚠️ 定时检测正在运行中，跳过本次执行');
            return;
        }

        this.isRunning = true;
        const startTime = new Date();
        
        try {
            console.log(`\n🚀 开始执行定时检测 - ${startTime.toLocaleString('zh-CN')}`);
            
            // 更新最后运行时间
            this.db.prepare(`
                UPDATE scheduled_check_config 
                SET last_run = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `).run();

            // 获取所有启用的站点
            const enabledSites = this.statements.findAllApiSites.all()
                .filter(site => site.enabled === 1);

            if (enabledSites.length === 0) {
                console.log('📝 没有启用的站点需要检测');
                return;
            }

            console.log(`📊 找到 ${enabledSites.length} 个启用的站点，开始批量检测`);

            let successCount = 0;
            let errorCount = 0;
            const results = [];

            // 逐个检测站点（避免并发过多）
            for (let i = 0; i < enabledSites.length; i++) {
                const site = enabledSites[i];
                
                try {
                    console.log(`📍 检测站点 ${i + 1}/${enabledSites.length}: ${site.name} (${site.url})`);
                    
                    const result = await this.siteCheckService.checkSite(site.id);
                    
                    if (result.success) {
                        successCount++;
                        results.push({ 
                            site: site.name, 
                            status: 'success', 
                            message: '检测成功',
                            data: result.data 
                        });
                        console.log(`✅ ${site.name} 检测成功`);
                    } else {
                        errorCount++;
                        results.push({ 
                            site: site.name, 
                            status: 'error', 
                            message: result.message || '检测失败' 
                        });
                        console.log(`❌ ${site.name} 检测失败: ${result.message}`);
                    }
                    
                } catch (error) {
                    errorCount++;
                    results.push({ 
                        site: site.name, 
                        status: 'error', 
                        message: error.message || '检测异常' 
                    });
                    console.error(`💥 ${site.name} 检测异常:`, error.message);
                }

                // 添加延迟避免请求过于频繁
                if (i < enabledSites.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            const endTime = new Date();
            const duration = Math.round((endTime - startTime) / 1000);

            console.log(`\n📈 定时检测完成 - ${endTime.toLocaleString('zh-CN')}`);
            console.log(`📊 检测统计: 总数 ${enabledSites.length}, 成功 ${successCount}, 失败 ${errorCount}`);
            console.log(`⏱️ 执行耗时: ${duration} 秒`);
            
            // 记录检测摘要日志
            await this.logScheduledCheckSummary({
                total: enabledSites.length,
                success: successCount,
                error: errorCount,
                duration: duration,
                results: results
            });

            // 更新下次运行时间
            const config = await this.loadConfig();
            const nextRun = this.calculateNextRun(config.interval);
            this.db.prepare(`
                UPDATE scheduled_check_config 
                SET next_run = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `).run(nextRun);

            console.log(`📅 下次检测时间: ${new Date(nextRun).toLocaleString('zh-CN')}\n`);

        } catch (error) {
            console.error('💥 定时检测执行失败:', error.message);
            
            // 记录错误日志
            await this.logScheduledCheckError(error.message);
            
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * 手动触发检测
     */
    async triggerManualCheck() {
        if (this.isRunning) {
            return { 
                success: false, 
                message: '定时检测正在运行中，请稍后再试' 
            };
        }

        try {
            console.log('🔧 手动触发定时检测');
            
            // 异步执行，不阻塞响应
            this.executeScheduledCheck().catch(error => {
                console.error('手动检测执行失败:', error.message);
            });

            return { 
                success: true, 
                message: '手动检测已开始执行' 
            };
        } catch (error) {
            console.error('触发手动检测失败:', error.message);
            return { 
                success: false, 
                message: error.message 
            };
        }
    }

    /**
     * 记录定时检测摘要日志
     */
    async logScheduledCheckSummary(summary) {
        try {
            const logData = {
                type: 'scheduled_check_summary',
                timestamp: new Date().toISOString(),
                ...summary
            };

            // 插入到系统日志表（创建一个简单的系统日志表）
            await this.createSystemLogsTable();
            
            this.db.prepare(`
                INSERT INTO system_logs (type, message, data) 
                VALUES (?, ?, ?)
            `).run(
                'scheduled_check', 
                `定时检测完成: 总数${summary.total}, 成功${summary.success}, 失败${summary.error}, 耗时${summary.duration}秒`,
                JSON.stringify(logData)
            );

        } catch (error) {
            console.error('记录定时检测摘要失败:', error.message);
        }
    }

    /**
     * 记录定时检测错误日志
     */
    async logScheduledCheckError(errorMessage) {
        try {
            await this.createSystemLogsTable();
            
            this.db.prepare(`
                INSERT INTO system_logs (type, message, data) 
                VALUES (?, ?, ?)
            `).run(
                'scheduled_check_error', 
                `定时检测执行失败: ${errorMessage}`,
                JSON.stringify({
                    type: 'scheduled_check_error',
                    timestamp: new Date().toISOString(),
                    error: errorMessage
                })
            );

        } catch (error) {
            console.error('记录定时检测错误失败:', error.message);
        }
    }

    /**
     * 创建系统日志表
     */
    async createSystemLogsTable() {
        try {
            const createTable = `
                CREATE TABLE IF NOT EXISTS system_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    data TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createIndex = `
                CREATE INDEX IF NOT EXISTS idx_system_logs_type ON system_logs(type)
            `;

            const createTimeIndex = `
                CREATE INDEX IF NOT EXISTS idx_system_logs_time ON system_logs(created_at)
            `;

            this.db.exec(createTable);
            this.db.exec(createIndex);
            this.db.exec(createTimeIndex);

        } catch (error) {
            // 忽略创建系统日志表的错误，不应影响主要功能
            console.warn('创建系统日志表失败:', error.message);
        }
    }

    /**
     * 获取检测历史
     */
    async getCheckHistory(limit = 50) {
        try {
            await this.createSystemLogsTable();
            
            const logs = this.db.prepare(`
                SELECT * FROM system_logs 
                WHERE type IN ('scheduled_check', 'scheduled_check_error')
                ORDER BY created_at DESC 
                LIMIT ?
            `).all(limit);

            return {
                success: true,
                data: logs.map(log => ({
                    id: log.id,
                    type: log.type,
                    message: log.message,
                    data: log.data ? JSON.parse(log.data) : null,
                    timestamp: log.created_at
                }))
            };
        } catch (error) {
            console.error('获取检测历史失败:', error.message);
            return {
                success: false,
                message: error.message,
                data: []
            };
        }
    }
}

module.exports = ScheduledCheckService;