// API管理功能
class ApiSiteManager {
    constructor() {
        this.currentEditingId = null;
        this.apiSites = [];
        this.filteredApiSites = []; // 过滤后的站点列表
        this.searchTerm = ''; // 搜索关键字
        this.showDetails = false; // 全局显示详情开关
        this.expandedSites = new Set(); // 记录展开的站点ID
        
        // DOM缓存机制
        this.domCache = new Map();
        
        // 按钮处理器映射
        this.buttonHandlers = new Map([
            ['btn-edit', (siteId, siteName) => this.showEditModal(siteId)],
            ['btn-check', (siteId, siteName) => this.checkSite(siteId, siteName)],
            ['btn-topup', (siteId, siteName) => this.showTopupModal(siteId, siteName)],
            ['btn-toggle', (siteId, siteName, button) => {
                const isEnabled = button.dataset.enabled === 'true';
                this.toggleEnabled(siteId, !isEnabled);
            }],
            ['btn-delete', (siteId, siteName) => this.showDeleteModal(siteId, siteName)],
            ['btn-expand', (siteId) => this.toggleSiteDetails(siteId)],
            ['btn-copy-aff', (siteId, siteName, button) => {
                this.copyAffiliateLink(button.dataset.siteUrl, button.dataset.affCode);
            }],
            ['btn-refresh-tokens', (siteId) => this.refreshTokens(siteId)],
            ['btn-delete-all-tokens', (siteId) => this.deleteAllTokens(siteId)],
            ['btn-auto-create-tokens', (siteId) => this.autoCreateTokens(siteId)],
            ['btn-refresh-models', (siteId) => this.refreshModels(siteId)],
            ['btn-toggle-token', (siteId, siteName, button) => {
                const tokenId = parseInt(button.dataset.tokenId);
                const newStatus = parseInt(button.dataset.newStatus);
                this.toggleToken(siteId, tokenId, newStatus);
            }],
            ['btn-delete-token', (siteId, siteName, button) => {
                const tokenId = parseInt(button.dataset.tokenId);
                this.deleteToken(siteId, tokenId);
            }]
        ]);
        
        this.init();
    }

    // DOM缓存工具方法
    getElement(id) {
        if (!this.domCache.has(id)) {
            this.domCache.set(id, document.getElementById(id));
        }
        return this.domCache.get(id);
    }

    // 清除DOM缓存（在需要时调用）
    clearDomCache() {
        this.domCache.clear();
    }

    // 统一异步操作处理
    async handleAsyncOperation(operation, errorMessage, showLoadingAlert = true) {
        try {
            if (showLoadingAlert) {
                // 可以在这里添加通用的加载提示逻辑
            }
            return await operation();
        } catch (error) {
            console.error(errorMessage, error);
            this.showAlert(`${errorMessage}: ${error.message}`, 'error');
            throw error;
        }
    }

    // 统一按钮状态管理
    setButtonLoadingState(buttonId, loading, textElementId = null, loadingElementId = null) {
        const btn = this.getElement(buttonId);
        if (btn) btn.disabled = loading;
        
        if (textElementId) {
            const textEl = this.getElement(textElementId);
            if (textEl) textEl.style.display = loading ? 'none' : 'inline';
        }
        
        if (loadingElementId) {
            const loadingEl = this.getElement(loadingElementId);
            if (loadingEl) loadingEl.style.display = loading ? 'inline' : 'none';
        }
    }

    // 初始化
    init() {
        this.bindEvents();
        this.loadApiSites();
        this.loadApiStats();
        // 初始化过滤数组
        this.filteredApiSites = this.apiSites;
    }

