const fs = require('fs').promises;
const path = require('path');

class ConfigService {
    constructor() {
        this.configPath = path.join(__dirname, '../../config/system.json');
        this.defaultConfig = {
            timezone: 'Asia/Shanghai', // 默认北京时区
            logRetentionDays: 30,
            rateLimiting: {
                general: {
                    windowMs: 5 * 60 * 1000, // 5分钟
                    maxRequests: 200
                },
                login: {
                    windowMs: 5 * 60 * 1000, // 5分钟
                    maxAttempts: 10
                }
            }
        };
        this.config = null;
        this.initConfig();
    }

    async initConfig() {
        try {
            // 确保配置目录存在
            const configDir = path.dirname(this.configPath);
            await fs.mkdir(configDir, { recursive: true });
            
            // 尝试加载现有配置
            try {
                const configData = await fs.readFile(this.configPath, 'utf8');
                this.config = { ...this.defaultConfig, ...JSON.parse(configData) };
            } catch (error) {
                // 配置文件不存在，使用默认配置
                this.config = { ...this.defaultConfig };
                await this.saveConfig();
            }
        } catch (error) {
            console.error('初始化配置失败:', error);
            this.config = { ...this.defaultConfig };
        }
    }

    async getConfig() {
        if (!this.config) {
            await this.initConfig();
        }
        return { ...this.config };
    }

    async updateConfig(updates) {
        if (!this.config) {
            await this.initConfig();
        }
        
        this.config = { ...this.config, ...updates };
        await this.saveConfig();
        return { ...this.config };
    }

    async saveConfig() {
        try {
            await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
        } catch (error) {
            console.error('保存配置失败:', error);
            throw new Error('保存配置失败');
        }
    }

    // 获取时区配置
    getTimezone() {
        return this.config?.timezone || this.defaultConfig.timezone;
    }

    // 获取日志保留天数
    getLogRetentionDays() {
        return this.config?.logRetentionDays || this.defaultConfig.logRetentionDays;
    }

    // 获取速率限制配置
    getRateLimitingConfig() {
        return this.config?.rateLimiting || this.defaultConfig.rateLimiting;
    }

    // 获取支持的时区列表
    getSupportedTimezones() {
        // 常用时区列表
        return [
            { value: 'Asia/Shanghai', label: '北京时间 (UTC+8)', offset: '+08:00' },
            { value: 'UTC', label: '协调世界时 (UTC)', offset: '+00:00' },
            { value: 'America/New_York', label: '纽约时间 (UTC-5/-4)', offset: '-05:00' },
            { value: 'America/Los_Angeles', label: '洛杉矶时间 (UTC-8/-7)', offset: '-08:00' },
            { value: 'Europe/London', label: '伦敦时间 (UTC+0/+1)', offset: '+00:00' },
            { value: 'Europe/Paris', label: '巴黎时间 (UTC+1/+2)', offset: '+01:00' },
            { value: 'Asia/Tokyo', label: '东京时间 (UTC+9)', offset: '+09:00' },
            { value: 'Asia/Seoul', label: '首尔时间 (UTC+9)', offset: '+09:00' },
            { value: 'Asia/Hong_Kong', label: '香港时间 (UTC+8)', offset: '+08:00' },
            { value: 'Asia/Singapore', label: '新加坡时间 (UTC+8)', offset: '+08:00' },
            { value: 'Australia/Sydney', label: '悉尼时间 (UTC+10/+11)', offset: '+10:00' },
            { value: 'Asia/Dubai', label: '迪拜时间 (UTC+4)', offset: '+04:00' },
            { value: 'Europe/Berlin', label: '柏林时间 (UTC+1/+2)', offset: '+01:00' },
            { value: 'America/Chicago', label: '芝加哥时间 (UTC-6/-5)', offset: '-06:00' },
            { value: 'America/Denver', label: '丹佛时间 (UTC-7/-6)', offset: '-07:00' }
        ];
    }
}

module.exports = new ConfigService();