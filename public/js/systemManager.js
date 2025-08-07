// 系统管理器
class SystemManager {
    constructor() {
        this.config = null;
        this.timezones = [];
        this.init();
    }

    async init() {
        await this.loadConfig();
        await this.loadTimezones();
        this.bindEvents();
    }

    // 加载系统配置
    async loadConfig() {
        try {
            const response = await fetch('/api/system/config');
            const result = await response.json();
            if (result.success) {
                this.config = result.data;
                this.updateConfigUI();
            } else {
                console.error('加载系统配置失败:', result.message);
                this.showAlert('加载系统配置失败', 'error');
            }
        } catch (error) {
            console.error('加载系统配置失败:', error);
            this.showAlert('加载系统配置失败，请检查网络连接', 'error');
        }
    }

    // 加载时区列表
    async loadTimezones() {
        try {
            const response = await fetch('/api/system/timezones');
            const result = await response.json();
            if (result.success) {
                this.timezones = result.data;
                this.populateTimezoneSelect();
            }
        } catch (error) {
            console.error('加载时区列表失败:', error);
        }
    }

    // 加载系统状态
    async loadSystemStatus() {
        try {
            const response = await fetch('/api/system/status');
            const result = await response.json();
            if (result.success) {
                this.updateSystemStatus(result.data);
            }
        } catch (error) {
            console.error('加载系统状态失败:', error);
        }
    }

    // 更新系统状态显示
    updateSystemStatus(status) {
        // 运行时间
        const uptime = this.formatUptime(status.uptime);
        document.getElementById('systemUptime').textContent = uptime;

        // 内存使用
        document.getElementById('systemMemory').textContent = `${status.memory.used} MB`;

        // Node.js版本
        document.getElementById('nodeVersion').textContent = status.nodeVersion;

        // 当前时间
        const currentTime = new Date(status.currentTime).toLocaleString('zh-CN');
        document.getElementById('currentTime').textContent = currentTime;
    }

