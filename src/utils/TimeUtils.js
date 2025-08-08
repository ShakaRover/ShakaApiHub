const moment = require('moment-timezone');
const configService = require('../services/ConfigService');

class TimeUtils {
    // 获取当前配置的时区
    static async getConfiguredTimezone() {
        try {
            const config = await configService.getConfig();
            return config.timezone || 'Asia/Shanghai';
        } catch (error) {
            console.error('获取时区配置失败:', error);
            return 'Asia/Shanghai'; // 默认北京时区
        }
    }

    // 将UTC时间转换为配置的时区时间
    static async convertToConfiguredTimezone(utcTime) {
        if (!utcTime) return null;
        
        try {
            const timezone = await this.getConfiguredTimezone();
            return moment.utc(utcTime).tz(timezone);
        } catch (error) {
            console.error('时区转换失败:', error);
            return moment.utc(utcTime);
        }
    }

    // 格式化时间为本地化字符串
    static async formatTimeForDisplay(utcTime, format = 'YYYY-MM-DD HH:mm:ss') {
        if (!utcTime) return '未知';
        
        try {
            const localTime = await this.convertToConfiguredTimezone(utcTime);
            return localTime.format(format);
        } catch (error) {
            console.error('时间格式化失败:', error);
            return moment.utc(utcTime).format(format);
        }
    }

    // 批量转换时间字段
    static async convertTimeFieldsInObject(obj, timeFields = []) {
        if (!obj || !Array.isArray(timeFields)) return obj;
        
        const convertedObj = { ...obj };
        
        for (const field of timeFields) {
            if (convertedObj[field]) {
                convertedObj[`${field}_formatted`] = await this.formatTimeForDisplay(convertedObj[field]);
                convertedObj[`${field}_local`] = await this.convertToConfiguredTimezone(convertedObj[field]);
            }
        }
        
        return convertedObj;
    }

    // 批量处理数组中的时间字段
    static async convertTimeFieldsInArray(array, timeFields = []) {
        if (!Array.isArray(array)) return array;
        
        return Promise.all(
            array.map(item => this.convertTimeFieldsInObject(item, timeFields))
        );
    }

    // 获取相对时间描述（如：2小时前）
    static async getRelativeTime(utcTime) {
        if (!utcTime) return '未知';
        
        try {
            const localTime = await this.convertToConfiguredTimezone(utcTime);
            return localTime.fromNow();
        } catch (error) {
            console.error('相对时间计算失败:', error);
            return moment.utc(utcTime).fromNow();
        }
    }

    // 同步版本的时区转换（用于前端）
    static convertToTimezoneSync(utcTime, timezone = 'Asia/Shanghai', format = 'YYYY-MM-DD HH:mm:ss') {
        if (!utcTime) return '未知';
        
        try {
            return moment.utc(utcTime).tz(timezone).format(format);
        } catch (error) {
            console.error('时区转换失败:', error);
            return moment.utc(utcTime).format(format);
        }
    }

    // 获取时区信息
    static getTimezoneInfo(timezone = 'Asia/Shanghai') {
        try {
            const now = moment().tz(timezone);
            return {
                timezone: timezone,
                offset: now.format('Z'),
                offsetMinutes: now.utcOffset(),
                isDST: now.isDST(),
                abbreviation: now.format('z')
            };
        } catch (error) {
            console.error('获取时区信息失败:', error);
            return {
                timezone: timezone,
                offset: '+08:00',
                offsetMinutes: 480,
                isDST: false,
                abbreviation: 'CST'
            };
        }
    }
}

module.exports = TimeUtils;