    // 绑定事件
    bindEvents() {
        // 添加API站点按钮
        const addBtn = this.getElement('addApiSiteBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }

        // 一键检查按钮
        const batchCheckBtn = this.getElement('batchCheckBtn');
        if (batchCheckBtn) {
            batchCheckBtn.addEventListener('click', () => this.batchCheckAllSites());
        }

        // 显示详情开关
        const showDetailsToggle = this.getElement('showDetailsToggle');
        if (showDetailsToggle) {
            showDetailsToggle.addEventListener('change', (e) => this.toggleAllDetails(e.target.checked));
        }

        // 搜索功能
        const searchInput = this.getElement('apiSiteSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // 过滤器功能
        const filters = ['apiTypeFilter', 'enabledStatusFilter', 'checkinStatusFilter', 'checkStatusFilter'];
        filters.forEach(filterId => {
            const filter = this.getElement(filterId);
            if (filter) {
                filter.addEventListener('change', () => this.applyFilters());
            }
        });

        // 模态框事件
        this.bindModalEvents();

        // API类型切换事件
        const apiTypeSelect = this.getElement('apiSiteType');
        if (apiTypeSelect) {
            apiTypeSelect.addEventListener('change', (e) => this.handleApiTypeChange(e.target.value));
        }

        // 授权方式切换事件
        const authMethodSelect = this.getElement('apiSiteAuthMethod');
        if (authMethodSelect) {
            authMethodSelect.addEventListener('change', (e) => {
                // 检查是否是AnyRouter + token的无效组合
                const apiTypeSelect = this.getElement('apiSiteType');
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
        const tableBody = this.getElement('apiSitesTableBody');
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
        
        // 验证 siteId 是否有效
        if (!siteId || isNaN(siteId)) {
            console.error('无效的站点ID:', button.dataset.siteId);
            this.showAlert('操作失败：无效的站点ID', 'error');
            return;
        }
        
        // 查找匹配的处理器
        for (const [className, handler] of this.buttonHandlers) {
            if (button.classList.contains(className)) {
                try {
                    handler(siteId, siteName, button);
                } catch (error) {
                    console.error(`按钮处理器执行失败 [${className}]:`, error);
                    this.showAlert('操作执行失败', 'error');
                }
                return;
            }
        }
        
        // 如果没有找到处理器，记录警告
        console.warn('未找到匹配的按钮处理器:', Array.from(button.classList));
    }

    // 绑定模态框事件
    bindModalEvents() {
        const modal = this.getElement('apiSiteModal');
        const closeBtn = this.getElement('apiSiteModalClose');
        const cancelBtn = this.getElement('apiSiteModalCancel');
        const form = this.getElement('apiSiteForm');

        // 关闭模态框事件
        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hideModal());
            }
        });

        // 移除点击背景关闭模态框的功能，防止误点击关闭编辑窗口
        if (modal) {
            modal.addEventListener('click', (e) => {
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
                const modal = this.getElement('apiSiteModal');
                const deleteModal = this.getElement('confirmDeleteModal');
                
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
        const deleteModal = this.getElement('confirmDeleteModal');
        const deleteCloseBtn = this.getElement('confirmDeleteModalClose');
        const deleteCancelBtn = this.getElement('confirmDeleteCancel');
        const deleteConfirmBtn = this.getElement('confirmDeleteConfirm');

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
            
            // 设置默认值
            const authMethodSelect = document.getElementById('apiSiteAuthMethod');
            const apiTypeSelect = document.getElementById('apiSiteType');
            
            // 设置API类型默认为NewApi
            if (apiTypeSelect) {
                apiTypeSelect.value = 'NewApi';
            }
            
            // 设置授权方式默认为Token（除非是AnyRouter）
            if (authMethodSelect) {
                authMethodSelect.value = 'token';
                this.handleAuthMethodChange('token');
            }
            
            // 触发API类型变更处理
            this.handleApiTypeChange('NewApi');
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
                } else {
                    // 重新触发授权方式变更以显示User ID字段
                    this.handleAuthMethodChange(authMethodSelect.value);
                }
            }
            
            // 显示签到选项并默认启用
            if (autoCheckinGroup) {
                autoCheckinGroup.style.display = 'block';
            }
            if (autoCheckinInput) {
                autoCheckinInput.checked = true;
            }
        } else if (apiType === 'Veloera') {
            // 为Veloera设置默认值和显示签到选项
            const urlInput = document.getElementById('apiSiteUrl');
            
            // 设置默认URL（如果需要的话）
            if (urlInput && !urlInput.value) {
                // 可以设置Veloera的默认URL，如果有的话
                // urlInput.value = 'https://veloera.example.com';
            }
            
            // Veloera支持所有授权方式，恢复token选项并设置为默认
            if (authMethodSelect) {
                const tokenOption = authMethodSelect.querySelector('option[value="token"]');
                if (tokenOption) {
                    tokenOption.disabled = false;
                    tokenOption.textContent = 'Token';
                }
                
                // 如果没有选择授权方式，设置默认为token
                if (!authMethodSelect.value) {
                    authMethodSelect.value = 'token';
                    this.handleAuthMethodChange('token');
                } else {
                    // 重新触发授权方式变更
                    this.handleAuthMethodChange(authMethodSelect.value);
                }
            }
            
            // 显示签到选项并默认启用
            if (autoCheckinGroup) {
                autoCheckinGroup.style.display = 'block';
            }
            if (autoCheckinInput) {
                autoCheckinInput.checked = true;
            }
        } else if (apiType === 'NewApi' || !apiType) {
            // NewApi类型或其他未指定类型，恢复token选项并设置为默认
            if (authMethodSelect) {
                const tokenOption = authMethodSelect.querySelector('option[value="token"]');
                if (tokenOption) {
                    tokenOption.disabled = false;
                    tokenOption.textContent = 'Token';
                }
                
                // 如果没有选择授权方式，设置默认为token
                if (!authMethodSelect.value) {
                    authMethodSelect.value = 'token';
                    this.handleAuthMethodChange('token');
                } else {
                    // 重新触发授权方式变更以隐藏不必要的字段
                    this.handleAuthMethodChange(authMethodSelect.value);
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
        const apiTypeSelect = document.getElementById('apiSiteType');

        // 隐藏所有可选字段
        [sessionsGroup, tokenGroup, userIdGroup].forEach(group => {
            if (group) group.style.display = 'none';
        });

        // 根据授权方式显示相应字段
        if (authMethod === 'sessions') {
            if (sessionsGroup) sessionsGroup.style.display = 'block';
            
            // AnyRouter类型的sessions模式也需要显示User ID字段
            if (apiTypeSelect && apiTypeSelect.value === 'AnyRouter') {
                if (userIdGroup) userIdGroup.style.display = 'block';
            }
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

        // AnyRouter必须提供User ID
        if (data.apiType === 'AnyRouter' && !data.userId) {
            this.showAlert('AnyRouter类型必须提供User ID信息', 'error');
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
        return this.handleAsyncOperation(async () => {
            const response = await fetch('/api/sites', {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                this.apiSites = result.data;
                this.filterApiSites(); // 应用当前搜索过滤
                this.renderApiSitesTable();
            } else {
                throw new Error(result.message || '加载失败');
            }
        }, '加载API站点失败', false);
    }

    // 加载API统计
    async loadApiStats() {
        return this.handleAsyncOperation(async () => {
            const response = await fetch('/api/sites/stats', {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                this.updateStatsDisplay(result.data);
            } else {
                throw new Error(result.message || '加载统计失败');
            }
        }, '加载API统计失败', false);
    }

    // 更新统计显示
    updateStatsDisplay(stats) {
        const totalElement = this.getElement('totalApiSites');
        const enabledElement = this.getElement('enabledApiSites');
        const disabledElement = this.getElement('disabledApiSites');

        if (totalElement) totalElement.textContent = stats.total || 0;
        if (enabledElement) enabledElement.textContent = stats.enabled || 0;
        if (disabledElement) disabledElement.textContent = stats.disabled || 0;
    }

    // 处理搜索
    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase().trim();
        this.applyFilters();
    }

    // 应用所有过滤条件
    applyFilters() {
        this.filteredApiSites = this.apiSites.filter(site => {
            // 搜索过滤
            if (this.searchTerm) {
                const name = site.name.toLowerCase();
                const url = site.url.toLowerCase();
                const apiType = site.api_type.toLowerCase();
                
                const matchesSearch = name.includes(this.searchTerm) || 
                                    url.includes(this.searchTerm) || 
                                    apiType.includes(this.searchTerm);
                
                if (!matchesSearch) return false;
            }

            // API类型过滤
            const apiTypeFilter = this.getElement('apiTypeFilter')?.value;
            if (apiTypeFilter && site.api_type !== apiTypeFilter) {
                return false;
            }

            // 启用状态过滤
            const enabledStatusFilter = this.getElement('enabledStatusFilter')?.value;
            if (enabledStatusFilter) {
                const isEnabled = site.enabled === 1;
                if (enabledStatusFilter === 'enabled' && !isEnabled) return false;
                if (enabledStatusFilter === 'disabled' && isEnabled) return false;
            }

            // 签到状态过滤
            const checkinStatusFilter = this.getElement('checkinStatusFilter')?.value;
            if (checkinStatusFilter) {
                const checkinEnabled = site.auto_checkin === 1;
                if (checkinStatusFilter === 'enabled' && !checkinEnabled) return false;
                if (checkinStatusFilter === 'disabled' && checkinEnabled) return false;
            }

            // 最后检测状态过滤
            const checkStatusFilter = this.getElement('checkStatusFilter')?.value;
            if (checkStatusFilter) {
                const checkStatus = site.last_check_status || 'pending';
                if (checkStatusFilter !== checkStatus) return false;
            }

            return true;
        });

        this.renderApiSitesTable();
    }

    // 过滤API站点（保留向后兼容）
    filterApiSites() {
        this.applyFilters();
    }

    // 通用模板系统
    createTemplate(templateName, data) {
        const templates = {
            emptyState: ({ icon, text, description, colspan = 7 }) => `
                <tr class="empty-state">
                    <td colspan="${colspan}">
                        <div class="empty-message">
                            <div class="empty-icon">${icon}</div>
                            <div class="empty-text">${text}</div>
                            <div class="empty-description">${description}</div>
                        </div>
                    </td>
                </tr>
            `,
            
            tokenAction: ({ siteId, className, title, icon, text }) => `
                <button class="btn-small btn-secondary ${className}" 
                        data-site-id="${siteId}" 
                        title="${title}">
                    ${icon} ${text}
                </button>
            `,
            
            modelAction: ({ siteId, className, title, icon, text }) => `
                <button class="btn-small btn-secondary ${className}" 
                        data-site-id="${siteId}" 
                        title="${title}">
                    ${icon} ${text}
                </button>
            `,
            
            statusBadge: ({ enabled, title = '' }) => {
                const statusClass = enabled ? 'status-enabled' : 'status-disabled';
                const statusIcon = enabled ? '✅' : '❌';
                const statusTitle = title || (enabled ? '已启用' : '已禁用');
                return `<span class="status-badge ${statusClass}" title="${statusTitle}">${statusIcon}</span>`;
            }
        };
        
        return templates[templateName] ? templates[templateName](data) : '';
    }

    // 渲染API站点表格
    renderApiSitesTable() {
        const tbody = this.getElement('apiSitesTableBody');
        if (!tbody) return;

        // 使用过滤后的站点列表
        const sitesToRender = this.filteredApiSites || this.apiSites;

        if (this.apiSites.length === 0) {
            tbody.innerHTML = this.createTemplate('emptyState', {
                icon: '🔗',
                text: '暂无API站点',
                description: '点击上方"添加API站点"按钮开始添加'
            });
            return;
        }

        if (sitesToRender.length === 0) {
            tbody.innerHTML = this.createTemplate('emptyState', {
                icon: '🔍',
                text: '没有找到匹配的站点',
                description: '请尝试其他搜索关键字'
            });
            return;
        }

        const rows = sitesToRender.map(site => this.createTableRow(site)).join('');
        tbody.innerHTML = rows;
    }

    // 创建站点信息网格
    createSiteInfoGrid(site, lastCheckTime) {
        const quota = site.site_quota ? site.site_quota.toFixed(2) : '0.00';
        const usedQuota = site.site_used_quota ? site.site_used_quota.toFixed(2) : '0.00';
        const affQuota = site.site_aff_quota ? site.site_aff_quota.toFixed(2) : '0.00';
        const affHistoryQuota = site.site_aff_history_quota ? site.site_aff_history_quota.toFixed(2) : '0.00';

        // 解析模型列表
        let modelsListHtml = '无';
        if (site.models_list) {
            try {
                const modelsList = JSON.parse(site.models_list);
                if (Array.isArray(modelsList) && modelsList.length > 0) {
                    modelsListHtml = modelsList.map(model => 
                        `<span class="model-tag" data-model="${this.escapeHtml(model)}" onclick="navigator.clipboard.writeText('${this.escapeHtml(model)}'); this.closest('.info-value').querySelector('.copy-hint').style.display='inline'; setTimeout(() => this.closest('.info-value').querySelector('.copy-hint').style.display='none', 1000)" title="点击复制">${this.escapeHtml(model)}</span>`
                    ).join('');
                }
            } catch (e) {
                console.error('解析模型列表失败:', e);
            }
        }

        // 解析令牌列表
        let tokensListHtml = '无';
        if (site.tokens_list) {
            try {
                const tokensList = JSON.parse(site.tokens_list);
                if (Array.isArray(tokensList) && tokensList.length > 0) {
                    tokensListHtml = this.createTokensListHtml(tokensList, site.id);
                }
            } catch (e) {
                console.error('解析令牌列表失败:', e);
            }
        }

        return `
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">用户名</span>
                    <span class="info-value">${site.site_username || '未知'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">当前余额</span>
                    <span class="info-value">$${quota}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">历史消耗</span>
                    <span class="info-value">$${usedQuota}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">请求次数</span>
                    <span class="info-value">${site.site_request_count || 0}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">用户组</span>
                    <span class="info-value">${site.site_user_group || '未知'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">邀请码</span>
                    <span class="info-value">
                        ${site.site_aff_code ? `
                            <span class="aff-code-container">
                                <span class="aff-code">${site.site_aff_code}</span>
                                <button class="btn-copy-aff" 
                                        data-site-url="${site.url}" 
                                        data-aff-code="${site.site_aff_code}"
                                        title="复制邀请链接">
                                    📋
                                </button>
                            </span>
                        ` : '无'}
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">邀请数量</span>
                    <span class="info-value">${site.site_aff_count || 0}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">待使用收益</span>
                    <span class="info-value">$${affQuota}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">总收益</span>
                    <span class="info-value">$${affHistoryQuota}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">最后签到时间</span>
                    <span class="info-value">${site.site_last_check_in_time_formatted || (site.site_last_check_in_time ? new Date(site.site_last_check_in_time).toLocaleString('zh-CN') : '未签到')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">检测时间</span>
                    <span class="info-value">${lastCheckTime}</span>
                </div>
                <div class="info-item-full">
                    <span class="info-label">
                        模型列表 
                        <div class="model-actions" style="display: inline-block; margin-left: 10px;">
                            ${this.createTemplate('modelAction', {
                                siteId: site.id,
                                className: 'btn-refresh-models',
                                title: '刷新模型列表',
                                icon: '🔄',
                                text: '刷新'
                            })}
                        </div>
                        <span class="copy-hint" style="display:none; color: green; font-size: 0.8em;">已复制</span>
                    </span>
                    <div class="info-value models-list">${modelsListHtml}</div>
                </div>
                <div class="info-item-full">
                    <span class="info-label">
                        令牌列表 
                        <div class="token-actions">
                            ${this.createTemplate('tokenAction', {
                                siteId: site.id,
                                className: 'btn-refresh-tokens',
                                title: '刷新令牌列表',
                                icon: '🔄',
                                text: '刷新'
                            })}
                            ${this.createTemplate('tokenAction', {
                                siteId: site.id,
                                className: 'btn-delete-all-tokens btn-danger',
                                title: '删除所有令牌',
                                icon: '',
                                text: '全部删除'
                            })}
                            ${this.createTemplate('tokenAction', {
                                siteId: site.id,
                                className: 'btn-auto-create-tokens btn-primary',
                                title: '自动创建令牌',
                                icon: '',
                                text: '自动创建令牌'
                            })}
                        </div>
                    </span>
                    <div class="info-value tokens-list">${tokensListHtml}</div>
                </div>
            </div>
        `;
    }

    // 创建站点信息框
    createSiteInfoBox(site) {
        if (!site.last_check_time) {
            return '<div class="site-info-box unchecked">未检测</div>';
        }

        const lastCheckTime = site.last_check_time_formatted || new Date(site.last_check_time).toLocaleString('zh-CN');
        
        if (site.last_check_status === 'error') {
            const hasUserData = site.site_username || site.site_quota || site.site_used_quota;
            
            if (hasUserData) {
                const gridHtml = this.createSiteInfoGrid(site, lastCheckTime);
                return `
                    <div class="site-info-box error">
                        <div class="info-status">⚠️ 检测失败但有历史数据 - ${site.last_check_message || '未知错误'}</div>
                        ${gridHtml}
                    </div>
                `;
            } else {
                return `
                    <div class="site-info-box error">
                        <div class="info-status">❌ 检测失败</div>
                        <div class="info-message">${site.last_check_message || '未知错误'}</div>
                    </div>
                `;
            }
        }

        if (site.last_check_status === 'success') {
            const gridHtml = this.createSiteInfoGrid(site, lastCheckTime);
            return `
                <div class="site-info-box success">
                    ${gridHtml}
                </div>
            `;
        }

        return '<div class="site-info-box pending">检测中...</div>';
    }

    // 创建表格行
    createTableRow(site) {
        // 检查时间和状态显示
        let checkTimeDisplay = '未检查';
        let checkStatusClass = 'check-status-pending';
        let checkStatusTitle = '';
        
        if (site.last_check_time) {
            // 使用后端提供的格式化时间，如果没有则回退到本地转换
            const checkTime = site.last_check_time_formatted || new Date(site.last_check_time).toLocaleString('zh-CN');
            
            if (site.last_check_status === 'error') {
                const errorMsg = site.last_check_message || '未知错误';
                checkTimeDisplay = `<span class="check-failed">${checkTime}<br><small class="error-message">❌ ${errorMsg}</small></span>`;
                checkStatusClass = 'check-status-error';
                checkStatusTitle = `检测失败: ${errorMsg}`;
            } else if (site.last_check_status === 'success') {
                checkTimeDisplay = `<span class="check-success">${checkTime}<br><small class="success-message">✅ 检测成功</small></span>`;
                checkStatusClass = 'check-status-success';
                checkStatusTitle = '检测成功';
            } else {
                checkTimeDisplay = `<span class="check-pending">${checkTime}<br><small class="pending-message">⏳ 检测中...</small></span>`;
                checkStatusClass = 'check-status-pending';
                checkStatusTitle = '正在检测';
            }
        } else if (site.created_at) {
            // 使用格式化的创建时间
            const createdTime = site.created_at_formatted || new Date(site.created_at).toLocaleString('zh-CN');
            checkTimeDisplay = createdTime + '<br><small class="text-muted">(创建时间)</small>';
            checkStatusTitle = '尚未检测';
        }
        
        // 当前金额显示（直接使用site_quota，不做计算）
        const currentQuota = site.site_quota ? site.site_quota.toFixed(2) : '0.00';
        const usedQuota = site.site_used_quota ? site.site_used_quota.toFixed(2) : '0.00';
        const quotaDisplay = `
            <div class="quota-display" title="当前余额: $${currentQuota}, 已用: $${usedQuota}">
                <span class="remaining-quota">$${currentQuota}</span>
            </div>
        `;

        // 站点名称可点击显示
        const siteNameDisplay = `
            <div class="site-name-display">
                <a href="${this.escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer" 
                   class="site-name-link" title="点击在新窗口打开: ${this.escapeHtml(site.url)}">
                    ${this.escapeHtml(site.name)}
                </a>
            </div>
        `;

        const apiTypeBadge = `<span class="api-type-badge api-type-${site.api_type.toLowerCase()}">${site.api_type}</span>`;
        const statusBadge = this.createTemplate('statusBadge', { 
            enabled: Boolean(site.enabled)
        });
        
        // 签到状态显示 - 三种状态：未启用(灰色圆点)、成功(绿勾)、失败(红叉)
        let checkinBadge = '<span class="checkin-badge checkin-disabled" title="自动签到未启用">⚫</span>';
        if (site.auto_checkin) {
            // 对于启用签到的站点，显示加载状态，稍后异步更新
            checkinBadge = `<span id="checkin-badge-${site.id}" class="checkin-badge checkin-loading" title="正在加载签到状态...">⏳</span>`;
            // 异步加载签到状态
            this.loadCheckinStatus(site.id);
        }

        // 站点信息显示
        const siteInfoBox = this.createSiteInfoBox(site);

        // 检查是否应该显示详情
        const shouldShowDetails = this.showDetails || this.expandedSites.has(site.id);
        const expandIcon = shouldShowDetails ? '🔽' : '▶️';

        // 主要信息行
        const mainRow = `
            <tr class="site-main-row ${checkStatusClass}" title="${checkStatusTitle}">
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <button class="btn-expand" 
                                data-site-id="${site.id}" 
                                title="展开/收起详情">
                            ${expandIcon}
                        </button>
                        ${apiTypeBadge}
                    </div>
                </td>
                <td>${siteNameDisplay}</td>
                <td>${quotaDisplay}</td>
                <td>${statusBadge}</td>
                <td>${checkinBadge}</td>
                <td class="check-time-cell">${checkTimeDisplay}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" 
                                data-site-id="${site.id}" 
                                data-site-name="${this.escapeHtml(site.name)}" 
                                title="编辑">
                            ✏️
                        </button>
                        <button class="btn-icon btn-check" 
                                data-site-id="${site.id}" 
                                data-site-name="${this.escapeHtml(site.name)}" 
                                title="检测站点">
                            🔍
                        </button>
                        <button class="btn-icon btn-topup" 
                                data-site-id="${site.id}" 
                                data-site-name="${this.escapeHtml(site.name)}" 
                                title="兑换码">
                            💰
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

        // 站点信息行（根据展开状态决定是否显示）
        let infoRow = '';
        if (shouldShowDetails) {
            infoRow = `
                <tr class="site-info-row" id="info-row-${site.id}">
                    <td colspan="7">
                        <div class="site-info-expanded">
                            ${siteInfoBox}
                        </div>
                    </td>
                </tr>
            `;
        }

        return mainRow + infoRow;
    }

    // 异步加载签到状态
    async loadCheckinStatus(siteId) {
        try {
            const response = await fetch(`/api/sites/${siteId}/checkin-status`, {
                credentials: 'include'
            });
            const result = await response.json();
            
            const badgeElement = document.getElementById(`checkin-badge-${siteId}`);
            if (badgeElement) {
                if (result.success && result.data) {
                    // 根据签到状态更新显示
                    if (result.data.status === 'success') {
                        const time = new Date(result.data.time).toLocaleString('zh-CN');
                        const message = result.data.message || '签到成功';
                        badgeElement.className = 'checkin-badge checkin-success';
                        badgeElement.innerHTML = '✅';
                        badgeElement.title = `最后签到状态：成功 - ${time}\n${message}`;
                    } else if (result.data.status === 'error') {
                        const time = new Date(result.data.time).toLocaleString('zh-CN');
                        const message = result.data.message || '签到失败';
                        badgeElement.className = 'checkin-badge checkin-failed';
                        badgeElement.innerHTML = '❌';
                        badgeElement.title = `最后签到状态：失败 - ${time}\n${message}`;
                    }
                } else {
                    // 没有签到记录，但启用了签到 - 显示绿勾但提示暂无记录
                    badgeElement.className = 'checkin-badge checkin-enabled';
                    badgeElement.innerHTML = '✅';
                    badgeElement.title = '自动签到已启用\n暂无签到记录';
                }
            }
        } catch (error) {
            console.error('加载签到状态失败:', error);
            const badgeElement = document.getElementById(`checkin-badge-${siteId}`);
            if (badgeElement) {
                // 加载失败时显示启用状态但提示加载失败
                badgeElement.className = 'checkin-badge checkin-enabled';
                badgeElement.innerHTML = '✅';
                badgeElement.title = '自动签到已启用\n状态加载失败，请检查网络';
            }
        }
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

    // 检测站点
    async checkSite(id, name) {
        try {
            this.showAlert(`开始检测站点: ${name}`, 'info');
            
            const response = await fetch(`/api/sites/${id}/check`, {
                method: 'POST',
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                this.showAlert(`站点 ${name} 检测成功`, 'success');
                // 刷新列表以显示最新信息
                this.loadApiSites();
            } else {
                this.showAlert(`站点 ${name} 检测失败: ${result.message}`, 'error');
                // 即使失败也刷新列表，显示错误状态
                this.loadApiSites();
            }
        } catch (error) {
            console.error('检测站点失败:', error);
            this.showAlert(`检测站点失败: ${error.message}`, 'error');
        }
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
    async refreshApiList() {
        try {
            await this.loadApiSites();
            this.showAlert('列表已刷新', 'success');
        } catch (error) {
            console.error('刷新列表失败:', error);
            this.showAlert('刷新列表失败', 'error');
        }
    }

    // 批量检查所有站点
    async batchCheckAllSites() {
        try {
            // 获取所有启用的站点
            const enabledSites = this.apiSites.filter(site => site.enabled);
            
            if (enabledSites.length === 0) {
                this.showAlert('没有启用的站点需要检查', 'warning');
                return;
            }

            // 更新按钮状态
            const batchCheckBtn = document.getElementById('batchCheckBtn');
            if (batchCheckBtn) {
                batchCheckBtn.disabled = true;
                batchCheckBtn.innerHTML = '🔄 检查中...';
            }

            this.showAlert(`开始批量检查 ${enabledSites.length} 个站点...`, 'info');

            let successCount = 0;
            let errorCount = 0;
            const results = [];

            // 逐个检查站点（避免并发过多）
            for (let i = 0; i < enabledSites.length; i++) {
                const site = enabledSites[i];
                try {
                    console.log(`检查站点 ${i + 1}/${enabledSites.length}: ${site.name}`);
                    
                    const response = await fetch(`/api/sites/${site.id}/check`, {
                        method: 'POST',
                        credentials: 'include'
                    });
                    const result = await response.json();

                    if (result.success) {
                        successCount++;
                        results.push({ site: site.name, status: 'success', message: '检查成功' });
                    } else {
                        errorCount++;
                        results.push({ site: site.name, status: 'error', message: result.message || '检查失败' });
                    }
                } catch (error) {
                    console.error(`检查站点 ${site.name} 失败:`, error);
                    errorCount++;
                    results.push({ site: site.name, status: 'error', message: error.message || '网络错误' });
                }

                // 每检查完一个站点，更新进度
                if (batchCheckBtn) {
                    batchCheckBtn.innerHTML = `🔄 检查中... (${i + 1}/${enabledSites.length})`;
                }

                // 添加小延迟避免请求过于频繁
                if (i < enabledSites.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            // 显示检查结果
            const resultMessage = `批量检查完成！成功: ${successCount}, 失败: ${errorCount}`;
            this.showAlert(resultMessage, errorCount === 0 ? 'success' : 'warning');

            // 刷新列表显示最新结果
            await this.loadApiSites();

            // 在控制台输出详细结果
            console.log('批量检查详细结果:');
            results.forEach(result => {
                console.log(`${result.site}: ${result.status} - ${result.message}`);
            });

        } catch (error) {
            console.error('批量检查失败:', error);
            this.showAlert('批量检查失败', 'error');
        } finally {
            // 恢复按钮状态
            const batchCheckBtn = document.getElementById('batchCheckBtn');
            if (batchCheckBtn) {
                batchCheckBtn.disabled = false;
                batchCheckBtn.innerHTML = '🔍 一键检查';
            }
        }
    }

    // 切换单个站点详情显示
    toggleSiteDetails(siteId) {
        const isExpanded = this.expandedSites.has(siteId);
        
        if (isExpanded) {
            this.expandedSites.delete(siteId);
        } else {
            this.expandedSites.add(siteId);
        }
        
        // 重新渲染表格
        this.renderApiSitesTable();
    }

    // 切换全局详情显示
    toggleAllDetails(show) {
        this.showDetails = show;
        
        if (show) {
            // 如果显示全部，清空个别展开的记录
            this.expandedSites.clear();
        }
        
        // 重新渲染表格
        this.renderApiSitesTable();
    }

    // 复制邀请链接
    async copyAffiliateLink(siteUrl, affCode) {
        try {
            const affiliateLink = `${siteUrl}/register?aff=${affCode}`;
            
            // 使用现代的Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(affiliateLink);
            } else {
                // 降级方案：使用传统的方法
                const textArea = document.createElement('textarea');
                textArea.value = affiliateLink;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            
            this.showAlert(`邀请链接已复制: ${affiliateLink}`, 'success');
        } catch (error) {
            console.error('复制失败:', error);
            this.showAlert('复制失败，请手动复制', 'error');
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

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 显示兑换码模态框
    showTopupModal(siteId, siteName) {
        // 使用通用的prompt输入框
        const topupKey = prompt(`请输入兑换码 (站点: ${siteName}):`, '');
        if (topupKey && topupKey.trim()) {
            this.processTopup(siteId, siteName, topupKey.trim());
        }
    }

    // 处理兑换码兑换
    async processTopup(siteId, siteName, topupKey) {
        try {
            this.showAlert('正在处理兑换码...', 'info');

            const response = await fetch(`/api/sites/${siteId}/topup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    key: topupKey
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert(`兑换成功: ${result.message}`, 'success');
                // 刷新站点列表以显示最新余额
                this.loadApiSites();
            } else {
                this.showAlert(`兑换失败: ${result.message}`, 'error');
            }

        } catch (error) {
            console.error('兑换码处理失败:', error);
            this.showAlert('兑换码处理失败，请检查网络连接', 'error');
        }
    }

    // 创建令牌列表HTML（表格形式）
    createTokensListHtml(tokensList, siteId) {
        if (!tokensList || tokensList.length === 0) {
            return '<div class="empty-message">暂无令牌</div>';
        }
        
        let tableHtml = `
            <div class="tokens-table-container">
                <table class="tokens-table">
                    <thead>
                        <tr>
                            <th>令牌名称</th>
                            <th>密钥</th>
                            <th>状态</th>
                            <th>剩余限额</th>
                            <th>模型组</th>
                            <th>创建时间</th>
                            <th>过期时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        tokensList.forEach(token => {
            // 兼容不同的配额字段名和计算方式
            let quotaDisplay = '未知';
            if (token.unlimited_quota === true) {
                quotaDisplay = '无限制';
            } else if (token.model_limits_enabled === false) {
                quotaDisplay = '无限制';
            } else if (typeof token.remain_quota === 'number') {
                // 支持不同的配额单位计算
                const quota = token.remain_quota;
                if (quota >= 500000) {
                    // 如果大于等于500000，按照原有逻辑除以500000
                    quotaDisplay = `${(quota / 500000).toFixed(2)} 刀`;
                } else if (quota >= 1000) {
                    // 如果大于等于1000，可能是以分为单位，除以1000
                    quotaDisplay = `${(quota / 1000).toFixed(2)} 刀`;
                } else {
                    // 直接显示数值
                    quotaDisplay = `${quota} 点`;
                }
            }
            
            const statusDisplay = token.status === 1 ? '启用' : '禁用';
            const statusClass = token.status === 1 ? 'status-enabled' : 'status-disabled';
            
            // 支持不同的时间戳格式
            let createdTime = '未知';
            if (token.created_time) {
                if (token.created_time > 1000000000000) {
                    // 毫秒时间戳
                    createdTime = new Date(token.created_time).toLocaleString('zh-CN');
                } else {
                    // 秒时间戳
                    createdTime = new Date(token.created_time * 1000).toLocaleString('zh-CN');
                }
            }
            
            let expiredTime = '永不过期';
            if (token.expired_time && token.expired_time !== -1) {
                if (token.expired_time > 1000000000000) {
                    // 毫秒时间戳
                    expiredTime = new Date(token.expired_time).toLocaleString('zh-CN');
                } else {
                    // 秒时间戳
                    expiredTime = new Date(token.expired_time * 1000).toLocaleString('zh-CN');
                }
            }
            
            // 支持新的group字段
            const groupDisplay = token.group || '默认组';
            
            tableHtml += `
                <tr>
                    <td class="token-name-cell">${this.escapeHtml(token.name)}</td>
                    <td class="token-key-cell">
                        <span class="token-key" onclick="navigator.clipboard.writeText('${this.escapeHtml(token.key)}'); this.style.color='green'; this.textContent='已复制'; setTimeout(() => {this.style.color=''; this.textContent='${this.escapeHtml(token.key.substring(0, 20))}...'}, 1000)" title="点击复制完整密钥">
                            ${this.escapeHtml(token.key.substring(0, 20))}...
                        </span>
                    </td>
                    <td class="token-status-cell">
                        <span class="token-status ${statusClass}">${statusDisplay}</span>
                    </td>
                    <td class="token-quota-cell">${quotaDisplay}</td>
                    <td class="token-group-cell" title="模型组: ${this.escapeHtml(groupDisplay)}">${this.escapeHtml(groupDisplay)}</td>
                    <td class="token-time-cell">${createdTime}</td>
                    <td class="token-time-cell">${expiredTime}</td>
                    <td class="token-actions-cell">
                        <div class="token-actions-inline">
                            <button class="btn-tiny btn-toggle btn-toggle-token" 
                                    data-site-id="${siteId}" 
                                    data-token-id="${token.id}" 
                                    data-new-status="${token.status === 1 ? 2 : 1}" 
                                    title="${token.status === 1 ? '禁用' : '启用'}">
                                ${token.status === 1 ? '🔴' : '🟢'}
                            </button>
                            <button class="btn-tiny btn-danger btn-delete-token" 
                                    data-site-id="${siteId}" 
                                    data-token-id="${token.id}" 
                                    title="删除">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableHtml += `
                    </tbody>
                </table>
            </div>
        `;
        
        return tableHtml;
    }

    // 切换令牌状态
    async toggleToken(siteId, tokenId, newStatus) {
        try {
            const statusText = newStatus === 1 ? '启用' : '禁用';
            console.log(`[令牌操作] 开始${statusText}令牌 - 站点ID: ${siteId}, 令牌ID: ${tokenId}, 新状态: ${newStatus}`);
            
            this.showAlert(`正在${statusText}令牌...`, 'info');

            const response = await fetch(`/api/sites/${siteId}/token/${tokenId}/toggle`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: tokenId,
                    status: newStatus
                }),
                credentials: 'include'
            });

            console.log(`[令牌操作] ${statusText}请求响应状态: ${response.status}`);
            const result = await response.json();
            console.log(`[令牌操作] ${statusText}请求响应结果:`, result);

            if (result.success) {
                console.log(`[令牌操作] 令牌${statusText}成功 - 站点ID: ${siteId}, 令牌ID: ${tokenId}`);
                this.showAlert(`令牌${statusText}成功`, 'success');
                // 只刷新站点列表显示最新的令牌信息，不执行完整检查
                this.loadApiSites();
            } else {
                console.error(`[令牌操作] 令牌${statusText}失败 - 站点ID: ${siteId}, 令牌ID: ${tokenId}, 错误: ${result.message}`);
                this.showAlert(`令牌${statusText}失败: ${result.message}`, 'error');
            }

        } catch (error) {
            console.error('[令牌操作] 切换令牌状态异常:', error);
            this.showAlert('切换令牌状态失败，请检查网络连接', 'error');
        }
    }

    // 删除令牌
    async deleteToken(siteId, tokenId, tokenName) {
        if (!confirm(`确定要删除令牌"${tokenName || tokenId}"吗？\n\n此操作不可撤销！`)) {
            return;
        }

        try {
            console.log(`[令牌操作] 开始删除令牌 - 站点ID: ${siteId}, 令牌ID: ${tokenId}`);
            this.showAlert('正在删除令牌...', 'info');

            const response = await fetch(`/api/sites/${siteId}/token/${tokenId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            console.log(`[令牌操作] 删除请求响应状态: ${response.status}`);
            const result = await response.json();
            console.log(`[令牌操作] 删除请求响应结果:`, result);

            if (result.success) {
                console.log(`[令牌操作] 删除成功`);
                this.showAlert('令牌删除成功', 'success');
                // 重新检查站点以获取最新令牌状态
                await this.checkSite(siteId, '站点');
            } else {
                console.error(`[令牌操作] 删除失败: ${result.message}`);
                this.showAlert(`删除令牌失败: ${result.message}`, 'error');
            }

        } catch (error) {
            console.error('[令牌操作] 删除令牌异常:', error);
            this.showAlert('删除令牌失败，请检查网络连接', 'error');
        }
    }

    // 全部删除令牌
    async deleteAllTokens(siteId) {
        console.log(`[令牌操作] 准备删除所有令牌，站点ID: ${siteId}`);
        if (!confirm('确定要删除该站点的所有令牌吗？\n\n此操作将删除所有令牌且无法撤销！\n请谨慎操作！')) {
            console.log(`[令牌操作] 用户取消了删除操作`);
            return;
        }

        try {
            console.log(`[令牌操作] 发送删除请求到 /api/sites/${siteId}/tokens/deleteAll`);
            this.showAlert('正在删除所有令牌...', 'info');

            const response = await fetch(`/api/sites/${siteId}/tokens/deleteAll`, {
                method: 'DELETE',
                credentials: 'include'
            });

            console.log(`[令牌操作] 删除请求响应状态: ${response.status}`);
            const result = await response.json();
            console.log(`[令牌操作] 删除请求响应结果:`, result);

            if (result.success) {
                console.log(`[令牌操作] 删除成功: ${result.message}`);
                this.showAlert(result.message || '所有令牌删除成功', 'success');
                // 重新检查站点以获取最新令牌状态
                await this.checkSite(siteId, '站点');
            } else {
                console.error(`[令牌操作] 删除失败: ${result.message}`);
                this.showAlert(`删除失败: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('[令牌操作] 批量删除令牌异常:', error);
            this.showAlert('批量删除失败，请检查网络连接', 'error');
        }
    }

    // 修正自动创建令牌方法
    async autoCreateTokens(siteId) {
        console.log(`[令牌操作] 开始自动创建令牌，站点ID: ${siteId}`);
        try {
            console.log(`[令牌操作] 发送自动创建请求到 /api/sites/${siteId}/tokens/autoCreate`);
            this.showAlert('正在自动创建令牌...', 'info');

            const response = await fetch(`/api/sites/${siteId}/tokens/autoCreate`, {
                method: 'POST',
                credentials: 'include'
            });

            console.log(`[令牌操作] 自动创建请求响应状态: ${response.status}`);
            const result = await response.json();
            console.log(`[令牌操作] 自动创建请求响应结果:`, result);

            if (result.success) {
                console.log(`[令牌操作] 自动创建成功: ${result.message}`);
                this.showAlert(result.message || '自动创建令牌完成', 'success');
                // 重新检查站点以获取最新令牌状态
                await this.checkSite(siteId, '站点');
            } else {
                console.error(`[令牌操作] 自动创建失败: ${result.message}`);
                this.showAlert(`自动创建失败: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('[令牌操作] 自动创建令牌异常:', error);
            this.showAlert('自动创建令牌失败，请检查网络连接', 'error');
        }
    }

    // 修正刷新令牌方法 - 仅重新检查站点
    async refreshTokens(siteId) {
        console.log(`[令牌操作] 开始刷新令牌列表，站点ID: ${siteId}`);
        try {
            console.log(`[令牌操作] 发送刷新请求到 /api/sites/${siteId}/check`);
            this.showAlert('正在刷新令牌列表...', 'info');
            
            // 直接检查站点获取最新令牌信息
            const response = await fetch(`/api/sites/${siteId}/check`, {
                method: 'POST',
                credentials: 'include'
            });
            
            console.log(`[令牌操作] 刷新请求响应状态: ${response.status}`);
            const result = await response.json();
            console.log(`[令牌操作] 刷新请求响应结果:`, result);
            
            if (result.success) {
                console.log(`[令牌操作] 刷新成功，更新站点列表`);
                this.showAlert('令牌列表刷新成功', 'success');
                // 刷新站点列表显示最新信息
                this.loadApiSites();
            } else {
                console.error(`[令牌操作] 刷新失败: ${result.message}`);
                this.showAlert(`刷新失败: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('[令牌操作] 刷新令牌列表异常:', error);
            this.showAlert('刷新令牌列表失败，请检查网络连接', 'error');
        }
    }

    // 刷新模型列表
    async refreshModels(siteId) {
        console.log(`[模型操作] 开始刷新模型列表，站点ID: ${siteId}`);
        try {
            console.log(`[模型操作] 发送刷新请求到 /api/sites/${siteId}/check`);
            this.showAlert('正在刷新模型列表...', 'info');
            
            const response = await fetch(`/api/sites/${siteId}/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshModelsOnly: true }), // 指定只刷新模型
                credentials: 'include'
            });
            
            console.log(`[模型操作] 刷新请求响应状态: ${response.status}`);
            const result = await response.json();
            console.log(`[模型操作] 刷新请求响应结果:`, result);
            
            if (result.success) {
                console.log(`[模型操作] 刷新成功，更新站点列表`);
                this.showAlert('模型列表刷新成功', 'success');
                // 只刷新站点列表显示最新的模型信息，不重新获取整个数据
                this.loadApiSites();
            } else {
                console.error(`[模型操作] 刷新失败: ${result.message}`);
                this.showAlert(`模型刷新失败: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('[模型操作] 刷新模型列表异常:', error);
            this.showAlert('刷新模型列表失败，请检查网络连接', 'error');
        }
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