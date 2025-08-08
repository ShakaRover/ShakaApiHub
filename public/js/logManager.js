// 日志管理功能
class LogManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 20;
        this.filters = {
            type: 'all',
            search: '',
            startDate: '',
            endDate: ''
        };
        this.isLoading = false;
        this.init();
    }

    // 初始化
    init() {
        this.bindEvents();
    }

    // 绑定事件
    bindEvents() {
        // 刷新日志按钮
        const refreshBtn = document.getElementById('refreshLogsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshLogs());
        }

        // 清理日志按钮
        const cleanBtn = document.getElementById('cleanLogsBtn');
        if (cleanBtn) {
            cleanBtn.addEventListener('click', () => this.showCleanLogsModal());
        }

        // 筛选控件
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        }

        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }

        // 分页按钮
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => this.prevPage());
        }
        
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => this.nextPage());
        }

        // 清理日志模态框事件
        this.bindCleanLogsModalEvents();

        // Enter键搜索
        const searchInput = document.getElementById('logSearch');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.applyFilters();
                }
            });
        }
    }

    // 绑定清理日志模态框事件
    bindCleanLogsModalEvents() {
        const modal = document.getElementById('cleanLogsModal');
        const closeBtn = document.getElementById('cleanLogsModalClose');
        const cancelBtn = document.getElementById('cleanLogsModalCancel');
        const previewBtn = document.getElementById('previewCleanupBtn');
        const confirmBtn = document.getElementById('confirmCleanupBtn');

        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hideCleanLogsModal());
            }
        });

        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewCleanup());
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirmCleanup());
        }

        // 点击背景关闭模态框
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideCleanLogsModal();
                }
            });
        }
    }

    // 加载日志统计信息
    async loadLogStats() {
        try {
            const response = await fetch('/api/logs/stats', {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                this.updateStatsDisplay(result.data);
            } else {
                console.error('获取日志统计失败:', result.message);
            }
        } catch (error) {
            console.error('加载日志统计失败:', error);
        }
    }

    // 更新统计显示
    updateStatsDisplay(stats) {
        const elements = {
            systemLogCount: stats.systemLogs || 0,
            userLogCount: stats.userLogs || 0,
            apiLogCount: stats.apiLogs || 0,
            siteCheckLogCount: stats.siteCheckLogs || 0,
            recentErrorCount: stats.recentErrors || 0,
            todayRequestCount: stats.todayRequests || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value.toLocaleString();
            }
        });
    }

    // 加载日志列表
    async loadLogs() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading(true);

        try {
            const params = new URLSearchParams({
                type: this.filters.type,
                limit: this.pageSize,
                offset: (this.currentPage - 1) * this.pageSize,
                search: this.filters.search,
                startDate: this.filters.startDate,
                endDate: this.filters.endDate
            });

            const response = await fetch(`/api/logs/all?${params}`, {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                this.renderLogs(result.data);
                this.updatePagination(result.pagination);
            } else {
                this.showError('加载日志失败: ' + result.message);
            }
        } catch (error) {
            console.error('加载日志失败:', error);
            this.showError('加载日志失败');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    // 渲染日志列表
    renderLogs(logs) {
        const logsList = document.getElementById('logsList');
        if (!logsList) return;

        if (logs.length === 0) {
            logsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <div class="empty-text">暂无日志记录</div>
                    <div class="empty-description">没有找到符合条件的日志记录</div>
                </div>
            `;
            return;
        }

        const logsHtml = logs.map(log => this.createLogItem(log)).join('');
        logsList.innerHTML = logsHtml;
    }

    // 创建日志项
    createLogItem(log) {
        // 优先使用后端格式化的时间，如果没有则回退到本地格式化
        const timestamp = log.timestamp_formatted || 
                         log.created_at_formatted || 
                         log.check_time_formatted || 
                         new Date(log.timestamp || log.created_at || log.check_time).toLocaleString('zh-CN');
        const logTypeInfo = this.getLogTypeInfo(log.logType);
        
        let content = '';
        let details = '';

        switch (log.logType) {
            case 'system':
                content = log.message || log.type;
                if (log.data) {
                    details = this.formatLogDetails(log.data);
                }
                break;
            case 'user':
                content = `${log.username || '未知用户'} 执行了 ${log.action}`;
                if (log.resource_type) {
                    content += ` (${log.resource_type}${log.resource_id ? ': ' + log.resource_id : ''})`;
                }
                if (log.details) {
                    details = this.formatLogDetails(log.details);
                }
                break;
            case 'api':
                const statusClass = log.status_code >= 400 ? 'text-danger' : 
                                   log.status_code >= 300 ? 'text-warning' : 'text-success';
                content = `${log.method} ${log.endpoint}`;
                details = `
                    <div class="log-details">
                        <span class="detail-tag ${statusClass}">状态: ${log.status_code}</span>
                        ${log.response_time ? `<span class="detail-tag">响应时间: ${log.response_time}ms</span>` : ''}
                        ${log.username ? `<span class="detail-tag">用户: ${log.username}</span>` : ''}
                        ${log.ip_address ? `<span class="detail-tag">IP: ${log.ip_address}</span>` : ''}
                    </div>
                `;
                break;
            case 'site':
                const siteStatusClass = log.status === 'success' ? 'text-success' : 'text-danger';
                content = `站点检测: ${log.site_name || '未知站点'}`;
                details = `
                    <div class="log-details">
                        <span class="detail-tag ${siteStatusClass}">状态: ${log.status}</span>
                        ${log.message ? `<span class="detail-tag">消息: ${log.message}</span>` : ''}
                    </div>
                `;
                break;
        }

        return `
            <div class="log-item" data-log-type="${log.logType}">
                <div class="log-header">
                    <div class="log-type-badge ${logTypeInfo.class}">
                        ${logTypeInfo.icon} ${logTypeInfo.name}
                    </div>
                    <div class="log-timestamp">${timestamp}</div>
                </div>
                <div class="log-content">${content}</div>
                ${details ? `<div class="log-details-section">${details}</div>` : ''}
            </div>
        `;
    }

    // 获取日志类型信息
    getLogTypeInfo(logType) {
        const typeMap = {
            system: { name: '系统日志', icon: '🔧', class: 'log-system' },
            user: { name: '用户操作', icon: '👤', class: 'log-user' },
            api: { name: 'API请求', icon: '🌐', class: 'log-api' },
            site: { name: '站点检测', icon: '🔍', class: 'log-site' }
        };
        return typeMap[logType] || { name: '未知', icon: '❓', class: 'log-unknown' };
    }

    // 格式化日志详情
    formatLogDetails(data) {
        if (!data || typeof data !== 'object') return '';
        
        return Object.entries(data)
            .map(([key, value]) => `<span class="detail-tag">${key}: ${JSON.stringify(value)}</span>`)
            .join('');
    }

    // 更新分页信息
    updatePagination(pagination) {
        const paginationContainer = document.getElementById('logsPagination');
        const paginationInfo = document.getElementById('paginationInfo');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        if (!paginationContainer) return;

        paginationContainer.style.display = 'flex';
        
        if (paginationInfo) {
            const total = Math.ceil(pagination.total / this.pageSize);
            paginationInfo.textContent = `第 ${this.currentPage} 页，共 ${total} 页`;
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        if (nextBtn) {
            const hasNext = pagination.offset + pagination.limit < pagination.total;
            nextBtn.disabled = !hasNext;
        }
    }

    // 应用筛选
    applyFilters() {
        const logType = document.getElementById('logType')?.value || 'all';
        const search = document.getElementById('logSearch')?.value.trim() || '';
        const startDate = document.getElementById('startDate')?.value || '';
        const endDate = document.getElementById('endDate')?.value || '';

        this.filters = { type: logType, search, startDate, endDate };
        this.currentPage = 1;
        this.loadLogs();
    }

    // 清除筛选
    clearFilters() {
        document.getElementById('logType').value = 'all';
        document.getElementById('logSearch').value = '';
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        
        this.filters = { type: 'all', search: '', startDate: '', endDate: '' };
        this.currentPage = 1;
        this.loadLogs();
    }

    // 上一页
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadLogs();
        }
    }

    // 下一页
    nextPage() {
        this.currentPage++;
        this.loadLogs();
    }

    // 刷新日志
    refreshLogs() {
        this.currentPage = 1;
        this.loadLogs();
        this.loadLogStats();
    }

    // 显示清理日志模态框
    showCleanLogsModal() {
        const modal = document.getElementById('cleanLogsModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            // 重置表单
            document.getElementById('daysToKeep').value = '30';
            document.getElementById('cleanupPreview').style.display = 'none';
            document.getElementById('confirmCleanupBtn').disabled = true;
        }
    }

    // 隐藏清理日志模态框
    hideCleanLogsModal() {
        const modal = document.getElementById('cleanLogsModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // 预览清理
    async previewCleanup() {
        const daysToKeep = parseInt(document.getElementById('daysToKeep').value);
        
        if (isNaN(daysToKeep) || daysToKeep < 7 || daysToKeep > 365) {
            this.showAlert('保留天数必须在7-365天之间', 'error');
            return;
        }

        try {
            // 这里可以调用API获取预览信息，目前简化处理
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            // 显示预览
            document.getElementById('cleanupPreview').style.display = 'block';
            document.getElementById('recordsToDelete').textContent = '预估删除数量';
            document.getElementById('recordsToKeep').textContent = '预估保留数量';
            document.getElementById('confirmCleanupBtn').disabled = false;

            this.showAlert('预览完成，请确认后执行清理操作', 'info');
        } catch (error) {
            console.error('预览清理失败:', error);
            this.showAlert('预览失败', 'error');
        }
    }

    // 确认清理
    async confirmCleanup() {
        const daysToKeep = parseInt(document.getElementById('daysToKeep').value);
        
        if (!confirm(`确定要清理 ${daysToKeep} 天前的日志吗？此操作不可撤销！`)) {
            return;
        }

        this.setCleanupLoading(true);

        try {
            const response = await fetch('/api/logs/clean', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ daysToKeep }),
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert(`日志清理完成，删除了 ${result.deleted || 0} 条记录`, 'success');
                this.hideCleanLogsModal();
                this.refreshLogs();
            } else {
                this.showAlert(result.message, 'error');
            }
        } catch (error) {
            console.error('清理日志失败:', error);
            this.showAlert('清理日志失败', 'error');
        } finally {
            this.setCleanupLoading(false);
        }
    }

    // 设置清理按钮加载状态
    setCleanupLoading(loading) {
        const confirmBtn = document.getElementById('confirmCleanupBtn');
        const btnText = document.getElementById('cleanupBtnText');
        const btnLoading = document.getElementById('cleanupBtnLoading');

        if (confirmBtn) confirmBtn.disabled = loading;
        if (btnText) btnText.style.display = loading ? 'none' : 'inline';
        if (btnLoading) btnLoading.style.display = loading ? 'inline' : 'none';
    }

    // 显示加载状态
    showLoading(show) {
        const loading = document.getElementById('logsLoading');
        const logsList = document.getElementById('logsList');
        
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
        
        if (logsList && show) {
            logsList.innerHTML = '';
        }
    }

    // 显示错误
    showError(message) {
        const logsList = document.getElementById('logsList');
        if (logsList) {
            logsList.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">${message}</div>
                </div>
            `;
        }
    }

    // 显示提示消息
    showAlert(message, type = 'info') {
        if (typeof showAlert === 'function') {
            showAlert(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // 初始化日志管理页面
    async initLogPage() {
        console.log('初始化日志管理页面...');
        await this.loadLogStats();
        await this.loadLogs();
    }
}

// 全局实例
let logManager;

// 当页面加载完成后初始化日志管理器
document.addEventListener('DOMContentLoaded', () => {
    logManager = new LogManager();
    window.logManager = logManager;
});