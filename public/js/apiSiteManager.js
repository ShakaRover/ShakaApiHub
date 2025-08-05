// API管理功能
class ApiSiteManager {
    constructor() {
        this.currentEditingId = null;
        this.apiSites = [];
        this.init();
    }

    // 初始化
    init() {
        this.bindEvents();
        this.loadApiSites();
        this.loadApiStats();
    }

    // 绑定事件
    bindEvents() {
        // 添加API站点按钮
        const addBtn = document.getElementById('addApiSiteBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }

        // 刷新列表按钮
        const refreshBtn = document.getElementById('refreshApiListBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshApiList());
        }

        // 模态框事件
        this.bindModalEvents();

        // API类型切换事件
        const apiTypeSelect = document.getElementById('apiSiteType');
        if (apiTypeSelect) {
            apiTypeSelect.addEventListener('change', (e) => this.handleApiTypeChange(e.target.value));
        }

        // 授权方式切换事件
        const authMethodSelect = document.getElementById('apiSiteAuthMethod');
        if (authMethodSelect) {
            authMethodSelect.addEventListener('change', (e) => {
                // 检查是否是AnyRouter + token的无效组合
                const apiTypeSelect = document.getElementById('apiSiteType');
                if (apiTypeSelect && apiTypeSelect.value === 'AnyRouter' && e.target.value === 'token') {
                    this.showAlert('AnyRouter只支持Sessions授权方式', 'error');
                    e.target.value = 'sessions';
                    this.handleAuthMethodChange('sessions');
                    return;
                }
                this.handleAuthMethodChange(e.target.value);
            });
        }

        // 事件委托 - 处理表格中的操作按钮
        const tableBody = document.getElementById('apiSitesTableBody');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => this.handleTableActions(e));
        }
    }

    // 处理表格操作按钮点击事件
    handleTableActions(e) {
        const button = e.target.closest('button');
        if (!button) return;

        const siteId = parseInt(button.dataset.siteId);
        const siteName = button.dataset.siteName;
        // 现在可以直接比较，因为Boolean()确保了"true"/"false"字符串
        const isEnabled = button.dataset.enabled === 'true';

        if (button.classList.contains('btn-edit')) {
            this.showEditModal(siteId);
        } else if (button.classList.contains('btn-toggle')) {
            this.toggleEnabled(siteId, !isEnabled);
        } else if (button.classList.contains('btn-delete')) {
            this.showDeleteModal(siteId, siteName);
        }
    }

    // 绑定模态框事件
    bindModalEvents() {
        const modal = document.getElementById('apiSiteModal');
        const closeBtn = document.getElementById('apiSiteModalClose');
        const cancelBtn = document.getElementById('apiSiteModalCancel');
        const form = document.getElementById('apiSiteForm');

        // 关闭模态框事件
        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hideModal());
            }
        });

        // 移除点击背景关闭模态框的功能，防止误点击关闭编辑窗口
        // 用户只能通过关闭按钮或取消按钮来关闭模态框
        if (modal) {
            modal.addEventListener('click', (e) => {
                // 如果点击的是模态框背景（不是内容区域），也不关闭，防止误操作
                // 只允许通过明确的按钮关闭
                e.stopPropagation();
            });
            
            // 防止模态框内容区域的点击事件冒泡到背景
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        }

        // 表单提交事件
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // 添加ESC键支持关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('apiSiteModal');
                const deleteModal = document.getElementById('confirmDeleteModal');
                
                if (modal && modal.classList.contains('show')) {
                    this.hideModal();
                } else if (deleteModal && deleteModal.classList.contains('show')) {
                    this.hideDeleteModal();
                }
            }
        });

        // 确认删除模态框事件
        this.bindDeleteModalEvents();
    }

    // 绑定删除确认模态框事件
    bindDeleteModalEvents() {
        const deleteModal = document.getElementById('confirmDeleteModal');
        const deleteCloseBtn = document.getElementById('confirmDeleteModalClose');
        const deleteCancelBtn = document.getElementById('confirmDeleteCancel');
        const deleteConfirmBtn = document.getElementById('confirmDeleteConfirm');

        [deleteCloseBtn, deleteCancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hideDeleteModal());
            }
        });

        // 删除确认模态框保持现有行为（可以点击背景关闭，因为这是确认操作，不涉及数据编辑）
        if (deleteModal) {
            deleteModal.addEventListener('click', (e) => {
                if (e.target === deleteModal) {
                    this.hideDeleteModal();
                }
            });
        }

        if (deleteConfirmBtn) {
            deleteConfirmBtn.addEventListener('click', () => this.confirmDelete());
        }
    }

    // 显示添加模态框
    showAddModal() {
        this.currentEditingId = null;
        document.getElementById('apiSiteModalTitle').textContent = '添加API站点';
        document.getElementById('apiSiteModalSaveText').textContent = '保存';
        this.resetForm();
        this.showModal();
    }

    // 显示编辑模态框
    showEditModal(id) {
        const site = this.apiSites.find(s => s.id === id);
        if (!site) return;

        this.currentEditingId = id;
        document.getElementById('apiSiteModalTitle').textContent = '编辑API站点';
        document.getElementById('apiSiteModalSaveText').textContent = '更新';
        this.fillForm(site);
        this.showModal();
    }

    // 显示模态框
    showModal() {
        const modal = document.getElementById('apiSiteModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    // 隐藏模态框
    hideModal() {
        const modal = document.getElementById('apiSiteModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
            this.resetForm();
        }
    }

    // 显示删除确认模态框
    showDeleteModal(id, name) {
        this.currentDeletingId = id;
        document.getElementById('deleteApiSiteName').textContent = name;
        const deleteModal = document.getElementById('confirmDeleteModal');
        if (deleteModal) {
            deleteModal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    // 隐藏删除确认模态框
    hideDeleteModal() {
        const deleteModal = document.getElementById('confirmDeleteModal');
        if (deleteModal) {
            deleteModal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // 重置表单
    resetForm() {
        const form = document.getElementById('apiSiteForm');
        if (form) {
            form.reset();
            document.getElementById('apiSiteEnabled').checked = true;
            this.handleAuthMethodChange('');
            this.handleApiTypeChange('');
        }
    }

    // 填充表单
    fillForm(site) {
        document.getElementById('apiSiteType').value = site.api_type || '';
        document.getElementById('apiSiteName').value = site.name || '';
        document.getElementById('apiSiteUrl').value = site.url || '';
        document.getElementById('apiSiteAuthMethod').value = site.auth_method || '';
        document.getElementById('apiSiteSessions').value = site.sessions || '';
        document.getElementById('apiSiteToken').value = site.token || '';
        document.getElementById('apiSiteUserId').value = site.user_id || '';
        document.getElementById('apiSiteEnabled').checked = Boolean(site.enabled);
        document.getElementById('apiSiteAutoCheckin').checked = Boolean(site.auto_checkin);
        
        this.handleAuthMethodChange(site.auth_method);
        this.handleApiTypeChange(site.api_type);
    }

    // 处理API类型变更
    handleApiTypeChange(apiType) {
        console.log('API类型变更为:', apiType);
        
        const autoCheckinGroup = document.getElementById('autoCheckinGroup');
        const autoCheckinInput = document.getElementById('apiSiteAutoCheckin');
        const authMethodSelect = document.getElementById('apiSiteAuthMethod');
        
        // 为AnyRouter设置默认值和显示签到选项
        if (apiType === 'AnyRouter') {
            const urlInput = document.getElementById('apiSiteUrl');
            
            // 设置默认URL
            if (urlInput && !urlInput.value) {
                urlInput.value = 'https://anyrouter.top';
            }
            
            // AnyRouter只支持sessions模式，禁用token选项
            if (authMethodSelect) {
                // 禁用token选项
                const tokenOption = authMethodSelect.querySelector('option[value="token"]');
                if (tokenOption) {
                    tokenOption.disabled = true;
                    tokenOption.textContent = 'Token (AnyRouter不支持)';
                }
                
                // 如果当前选择的是token，自动切换到sessions
                if (authMethodSelect.value === 'token') {
                    authMethodSelect.value = 'sessions';
                    this.handleAuthMethodChange('sessions');
                } else if (!authMethodSelect.value) {
                    // 设置默认授权方式为sessions
                    authMethodSelect.value = 'sessions';
                    this.handleAuthMethodChange('sessions');
                }
            }
            
            // 显示签到选项并默认启用
            if (autoCheckinGroup) {
                autoCheckinGroup.style.display = 'block';
            }
            if (autoCheckinInput) {
                autoCheckinInput.checked = true;
            }
        } else {
            // 恢复token选项
            if (authMethodSelect) {
                const tokenOption = authMethodSelect.querySelector('option[value="token"]');
                if (tokenOption) {
                    tokenOption.disabled = false;
                    tokenOption.textContent = 'Token';
                }
            }
            
            // 隐藏签到选项
            if (autoCheckinGroup) {
                autoCheckinGroup.style.display = 'none';
            }
            if (autoCheckinInput) {
                autoCheckinInput.checked = false;
            }
        }
    }

    // 处理授权方式变更
    handleAuthMethodChange(authMethod) {
        const sessionsGroup = document.getElementById('sessionsGroup');
        const tokenGroup = document.getElementById('tokenGroup');
        const userIdGroup = document.getElementById('userIdGroup');

        // 隐藏所有可选字段
        [sessionsGroup, tokenGroup, userIdGroup].forEach(group => {
            if (group) group.style.display = 'none';
        });

        // 根据授权方式显示相应字段
        if (authMethod === 'sessions') {
            if (sessionsGroup) sessionsGroup.style.display = 'block';
        } else if (authMethod === 'token') {
            if (tokenGroup) tokenGroup.style.display = 'block';
            if (userIdGroup) userIdGroup.style.display = 'block';
        }
    }

    // 处理表单提交
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            apiType: formData.get('apiType'),
            name: formData.get('name').trim(),
            url: formData.get('url').trim(),
            authMethod: formData.get('authMethod'),
            sessions: formData.get('sessions')?.trim() || null,
            token: formData.get('token')?.trim() || null,
            userId: formData.get('userId')?.trim() || null,
            enabled: formData.has('enabled'),
            autoCheckin: formData.has('autoCheckin')
        };

        // 客户端验证
        if (!this.validateFormData(data)) {
            return;
        }

        this.setFormLoading(true);

        try {
            let result;
            if (this.currentEditingId) {
                result = await this.updateApiSite(this.currentEditingId, data);
            } else {
                result = await this.createApiSite(data);
            }

            if (result.success) {
                this.showAlert(result.message, 'success');
                this.hideModal();
                this.loadApiSites();
                this.loadApiStats();
            } else {
                this.showAlert(result.message, 'error');
            }
        } catch (error) {
            console.error('表单提交失败:', error);
            this.showAlert('操作失败，请重试', 'error');
        } finally {
            this.setFormLoading(false);
        }
    }

    // 验证表单数据
    validateFormData(data) {
        if (!data.apiType) {
            this.showAlert('请选择API类型', 'error');
            return false;
        }

        if (!data.name) {
            this.showAlert('请输入站点名称', 'error');
            return false;
        }

        if (!data.url) {
            this.showAlert('请输入API地址', 'error');
            return false;
        }

        // URL格式验证
        try {
            new URL(data.url);
        } catch (error) {
            this.showAlert('请输入有效的URL地址', 'error');
            return false;
        }

        if (!data.authMethod) {
            this.showAlert('请选择授权方式', 'error');
            return false;
        }

        // AnyRouter只支持sessions模式
        if (data.apiType === 'AnyRouter' && data.authMethod === 'token') {
            this.showAlert('AnyRouter只支持Sessions授权方式', 'error');
            return false;
        }

        // 根据授权方式验证必填字段
        if (data.authMethod === 'sessions' && !data.sessions) {
            this.showAlert('Sessions授权方式必须提供sessions信息', 'error');
            return false;
        }

        if (data.authMethod === 'token') {
            if (!data.token) {
                this.showAlert('Token授权方式必须提供token信息', 'error');
                return false;
            }
            if (!data.userId) {
                this.showAlert('Token授权方式必须提供userId信息', 'error');
                return false;
            }
        }

        return true;
    }

    // 设置表单加载状态
    setFormLoading(loading) {
        const saveBtn = document.getElementById('apiSiteModalSave');
        const saveText = document.getElementById('apiSiteModalSaveText');
        const saveLoading = document.getElementById('apiSiteModalSaveLoading');
        
        if (saveBtn) saveBtn.disabled = loading;
        if (saveText) saveText.style.display = loading ? 'none' : 'inline';
        if (saveLoading) saveLoading.style.display = loading ? 'inline' : 'none';
    }

    // 加载API站点列表
    async loadApiSites() {
        try {
            const response = await fetch('/api/sites', {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                this.apiSites = result.data;
                this.renderApiSitesTable();
            } else {
                console.error('加载API站点失败:', result.message);
                this.showAlert('加载API站点失败', 'error');
            }
        } catch (error) {
            console.error('加载API站点失败:', error);
            this.showAlert('加载API站点失败', 'error');
        }
    }

    // 加载API统计
    async loadApiStats() {
        try {
            const response = await fetch('/api/sites/stats', {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                this.updateStatsDisplay(result.data);
            }
        } catch (error) {
            console.error('加载API统计失败:', error);
        }
    }

    // 更新统计显示
    updateStatsDisplay(stats) {
        const totalElement = document.getElementById('totalApiSites');
        const enabledElement = document.getElementById('enabledApiSites');
        const disabledElement = document.getElementById('disabledApiSites');
        const tokenElement = document.getElementById('tokenApiSites');

        if (totalElement) totalElement.textContent = stats.total || 0;
        if (enabledElement) enabledElement.textContent = stats.enabled || 0;
        if (disabledElement) disabledElement.textContent = stats.disabled || 0;
        
        // 计算Token授权方式数量
        const tokenCount = this.apiSites.filter(site => site.auth_method === 'token').length;
        if (tokenElement) tokenElement.textContent = tokenCount;
    }

    // 渲染API站点表格
    renderApiSitesTable() {
        const tbody = document.getElementById('apiSitesTableBody');
        if (!tbody) return;

        if (this.apiSites.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="8">
                        <div class="empty-message">
                            <div class="empty-icon">🔗</div>
                            <div class="empty-text">暂无API站点</div>
                            <div class="empty-description">点击上方"添加API站点"按钮开始添加</div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const rows = this.apiSites.map(site => this.createTableRow(site)).join('');
        tbody.innerHTML = rows;
    }

    // 创建表格行
    createTableRow(site) {
        const createdAt = new Date(site.created_at).toLocaleString('zh-CN');
        const apiTypeBadge = `<span class="api-type-badge api-type-${site.api_type.toLowerCase()}">${site.api_type}</span>`;
        const authMethodBadge = `<span class="auth-method-badge auth-method-${site.auth_method}">${site.auth_method === 'sessions' ? 'Sessions' : 'Token'}</span>`;
        const statusBadge = site.enabled 
            ? '<span class="status-badge status-enabled">✅ 启用</span>'
            : '<span class="status-badge status-disabled">❌ 禁用</span>';
        
        // 签到状态显示
        let checkinBadge = '<span class="checkin-badge checkin-disabled">❌ 未启用</span>';
        if (site.auto_checkin) {
            if (site.last_checkin) {
                const lastCheckin = new Date(site.last_checkin).toLocaleString('zh-CN');
                checkinBadge = `<span class="checkin-badge checkin-enabled" title="最后签到: ${lastCheckin}">✅ 已启用</span>`;
            } else {
                checkinBadge = '<span class="checkin-badge checkin-enabled">✅ 已启用</span>';
            }
        }

        return `
            <tr>
                <td>${apiTypeBadge}</td>
                <td>${this.escapeHtml(site.name)}</td>
                <td><span class="api-url" title="${this.escapeHtml(site.url)}">${this.escapeHtml(site.url)}</span></td>
                <td>${authMethodBadge}</td>
                <td>${statusBadge}</td>
                <td>${checkinBadge}</td>
                <td>${createdAt}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" 
                                data-site-id="${site.id}" 
                                data-site-name="${this.escapeHtml(site.name)}" 
                                title="编辑">
                            ✏️
                        </button>
                        <button class="btn-icon btn-toggle ${site.enabled ? 'enabled' : ''}" 
                                data-site-id="${site.id}" 
                                data-site-name="${this.escapeHtml(site.name)}" 
                                data-enabled="${Boolean(site.enabled)}"
                                title="${site.enabled ? '禁用' : '启用'}">
                            ${site.enabled ? '🔴' : '🟢'}
                        </button>
                        <button class="btn-icon btn-delete" 
                                data-site-id="${site.id}" 
                                data-site-name="${this.escapeHtml(site.name)}" 
                                title="删除">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    // 创建API站点
    async createApiSite(data) {
        const response = await fetch('/api/sites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return await response.json();
    }

    // 更新API站点
    async updateApiSite(id, data) {
        const response = await fetch(`/api/sites/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return await response.json();
    }

    // 切换启用状态
    async toggleEnabled(id, enabled) {
        try {
            const response = await fetch(`/api/sites/${id}/toggle`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled }),
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                this.showAlert(result.message, 'success');
                this.loadApiSites();
                this.loadApiStats();
            } else {
                this.showAlert(result.message, 'error');
            }
        } catch (error) {
            console.error('切换状态失败:', error);
            this.showAlert('操作失败', 'error');
        }
    }

    // 确认删除
    async confirmDelete() {
        if (!this.currentDeletingId) return;

        const deleteBtn = document.getElementById('confirmDeleteConfirm');
        const deleteText = document.getElementById('confirmDeleteText');
        const deleteLoading = document.getElementById('confirmDeleteLoading');

        // 设置加载状态
        if (deleteBtn) deleteBtn.disabled = true;
        if (deleteText) deleteText.style.display = 'none';
        if (deleteLoading) deleteLoading.style.display = 'inline';

        try {
            const response = await fetch(`/api/sites/${this.currentDeletingId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                this.showAlert(result.message, 'success');
                this.hideDeleteModal();
                this.loadApiSites();
                this.loadApiStats();
            } else {
                this.showAlert(result.message, 'error');
            }
        } catch (error) {
            console.error('删除失败:', error);
            this.showAlert('删除失败', 'error');
        } finally {
            // 恢复按钮状态
            if (deleteBtn) deleteBtn.disabled = false;
            if (deleteText) deleteText.style.display = 'inline';
            if (deleteLoading) deleteLoading.style.display = 'none';
        }
    }

    // 刷新API列表
    refreshApiList() {
        this.loadApiSites();
        this.loadApiStats();
        this.showAlert('列表已刷新', 'success');
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

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 全局实例
let apiSiteManager;

// 当页面加载完成后初始化API管理器
document.addEventListener('DOMContentLoaded', () => {
    apiSiteManager = new ApiSiteManager();
    // 导出给全局使用
    window.apiSiteManager = apiSiteManager;
});