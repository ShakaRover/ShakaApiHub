// 时区转换工具类
class TimezoneUtils {
    constructor() {
        this.currentTimezone = 'Asia/Shanghai'; // 默认时区
        this.loadCurrentTimezone();
    }

    // 加载当前配置的时区
    async loadCurrentTimezone() {
        try {
            const response = await fetch('/api/system/config');
            const result = await response.json();
            if (result.success && result.data.timezone) {
                this.currentTimezone = result.data.timezone;
            }
        } catch (error) {
            console.error('获取时区配置失败:', error);
        }
    }

    // 将UTC时间转换为配置的时区时间
    convertUTCToLocal(utcTimeString, format = 'YYYY-MM-DD HH:mm:ss') {
        if (!utcTimeString) return '未知';
        
        try {
            // 如果已经安装了moment和moment-timezone，使用它们
            if (typeof moment !== 'undefined' && moment.tz) {
                return moment.utc(utcTimeString).tz(this.currentTimezone).format(format);
            }
            
            // 否则使用原生JavaScript进行时区转换
            const date = new Date(utcTimeString);
            return date.toLocaleString('zh-CN', {
                timeZone: this.currentTimezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        } catch (error) {
            console.error('时区转换失败:', error);
            // 回退到本地时间
            return new Date(utcTimeString).toLocaleString('zh-CN');
        }
    }

    // 获取相对时间描述
    getRelativeTime(utcTimeString) {
        if (!utcTimeString) return '未知';
        
        try {
            const date = new Date(utcTimeString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHour = Math.floor(diffMin / 60);
            const diffDay = Math.floor(diffHour / 24);

            if (diffSec < 60) {
                return '刚刚';
            } else if (diffMin < 60) {
                return `${diffMin}分钟前`;
            } else if (diffHour < 24) {
                return `${diffHour}小时前`;
            } else if (diffDay < 7) {
                return `${diffDay}天前`;
            } else {
                return this.convertUTCToLocal(utcTimeString, 'MM-DD HH:mm');
            }
        } catch (error) {
            console.error('相对时间计算失败:', error);
            return new Date(utcTimeString).toLocaleString('zh-CN');
        }
    }

    // 获取当前时区信息
    getCurrentTimezone() {
        return this.currentTimezone;
    }

    // 更新时区配置
    updateTimezone(newTimezone) {
        this.currentTimezone = newTimezone;
    }
}

// 创建全局实例
const timezoneUtils = new TimezoneUtils();