// 定时检测管理功能
class ScheduledCheckManager {
    constructor() {
        this.isLoading = false;
        this.init();
    }

    // 初始化
    init() {
        this.bindEvents();
    }

    // 绑定事件
    bindEvents() {
        // 定时检测配置按钮
        const configBtn = document.getElementById('scheduledCheckConfigBtn');
        if (configBtn) {
            configBtn.addEventListener('click', () => this.showConfigModal());
        }

        // 模态框关闭事件
        const modal = document.getElementById('scheduledCheckModal');
        const closeBtn = document.getElementById('scheduledCheckModalClose');
        const cancelBtn = document.getElementById('scheduledCheckModalCancel');
        
        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hideConfigModal());
            }
        });

        // 保存配置
        const saveBtn = document.getElementById('scheduledCheckModalSave');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveConfig());
        }

        // 快捷设置按钮
        const quickIntervalBtns = document.querySelectorAll('.quick-interval');
        quickIntervalBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const interval = parseInt(e.target.dataset.interval);
                document.getElementById('intervalMinutes').value = interval;
            });
        });

        // 立即执行检测
        const triggerBtn = document.getElementById('triggerManualCheckBtn');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', () => this.triggerManualCheck());
        }

        // 查看检测历史
        const historyBtn = document.getElementById('viewCheckHistoryBtn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => this.showHistoryModal());
        }

        // 检测历史模态框关闭事件
        const historyModal = document.getElementById('checkHistoryModal');
        const historyCloseBtn = document.getElementById('checkHistoryModalClose');
        const historyCloseBtn2 = document.getElementById('checkHistoryModalClose2');
        
        [historyCloseBtn, historyCloseBtn2].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hideHistoryModal());
            }
        });

        // 点击背景关闭模态框
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideConfigModal();
                }
            });
        }

        if (historyModal) {
            historyModal.addEventListener('click', (e) => {
                if (e.target === historyModal) {
                    this.hideHistoryModal();
                }
            });
        }
    }

    // 显示配置模态框
    async showConfigModal() {
        const modal = document.getElementById('scheduledCheckModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            // 加载当前配置
            await this.loadCurrentConfig();
        }
    }

    // 隐藏配置模态框
    hideConfigModal() {
        const modal = document.getElementById('scheduledCheckModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // 加载当前配置
    async loadCurrentConfig() {
        try {
            const response = await fetch('/api/scheduled-check/config', {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                this.updateConfigDisplay(result.data);
                this.populateConfigForm(result.data);
            } else {
                this.showAlert('加载配置失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('加载定时检测配置失败:', error);
            this.showAlert('加载配置失败', 'error');
        }
    }

    // 更新配置显示
    updateConfigDisplay(config) {
        // 更新服务状态
        const statusElement = document.getElementById('scheduledCheckStatus');
        if (statusElement) {
            const statusText = config.enabled ? '✅ 已启用' : '❌ 已禁用';
            const statusClass = config.enabled ? 'text-success' : 'text-danger';
            statusElement.innerHTML = `<span class="${statusClass}">${statusText}</span>`;
        }

        // 更新检测间隔
        const intervalElement = document.getElementById('currentInterval');
        if (intervalElement) {
            intervalElement.textContent = config.interval + ' 分钟';
        }

        // 更新运行时间
        const lastRunElement = document.getElementById('lastRunTime');
        if (lastRunElement) {
            if (config.lastRun) {
                const lastRun = new Date(config.lastRun);
                lastRunElement.textContent = lastRun.toLocaleString('zh-CN');
            } else {
                lastRunElement.textContent = '从未运行';
            }
        }

        const nextRunElement = document.getElementById('nextRunTime');
        if (nextRunElement) {
            if (config.nextRun) {
                const nextRun = new Date(config.nextRun);
                nextRunElement.textContent = nextRun.toLocaleString('zh-CN');
            } else {
                nextRunElement.textContent = '未安排';
            }
        }
    }

    // 填充配置表单
    populateConfigForm(config) {
        const intervalInput = document.getElementById('intervalMinutes');
        if (intervalInput) {
            intervalInput.value = config.interval || 15;
        }

        const enabledCheckbox = document.getElementById('scheduledCheckEnabled');
        if (enabledCheckbox) {
            enabledCheckbox.checked = config.enabled;
        }
    }

    // 保存配置
    async saveConfig() {
        if (this.isLoading) return;

        const intervalInput = document.getElementById('intervalMinutes');
        const enabledCheckbox = document.getElementById('scheduledCheckEnabled');

        const interval = parseInt(intervalInput.value);
        const enabled = enabledCheckbox.checked;

        // 输入验证
        if (isNaN(interval) || interval < 1 || interval > 1440) {
            this.showAlert('检测间隔必须在1-1440分钟之间', 'error');
            return;
        }

        this.setFormLoading(true);

        try {
            const response = await fetch('/api/scheduled-check/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ interval, enabled }),
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('定时检测配置已更新', 'success');
                this.hideConfigModal();
                
                // 重新加载配置显示
                await this.loadCurrentConfig();
            } else {
                this.showAlert(result.message, 'error');
            }
        } catch (error) {
            console.error('保存配置失败:', error);
            this.showAlert('保存配置失败', 'error');
        } finally {
            this.setFormLoading(false);
        }
    }

    // 设置表单加载状态
    setFormLoading(loading) {
        this.isLoading = loading;
        
        const saveBtn = document.getElementById('scheduledCheckModalSave');
        const saveText = document.getElementById('scheduledCheckModalSaveText');
        const saveLoading = document.getElementById('scheduledCheckModalSaveLoading');
        
        if (saveBtn) saveBtn.disabled = loading;
        if (saveText) saveText.style.display = loading ? 'none' : 'inline';
        if (saveLoading) saveLoading.style.display = loading ? 'inline' : 'none';
    }

    // 触发手动检测
    async triggerManualCheck() {
        try {
            this.showAlert('正在触发手动检测...', 'info');
            
            const response = await fetch('/api/scheduled-check/trigger', {
                method: 'POST',
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert(result.message, 'success');
            } else {
                this.showAlert(result.message, 'error');
            }
        } catch (error) {
            console.error('触发手动检测失败:', error);
            this.showAlert('触发手动检测失败', 'error');
        }
    }

    // 显示检测历史模态框
    async showHistoryModal() {
        const modal = document.getElementById('checkHistoryModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            // 加载历史记录
            await this.loadCheckHistory();
        }
    }

    // 隐藏检测历史模态框
    hideHistoryModal() {
        const modal = document.getElementById('checkHistoryModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // 加载检测历史
    async loadCheckHistory() {
        const loading = document.getElementById('historyLoading');
        const historyList = document.getElementById('checkHistoryList');

        if (loading) loading.style.display = 'flex';
        if (historyList) historyList.innerHTML = '';

        try {
            const response = await fetch('/api/scheduled-check/history?limit=20', {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                this.renderCheckHistory(result.data);
            } else {
                this.showHistoryError('加载历史记录失败: ' + result.message);
            }
        } catch (error) {
            console.error('加载检测历史失败:', error);
            this.showHistoryError('加载历史记录失败');
        } finally {
            if (loading) loading.style.display = 'none';
        }
    }

    // 渲染检测历史
    renderCheckHistory(history) {
        const historyList = document.getElementById('checkHistoryList');
        if (!historyList) return;

        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <div class="empty-text">暂无检测历史</div>
                    <div class="empty-description">系统还未执行过定时检测</div>
                </div>
            `;
            return;
        }

        const historyHtml = history.map(log => {
            const timestamp = new Date(log.timestamp).toLocaleString('zh-CN');
            const isError = log.type.includes('error');
            const statusClass = isError ? 'text-danger' : 'text-success';
            const statusIcon = isError ? '❌' : '✅';

            let detailsHtml = '';
            if (log.data && !isError) {
                const data = log.data;
                detailsHtml = `
                    <div class="history-details">
                        <span class="detail-item">总数: ${data.total}</span>
                        <span class="detail-item">成功: ${data.success}</span>
                        <span class="detail-item">失败: ${data.error}</span>
                        <span class="detail-item">耗时: ${data.duration}秒</span>
                    </div>
                `;
            }

            return `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-status ${statusClass}">
                            ${statusIcon} ${log.message}
                        </span>
                        <span class="history-time">${timestamp}</span>
                    </div>
                    ${detailsHtml}
                </div>
            `;
        }).join('');

        historyList.innerHTML = historyHtml;
    }

    // 显示历史记录错误
    showHistoryError(message) {
        const historyList = document.getElementById('checkHistoryList');
        if (historyList) {
            historyList.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">${message}</div>
                </div>
            `;
        }
    }

    // 显示提示消息
    showAlert(message, type = 'info') {
        // 使用现有的showAlert函数
        if (typeof showAlert === 'function') {
            showAlert(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// 全局实例
let scheduledCheckManager;

// 当页面加载完成后初始化定时检测管理器
document.addEventListener('DOMContentLoaded', () => {
    scheduledCheckManager = new ScheduledCheckManager();
    // 导出给全局使用
    window.scheduledCheckManager = scheduledCheckManager;
});