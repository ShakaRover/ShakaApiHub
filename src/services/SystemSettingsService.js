/**
 * 系统设置服务
 * 管理系统级别的配置设置，包括时区配置
 */

const { timezoneManager } = require('../utils/TimezoneManager');
const databaseConfig = require('../config/database');

class SystemSettingsService {
    constructor() {
        this.settings = new Map();
        this.initialized = false;
    }

    /**
     * 初始化系统设置服务
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            // 从数据库加载设置
            await this.loadSettingsFromDatabase();
            
            // 初始化时区管理器
            const savedTimezone = this.settings.get('timezone');
            await timezoneManager.initialize(savedTimezone);
            
            this.initialized = true;
            console.log('系统设置服务初始化完成');
        } catch (error) {
            console.error('系统设置服务初始化失败:', error.message);
            throw error;
        }
    }

    /**
     * 从数据库加载设置
     * @private
     */
    async loadSettingsFromDatabase() {
        try {
            const statements = databaseConfig.getStatements();
            
            // 尝试从系统设置表加载设置
            // 如果表不存在，会使用默认设置
            const settingsData = await this.getSystemSettingsFromDb();
            
            if (settingsData && settingsData.length > 0) {
                settingsData.forEach(setting => {
                    this.settings.set(setting.key, setting.value);
                });
                console.log(`已加载 ${settingsData.length} 个系统设置`);
            } else {
                console.log('使用默认系统设置');
                await this.initializeDefaultSettings();
            }
        } catch (error) {
            console.warn('加载数据库设置失败，使用默认设置:', error.message);
            await this.initializeDefaultSettings();
        }
    }

    /**
     * 从数据库获取系统设置
     * @private
     */
    async getSystemSettingsFromDb() {
        return new Promise((resolve) => {
            try {
                const statements = databaseConfig.getStatements();
                if (statements.findAllSystemSettings) {
                    statements.findAllSystemSettings.all((err, rows) => {
                        if (err) {
                            resolve([]);
                        } else {
                            resolve(rows || []);
                        }
                    });
                } else {
                    resolve([]);
                }
            } catch (error) {
                resolve([]);
            }
        });
    }

    /**
     * 初始化默认设置
     * @private
     */
    async initializeDefaultSettings() {
        const defaultSettings = {
            timezone: 'Asia/Shanghai',
            dateFormat: 'YYYY-MM-DD',
            timeFormat: '24h',
            language: 'zh-CN',
            autoBackup: 'true',
            backupRetentionDays: '30',
            logRetentionDays: '30',
            logCleanupEnabled: 'true',
            logCleanupTime: '02:00',
            // 速率限制设置
            rateLimitGeneralTimeWindow: '5', // 分钟
            rateLimitGeneralMaxRequests: '200',
            rateLimitLoginTimeWindow: '5', // 分钟
            rateLimitLoginMaxAttempts: '10'
        };

        for (const [key, value] of Object.entries(defaultSettings)) {
            this.settings.set(key, value);
        }

        // 保存默认设置到数据库
        try {
            await this.saveSettingsToDatabase();
        } catch (error) {
            console.warn('保存默认设置失败:', error.message);
        }
    }

    /**
     * 获取设置值
     * @param {string} key - 设置键名
     * @param {any} defaultValue - 默认值
     * @returns {any} 设置值
     */
    getSetting(key, defaultValue = null) {
        if (!this.initialized) {
            console.warn('SystemSettingsService 尚未初始化');
            return defaultValue;
        }
        return this.settings.get(key) || defaultValue;
    }

    /**
     * 设置值
     * @param {string} key - 设置键名
     * @param {any} value - 设置值
     * @returns {Promise<boolean>} 是否设置成功
     */
    async setSetting(key, value) {
        if (!this.initialized) {
            throw new Error('SystemSettingsService 尚未初始化');
        }

        const oldValue = this.settings.get(key);
        this.settings.set(key, value);

        try {
            await this.saveSettingToDatabase(key, value);
            
            // 特殊处理时区设置
            if (key === 'timezone') {
                timezoneManager.setTimezone(value);
            }

            console.log(`设置已更新: ${key} = ${value} (旧值: ${oldValue})`);
            return true;
        } catch (error) {
            // 回滚更改
            if (oldValue !== undefined) {
                this.settings.set(key, oldValue);
            } else {
                this.settings.delete(key);
            }
            throw error;
        }
    }