    // 格式化运行时间
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}天 ${hours}小时 ${minutes}分钟`;
        } else if (hours > 0) {
            return `${hours}小时 ${minutes}分钟`;
        } else {
            return `${minutes}分钟`;
        }
    }

    // 填充时区选择器
    populateTimezoneSelect() {
        const select = document.getElementById('timezoneSelect');
        select.innerHTML = '<option value="">请选择时区...</option>';
        
        this.timezones.forEach(tz => {
            const option = document.createElement('option');
            option.value = tz.value;
            option.textContent = tz.label;
            select.appendChild(option);
        });
    }

    // 更新配置UI
    updateConfigUI() {
        if (!this.config) return;

        // 时区
        const timezoneSelect = document.getElementById('timezoneSelect');
        if (timezoneSelect && this.config.timezone) {
            timezoneSelect.value = this.config.timezone;
        }

        // 日志保留天数
        const logRetentionDays = document.getElementById('logRetentionDays');
        if (logRetentionDays && this.config.logRetentionDays) {
            logRetentionDays.value = this.config.logRetentionDays;
        }

        // 速率限制
        if (this.config.rateLimiting) {
            const { general, login } = this.config.rateLimiting;
            
            if (general) {
                document.getElementById('generalTimeWindow').value = Math.floor(general.windowMs / (60 * 1000));
                document.getElementById('generalMaxRequests').value = general.maxRequests;
            }
            
            if (login) {
                document.getElementById('loginTimeWindow').value = Math.floor(login.windowMs / (60 * 1000));
                document.getElementById('loginMaxAttempts').value = login.maxAttempts;
            }
        }
    }

    // 绑定事件
    bindEvents() {
        // 时区配置表单
        document.getElementById('timezoneForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTimezoneConfig();
        });

        // 日志配置表单
        document.getElementById('logConfigForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveLogConfig();
        });

        // 速率限制配置表单
        document.getElementById('rateLimitForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRateLimitConfig();
        });
    }

    // 保存时区配置
    async saveTimezoneConfig() {
        const timezone = document.getElementById('timezoneSelect').value;
        if (!timezone) {
            this.showAlert('请选择一个时区', 'error');
            return;
        }

        try {
            const response = await fetch('/api/system/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ timezone })
            });

            const result = await response.json();
            if (result.success) {
                this.config = result.data;
                this.showAlert('时区配置保存成功', 'success');
            } else {
                this.showAlert(`保存失败: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('保存时区配置失败:', error);
            this.showAlert('保存时区配置失败，请检查网络连接', 'error');
        }
    }

    // 保存日志配置
    async saveLogConfig() {
        const logRetentionDays = parseInt(document.getElementById('logRetentionDays').value);
        if (!logRetentionDays || logRetentionDays < 1) {
            this.showAlert('日志保留天数必须是正整数', 'error');
            return;
        }

        try {
            const response = await fetch('/api/system/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ logRetentionDays })
            });

            const result = await response.json();
            if (result.success) {
                this.config = result.data;
                this.showAlert('日志配置保存成功', 'success');
            } else {
                this.showAlert(`保存失败: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('保存日志配置失败:', error);
            this.showAlert('保存日志配置失败，请检查网络连接', 'error');
        }
    }

    // 保存速率限制配置
    async saveRateLimitConfig() {
        const generalTimeWindow = parseInt(document.getElementById('generalTimeWindow').value);
        const generalMaxRequests = parseInt(document.getElementById('generalMaxRequests').value);
        const loginTimeWindow = parseInt(document.getElementById('loginTimeWindow').value);
        const loginMaxAttempts = parseInt(document.getElementById('loginMaxAttempts').value);

        if (!generalTimeWindow || !generalMaxRequests || !loginTimeWindow || !loginMaxAttempts) {
            this.showAlert('请填写所有必填字段', 'error');
            return;
        }

        const rateLimiting = {
            general: {
                windowMs: generalTimeWindow * 60 * 1000,
                maxRequests: generalMaxRequests
            },
            login: {
                windowMs: loginTimeWindow * 60 * 1000,
                maxAttempts: loginMaxAttempts
            }
        };

        try {
            const response = await fetch('/api/system/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rateLimiting })
            });

            const result = await response.json();
            if (result.success) {
                this.config = result.data;
                this.showAlert('速率限制配置保存成功', 'success');
            } else {
                this.showAlert(`保存失败: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('保存速率限制配置失败:', error);
            this.showAlert('保存速率限制配置失败，请检查网络连接', 'error');
        }
    }

    // 重置时区为默认值
    resetTimezone() {
        document.getElementById('timezoneSelect').value = 'Asia/Shanghai';
        this.showAlert('已重置为默认时区', 'info');
    }

    // 重置速率限制为默认值
    resetRateLimits() {
        document.getElementById('generalTimeWindow').value = 5;
        document.getElementById('generalMaxRequests').value = 200;
        document.getElementById('loginTimeWindow').value = 5;
        document.getElementById('loginMaxAttempts').value = 10;
        this.showAlert('已重置为默认速率限制', 'info');
    }

    // 显示提示信息
    showAlert(message, type = 'info') {
        // 创建提示元素
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        // 设置背景色
        switch (type) {
            case 'success':
                alert.style.backgroundColor = '#10b981';
                break;
            case 'error':
                alert.style.backgroundColor = '#ef4444';
                break;
            case 'warning':
                alert.style.backgroundColor = '#f59e0b';
                break;
            default:
                alert.style.backgroundColor = '#3b82f6';
        }

        document.body.appendChild(alert);

        // 3秒后自动移除
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 3000);
    }

    // 当页面切换到系统管理时调用
    onPageShow() {
        this.loadSystemStatus();
    }
}

// 创建全局实例
const systemManager = new SystemManager();