/**
 * 时区配置和管理
 * 提供常用时区列表和时区操作功能
 */

// 常用时区列表，按地区分组
const TIMEZONE_GROUPS = {
    'Asia': {
        name: '亚洲',
        timezones: [
            { value: 'Asia/Shanghai', label: '中国标准时间 (UTC+8)', country: '中国' },
            { value: 'Asia/Hong_Kong', label: '香港标准时间 (UTC+8)', country: '香港' },
            { value: 'Asia/Taipei', label: '中华民国标准时间 (UTC+8)', country: '台湾' },
            { value: 'Asia/Tokyo', label: '日本标准时间 (UTC+9)', country: '日本' },
            { value: 'Asia/Seoul', label: '韩国标准时间 (UTC+9)', country: '韩国' },
            { value: 'Asia/Singapore', label: '新加坡标准时间 (UTC+8)', country: '新加坡' },
            { value: 'Asia/Bangkok', label: '泰国标准时间 (UTC+7)', country: '泰国' },
            { value: 'Asia/Dubai', label: '阿联酋标准时间 (UTC+4)', country: '阿联酋' },
            { value: 'Asia/Kolkata', label: '印度标准时间 (UTC+5:30)', country: '印度' }
        ]
    },
    'Europe': {
        name: '欧洲',
        timezones: [
            { value: 'Europe/London', label: '英国时间 (UTC+0/+1)', country: '英国' },
            { value: 'Europe/Paris', label: '中欧时间 (UTC+1/+2)', country: '法国' },
            { value: 'Europe/Berlin', label: '中欧时间 (UTC+1/+2)', country: '德国' },
            { value: 'Europe/Rome', label: '中欧时间 (UTC+1/+2)', country: '意大利' },
            { value: 'Europe/Moscow', label: '莫斯科标准时间 (UTC+3)', country: '俄罗斯' },
            { value: 'Europe/Amsterdam', label: '中欧时间 (UTC+1/+2)', country: '荷兰' }
        ]
    },
    'America': {
        name: '美洲',
        timezones: [
            { value: 'America/New_York', label: '美国东部时间 (UTC-5/-4)', country: '美国' },
            { value: 'America/Chicago', label: '美国中部时间 (UTC-6/-5)', country: '美国' },
            { value: 'America/Denver', label: '美国山地时间 (UTC-7/-6)', country: '美国' },
            { value: 'America/Los_Angeles', label: '美国太平洋时间 (UTC-8/-7)', country: '美国' },
            { value: 'America/Toronto', label: '加拿大东部时间 (UTC-5/-4)', country: '加拿大' },
            { value: 'America/Vancouver', label: '加拿大太平洋时间 (UTC-8/-7)', country: '加拿大' },
            { value: 'America/Sao_Paulo', label: '巴西利亚时间 (UTC-3)', country: '巴西' }
        ]
    },
    'Pacific': {
        name: '太平洋',
        timezones: [
            { value: 'Australia/Sydney', label: '澳大利亚东部时间 (UTC+10/+11)', country: '澳大利亚' },
            { value: 'Australia/Melbourne', label: '澳大利亚东部时间 (UTC+10/+11)', country: '澳大利亚' },
            { value: 'Australia/Perth', label: '澳大利亚西部时间 (UTC+8)', country: '澳大利亚' },
            { value: 'Pacific/Auckland', label: '新西兰标准时间 (UTC+12/+13)', country: '新西兰' }
        ]
    },
    'Other': {
        name: '其他',
        timezones: [
            { value: 'UTC', label: '协调世界时 (UTC+0)', country: '国际' },
            { value: 'GMT', label: '格林威治标准时间 (GMT)', country: '国际' }
        ]
    }
};

// 默认时区
const DEFAULT_TIMEZONE = 'Asia/Shanghai';

/**
 * 获取所有时区列表（扁平化）
 * @returns {Array} 时区数组
 */
function getAllTimezones() {
    const timezones = [];
    Object.values(TIMEZONE_GROUPS).forEach(group => {
        timezones.push(...group.timezones);
    });
    return timezones;
}

/**
 * 获取分组的时区列表
 * @returns {Object} 分组时区对象
 */
function getGroupedTimezones() {
    return TIMEZONE_GROUPS;
}

/**
 * 根据时区值获取时区信息
 * @param {string} timezone - 时区值
 * @returns {Object|null} 时区信息对象
 */
function getTimezoneInfo(timezone) {
    const allTimezones = getAllTimezones();
    return allTimezones.find(tz => tz.value === timezone) || null;
}

/**
 * 检查时区是否有效
 * @param {string} timezone - 时区值
 * @returns {boolean} 是否有效
 */
function isValidTimezone(timezone) {
    if (!timezone || typeof timezone !== 'string') {
        return false;
    }
    
    try {
        // 使用 Intl.DateTimeFormat 验证时区
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * 获取当前系统时区
 * @returns {string} 当前时区
 */
function getCurrentTimezone() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
    } catch (error) {
        return DEFAULT_TIMEZONE;
    }
}

/**
 * 格式化时区显示名称
 * @param {string} timezone - 时区值
 * @returns {string} 格式化的显示名称
 */
function formatTimezone(timezone) {
    const info = getTimezoneInfo(timezone);
    if (info) {
        return info.label;
    }
    
    // 如果不在预定义列表中，尝试格式化
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('zh-CN', {
            timeZone: timezone,
            timeZoneName: 'long'
        });
        const parts = formatter.formatToParts(now);
        const timeZonePart = parts.find(part => part.type === 'timeZoneName');
        return timeZonePart ? timeZonePart.value : timezone;
    } catch (error) {
        return timezone;
    }
}

/**
 * 获取时区偏移量
 * @param {string} timezone - 时区值
 * @returns {string} 偏移量字符串 (如 "+08:00")
 */
function getTimezoneOffset(timezone) {
    try {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const targetTime = new Date(utc + (getTimezoneOffsetMinutes(timezone) * 60000));
        
        const offset = getTimezoneOffsetMinutes(timezone);
        const hours = Math.floor(Math.abs(offset) / 60);
        const minutes = Math.abs(offset) % 60;
        const sign = offset >= 0 ? '+' : '-';
        
        return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
        return '+00:00';
    }
}

/**
 * 获取时区偏移分钟数
 * @private
 * @param {string} timezone - 时区值
 * @returns {number} 偏移分钟数
 */
function getTimezoneOffsetMinutes(timezone) {
    const now = new Date();
    const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return (localTime.getTime() - utcTime.getTime()) / 60000;
}

/**
 * 转换时间到指定时区
 * @param {Date|string} date - 要转换的时间
 * @param {string} timezone - 目标时区
 * @returns {Date} 转换后的时间
 */
function convertToTimezone(date, timezone) {
    const sourceDate = new Date(date);
    if (!isValidTimezone(timezone)) {
        return sourceDate;
    }
    
    try {
        return new Date(sourceDate.toLocaleString('en-US', { timeZone: timezone }));
    } catch (error) {
        return sourceDate;
    }
}

module.exports = {
    TIMEZONE_GROUPS,
    DEFAULT_TIMEZONE,
    getAllTimezones,
    getGroupedTimezones,
    getTimezoneInfo,
    isValidTimezone,
    getCurrentTimezone,
    formatTimezone,
    getTimezoneOffset,
    convertToTimezone
};