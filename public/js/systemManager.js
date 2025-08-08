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

        // 日志清理相关事件
        this.bindLogCleanupEvents();
    }

    // 绑定日志清理事件
    bindLogCleanupEvents() {
        // 立即清理日志按钮
        document.getElementById('triggerManualCleanupBtn').addEventListener('click', () => {
            this.showManualCleanupModal();
        });

        // 查看清理统计按钮
        document.getElementById('viewCleanupStatsBtn').addEventListener('click', () => {
            this.showCleanupStatsModal();
        });

        // 手动清理模态框事件
        document.getElementById('manualLogCleanupModalClose').addEventListener('click', () => {
            this.hideManualCleanupModal();
        });
        document.getElementById('manualLogCleanupModalCancel').addEventListener('click', () => {
            this.hideManualCleanupModal();
        });
        document.getElementById('previewManualCleanupBtn').addEventListener('click', () => {
            this.previewManualCleanup();
        });
        document.getElementById('confirmManualCleanupBtn').addEventListener('click', () => {
            this.confirmManualCleanup();
        });

        // 清理统计模态框事件
        document.getElementById('logCleanupStatsModalClose').addEventListener('click', () => {
            this.hideCleanupStatsModal();
        });
        document.getElementById('logCleanupStatsModalCloseBtn').addEventListener('click', () => {
            this.hideCleanupStatsModal();
        });
        document.getElementById('refreshCleanupStatsBtn').addEventListener('click', () => {
            this.loadCleanupStats();
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
        this.loadLogCleanupStatus();
    }

    // 加载日志清理状态
    async loadLogCleanupStatus() {
        try {
            const response = await fetch('/api/system/log-cleanup/status');
            const result = await response.json();
            if (result.success) {
                this.updateLogCleanupStatusUI(result.data);
            } else {
                console.error('加载日志清理状态失败:', result.message);
            }
        } catch (error) {
            console.error('加载日志清理状态失败:', error);
        }
    }

    // 更新日志清理状态UI
    updateLogCleanupStatusUI(status) {
        // 服务状态
        const serviceStatusElement = document.getElementById('logCleanupServiceStatus');
        if (serviceStatusElement) {
            const isRunning = status.taskActive;
            serviceStatusElement.innerHTML = isRunning 
                ? '<span class="status-badge success">运行中</span>' 
                : '<span class="status-badge error">已停止</span>';
        }

        // 上次清理时间
        const lastRunElement = document.getElementById('lastLogCleanupTime');
        if (lastRunElement) {
            if (status.lastRun) {
                const lastRunTime = convertToSystemTimezone(status.lastRun);
                lastRunElement.textContent = lastRunTime;
            } else {
                lastRunElement.textContent = '未执行过';
            }
        }

        // 下次清理时间
        const nextRunElement = document.getElementById('nextLogCleanupTime');
        if (nextRunElement) {
            if (status.nextRun) {
                const nextRunTime = convertToSystemTimezone(status.nextRun);
                nextRunElement.textContent = nextRunTime;
            } else {
                nextRunElement.textContent = '未设定';
            }
        }

        // 当前保留天数
        const retentionElement = document.getElementById('currentRetentionDays');
        if (retentionElement) {
            retentionElement.textContent = `${status.retentionDays}天`;
        }
    }

    // 显示手动清理模态框
    showManualCleanupModal() {
        const modal = document.getElementById('manualLogCleanupModal');
        modal.style.display = 'flex';
        
        // 设置默认值为当前配置的保留天数
        const input = document.getElementById('manualCleanupRetentionDays');
        if (this.config && this.config.logRetentionDays) {
            input.value = this.config.logRetentionDays;
        } else {
            input.value = 30; // 默认值
        }
        
        // 重置状态
        document.getElementById('manualCleanupPreview').style.display = 'none';
        document.getElementById('confirmManualCleanupBtn').disabled = true;
    }

    // 隐藏手动清理模态框
    hideManualCleanupModal() {
        document.getElementById('manualLogCleanupModal').style.display = 'none';
    }

    // 预览手动清理
    async previewManualCleanup() {
        const retentionDays = parseInt(document.getElementById('manualCleanupRetentionDays').value);
        if (!retentionDays || retentionDays < 1) {
            this.showAlert('请输入有效的保留天数', 'error');
            return;
        }

        try {
            // 这里应该调用预览API，目前先模拟数据
            const response = await fetch('/api/system/log-cleanup/stats');
            const result = await response.json();
            
            if (result.success) {
                // 显示预览信息（这里应该有专门的预览API）
                document.getElementById('manualRecordsToDelete').textContent = '预计清理数量';
                document.getElementById('manualRecordsToKeep').textContent = '预计保留数量';
                document.getElementById('manualCleanupPreview').style.display = 'block';
                document.getElementById('confirmManualCleanupBtn').disabled = false;
            } else {
                this.showAlert('预览清理失败', 'error');
            }
        } catch (error) {
            console.error('预览清理失败:', error);
            this.showAlert('预览清理失败，请检查网络连接', 'error');
        }
    }

    // 确认手动清理
    async confirmManualCleanup() {
        const retentionDays = parseInt(document.getElementById('manualCleanupRetentionDays').value);
        if (!retentionDays || retentionDays < 1) {
            this.showAlert('请输入有效的保留天数', 'error');
            return;
        }

        // 显示加载状态
        const btnText = document.getElementById('manualCleanupBtnText');
        const btnLoading = document.getElementById('manualCleanupBtnLoading');
        const confirmBtn = document.getElementById('confirmManualCleanupBtn');
        
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-block';
        confirmBtn.disabled = true;

        try {
            const response = await fetch('/api/system/log-cleanup/trigger', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ retentionDays })
            });

            const result = await response.json();
            if (result.success) {
                this.showAlert(`日志清理成功：${result.message}`, 'success');
                this.hideManualCleanupModal();
                // 刷新状态
                this.loadLogCleanupStatus();
            } else {
                this.showAlert(`清理失败: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('手动清理失败:', error);
            this.showAlert('手动清理失败，请检查网络连接', 'error');
        } finally {
            // 恢复按钮状态
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            confirmBtn.disabled = false;
        }
    }

    // 显示清理统计模态框
    async showCleanupStatsModal() {
        const modal = document.getElementById('logCleanupStatsModal');
        modal.style.display = 'flex';
        await this.loadCleanupStats();
    }

    // 隐藏清理统计模态框
    hideCleanupStatsModal() {
        document.getElementById('logCleanupStatsModal').style.display = 'none';
    }

    // 加载清理统计
    async loadCleanupStats() {
        const loadingElement = document.getElementById('cleanupStatsLoading');
        const contentElement = document.getElementById('cleanupStatsContent');
        
        loadingElement.style.display = 'flex';
        contentElement.style.display = 'none';

        try {
            const response = await fetch('/api/system/log-cleanup/stats');
            const result = await response.json();
            
            if (result.success) {
                this.updateCleanupStatsUI(result.data);
                loadingElement.style.display = 'none';
                contentElement.style.display = 'block';
            } else {
                this.showAlert('加载清理统计失败', 'error');
            }
        } catch (error) {
            console.error('加载清理统计失败:', error);
            this.showAlert('加载清理统计失败，请检查网络连接', 'error');
        }
    }

    // 更新清理统计UI
    updateCleanupStatsUI(stats) {
        // 更新状态信息
        if (stats.status) {
            const status = stats.status;
            
            // 服务状态
            document.getElementById('statsServiceStatus').innerHTML = 
                status.taskActive ? '<span class="status-badge success">运行中</span>' 
                                  : '<span class="status-badge error">已停止</span>';
            
            // 时间信息
            document.getElementById('statsLastRun').textContent = 
                status.lastRun ? convertToSystemTimezone(status.lastRun) : '未执行过';
            document.getElementById('statsNextRun').textContent = 
                status.nextRun ? convertToSystemTimezone(status.nextRun) : '未设定';
        }

        // 总清理记录数
        document.getElementById('statsTotalDeleted').textContent = 
            stats.totalDeletedRecords || 0;

        // 最近清理历史
        const historyContainer = document.getElementById('cleanupHistoryList');
        if (stats.recentCleanups && stats.recentCleanups.length > 0) {
            historyContainer.innerHTML = '';
            stats.recentCleanups.forEach(cleanup => {
                const historyItem = this.createCleanupHistoryItem(cleanup);
                historyContainer.appendChild(historyItem);
            });
        } else {
            historyContainer.innerHTML = '<div class="no-data">暂无清理历史</div>';
        }
    }

    // 创建清理历史项
    createCleanupHistoryItem(cleanup) {
        const item = document.createElement('div');
        item.className = 'cleanup-history-item';
        
        const cleanupTime = convertToSystemTimezone(cleanup.created_at);
        const cleanupData = cleanup.data ? JSON.parse(cleanup.data) : {};
        const deletedCount = cleanupData.deleted || 0;
        const isManual = cleanup.action === 'manual_log_cleanup';
        
        item.innerHTML = `
            <div class="cleanup-info">
                <div class="cleanup-header">
                    <span class="cleanup-type ${isManual ? 'manual' : 'scheduled'}">${isManual ? '手动清理' : '定时清理'}</span>
                    <span class="cleanup-time">${cleanupTime}</span>
                </div>
                <div class="cleanup-details">
                    <span class="cleanup-deleted">清理了 ${deletedCount} 条记录</span>
                    ${cleanupData.retentionDays ? `<span class="cleanup-retention">保留 ${cleanupData.retentionDays} 天</span>` : ''}
                </div>
            </div>
        `;
        
        return item;
    }
}

// 创建全局实例
const systemManager = new SystemManager();