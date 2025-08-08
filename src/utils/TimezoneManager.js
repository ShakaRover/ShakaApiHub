/**
 * 时区管理器
 * 提供系统时区设置和管理功能
 */

const {
    getAllTimezones,
    getGroupedTimezones,
    isValidTimezone,
    getCurrentTimezone,
    formatTimezone,
    getTimezoneOffset,
    DEFAULT_TIMEZONE
} = require('../config/timezones');

class TimezoneManager {
    constructor() {
        this.currentTimezone = null;
        this.initialized = false;
    }

    /**
     * 初始化时区管理器
     * @param {string} [savedTimezone] - 从数据库或配置文件加载的时区设置
     */
    async initialize(savedTimezone = null) {
        if (this.initialized) {
            return;
        }

        // 优先使用保存的时区设置，其次是系统时区，最后是默认时区
        const timezone = savedTimezone || getCurrentTimezone() || DEFAULT_TIMEZONE;
        
        if (isValidTimezone(timezone)) {
            this.currentTimezone = timezone;
        } else {
            console.warn(`无效的时区设置: ${timezone}，使用默认时区: ${DEFAULT_TIMEZONE}`);
            this.currentTimezone = DEFAULT_TIMEZONE;
        }

        this.initialized = true;
        console.log(`时区管理器初始化完成，当前时区: ${this.currentTimezone} (${this.formatCurrentTimezone()})`);
    }

    /**
     * 获取当前设置的时区
     * @returns {string} 当前时区
     */
    getCurrentTimezone() {
        if (!this.initialized) {
            throw new Error('TimezoneManager 尚未初始化');
        }
        return this.currentTimezone;
    }

    /**
     * 设置新的时区
     * @param {string} timezone - 新的时区
     * @returns {boolean} 设置是否成功
     */
    setTimezone(timezone) {
        if (!isValidTimezone(timezone)) {
            throw new Error(`无效的时区: ${timezone}`);
        }

        const oldTimezone = this.currentTimezone;
        this.currentTimezone = timezone;
        
        console.log(`时区已从 ${oldTimezone} 更改为 ${timezone}`);
        return true;
    }

    /**
     * 获取当前时区的格式化显示名称
     * @returns {string} 格式化的时区名称
     */
    formatCurrentTimezone() {
        return formatTimezone(this.currentTimezone);
    }

    /**
     * 获取当前时区的偏移量
     * @returns {string} 偏移量字符串
     */
    getCurrentTimezoneOffset() {
        return getTimezoneOffset(this.currentTimezone);
    }

    /**
     * 获取所有可用时区列表
     * @returns {Array} 时区列表
     */
    getAvailableTimezones() {
        return getAllTimezones();
    }

    /**
     * 获取分组的时区列表
     * @returns {Object} 分组时区对象
     */
    getGroupedTimezones() {
        return getGroupedTimezones();
    }

    /**
     * 格式化时间到当前设置的时区
     * @param {Date|string} date - 要格式化的时间
     * @param {Object} options - 格式化选项
     * @returns {string} 格式化的时间字符串
     */
    formatDateTime(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: this.currentTimezone,
            hour12: false
        };

        const formatOptions = { ...defaultOptions, ...options };
        
        try {
            return new Date(date).toLocaleString('zh-CN', formatOptions);
        } catch (error) {
            console.error('时间格式化失败:', error.message);
            return new Date(date).toLocaleString();
        }
    }

    /**
     * 获取当前时区的当前时间
     * @returns {Date} 当前时间
     */
    getCurrentTime() {
        const now = new Date();
        try {
            // 创建一个表示当前时区时间的Date对象
            const timeString = now.toLocaleString('en-US', { timeZone: this.currentTimezone });
            return new Date(timeString);
        } catch (error) {
            console.error('获取当前时区时间失败:', error.message);
            return now;
        }
    }

    /**
     * 转换UTC时间到当前时区
     * @param {Date|string} utcDate - UTC时间
     * @returns {Date} 转换后的本地时间
     */
    convertFromUTC(utcDate) {
        const utc = new Date(utcDate);
        try {
            const localString = utc.toLocaleString('en-US', { timeZone: this.currentTimezone });
            return new Date(localString);
        } catch (error) {
            console.error('UTC时间转换失败:', error.message);
            return utc;
        }
    }

    /**
     * 转换本地时间到UTC
     * @param {Date|string} localDate - 本地时间
     * @returns {Date} UTC时间
     */
    convertToUTC(localDate) {
        const local = new Date(localDate);
        try {
            // 获取时区偏移量并计算UTC时间
            const utcString = local.toLocaleString('en-US', { timeZone: 'UTC' });
            const localString = local.toLocaleString('en-US', { timeZone: this.currentTimezone });
            
            const utcTime = new Date(utcString).getTime();
            const localTime = new Date(localString).getTime();
            const offset = localTime - utcTime;
            
            return new Date(local.getTime() - offset);
        } catch (error) {
            console.error('本地时间转UTC失败:', error.message);
            return local;
        }
    }

    /**
     * 获取时区信息摘要
     * @returns {Object} 时区信息
     */
    getTimezoneInfo() {
        return {
            current: this.currentTimezone,
            formatted: this.formatCurrentTimezone(),
            offset: this.getCurrentTimezoneOffset(),
            currentTime: this.formatDateTime(new Date()),
            isValid: isValidTimezone(this.currentTimezone)
        };
    }

    /**
     * 验证时区设置
     * @param {string} timezone - 要验证的时区
     * @returns {Object} 验证结果
     */
    validateTimezone(timezone) {
        const isValid = isValidTimezone(timezone);
        const result = {
            isValid,
            timezone,
            error: null
        };

        if (!isValid) {
            result.error = `无效的时区: ${timezone}`;
        } else {
            result.formatted = formatTimezone(timezone);
            result.offset = getTimezoneOffset(timezone);
        }

        return result;
    }

    /**
     * 重置时区到系统默认值
     */
    resetToSystemDefault() {
        const systemTimezone = getCurrentTimezone();
        this.setTimezone(systemTimezone);
        console.log(`时区已重置为系统默认值: ${systemTimezone}`);
    }

    /**
     * 获取调试信息
     * @returns {Object} 调试信息
     */
    getDebugInfo() {
        return {
            initialized: this.initialized,
            currentTimezone: this.currentTimezone,
            systemTimezone: getCurrentTimezone(),
            defaultTimezone: DEFAULT_TIMEZONE,
            currentTime: this.formatDateTime(new Date()),
            info: this.getTimezoneInfo()
        };
    }
}

// 创建单例实例
const timezoneManager = new TimezoneManager();

module.exports = {
    TimezoneManager,
    timezoneManager
};