    /**
     * 获取所有设置
     * @returns {Object} 所有设置的对象
     */
    getAllSettings() {
        if (!this.initialized) {
            throw new Error('SystemSettingsService 尚未初始化');
        }

        const settings = {};
        for (const [key, value] of this.settings.entries()) {
            settings[key] = value;
        }
        return settings;
    }

    /**
     * 获取时区相关设置
     * @returns {Object} 时区设置信息
     */
    getTimezoneSettings() {
        if (!this.initialized) {
            throw new Error('SystemSettingsService 尚未初始化');
        }

        return {
            current: timezoneManager.getCurrentTimezone(),
            info: timezoneManager.getTimezoneInfo(),
            available: timezoneManager.getGroupedTimezones()
        };
    }

    /**
     * 设置时区
     * @param {string} timezone - 时区值
     * @returns {Promise<boolean>} 是否设置成功
     */
    async setTimezone(timezone) {
        // 验证时区
        const validation = timezoneManager.validateTimezone(timezone);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        await this.setSetting('timezone', timezone);
        console.log(`时区已设置为: ${timezone} (${validation.formatted})`);
        return true;
    }

    /**
     * 保存单个设置到数据库
     * @private
     * @param {string} key - 设置键名
     * @param {any} value - 设置值
     */
    async saveSettingToDatabase(key, value) {
        return new Promise((resolve, reject) => {
            try {
                const statements = databaseConfig.getStatements();
                if (statements.upsertSystemSetting) {
                    statements.upsertSystemSetting.run(key, String(value), (err) => {
                        if (err) {
                            reject(new Error(`保存设置失败: ${err.message}`));
                        } else {
                            resolve();
                        }
                    });
                } else {
                    // 如果没有预编译语句，直接resolve（可能是表不存在）
                    resolve();
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 保存所有设置到数据库
     * @private
     */
    async saveSettingsToDatabase() {
        const promises = [];
        for (const [key, value] of this.settings.entries()) {
            promises.push(this.saveSettingToDatabase(key, value));
        }
        
        try {
            await Promise.all(promises);
            console.log('所有设置已保存到数据库');
        } catch (error) {
            console.warn('保存设置到数据库失败:', error.message);
        }
    }

    /**
     * 重置设置到默认值
     * @param {string[]} keys - 要重置的设置键名数组，如果为空则重置所有设置
     */
    async resetSettings(keys = []) {
        if (!this.initialized) {
            throw new Error('SystemSettingsService 尚未初始化');
        }

        const keysToReset = keys.length > 0 ? keys : Array.from(this.settings.keys());
        
        // 重新初始化默认设置
        await this.initializeDefaultSettings();
        
        // 特殊处理时区重置
        if (keysToReset.includes('timezone')) {
            const defaultTimezone = this.settings.get('timezone');
            timezoneManager.setTimezone(defaultTimezone);
        }

        console.log(`已重置 ${keysToReset.length} 个设置到默认值`);
    }

    /**
     * 导出设置配置
     * @returns {Object} 设置配置对象
     */
    exportSettings() {
        const settings = this.getAllSettings();
        return {
            settings,
            metadata: {
                exportTime: new Date().toISOString(),
                version: '1.0',
                timezone: timezoneManager.getCurrentTimezone()
            }
        };
    }

    /**
     * 导入设置配置
     * @param {Object} settingsData - 设置配置对象
     */
    async importSettings(settingsData) {
        if (!settingsData || !settingsData.settings) {
            throw new Error('无效的设置数据');
        }

        const imported = [];
        const errors = [];

        for (const [key, value] of Object.entries(settingsData.settings)) {
            try {
                await this.setSetting(key, value);
                imported.push(key);
            } catch (error) {
                errors.push({ key, error: error.message });
            }
        }

        return {
            imported: imported.length,
            errors: errors.length,
            details: { imported, errors }
        };
    }

    /**
     * 获取调试信息
     * @returns {Object} 调试信息
     */
    getDebugInfo() {
        return {
            initialized: this.initialized,
            settingsCount: this.settings.size,
            settings: this.getAllSettings(),
            timezone: timezoneManager.getDebugInfo()
        };
    }
}

// 创建单例实例
const systemSettingsService = new SystemSettingsService();

module.exports = {
    SystemSettingsService,
    systemSettingsService
};