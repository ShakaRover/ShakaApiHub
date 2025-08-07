// API管理功能
class ApiSiteManager {
    constructor() {
        this.currentEditingId = null;
        this.apiSites = [];
        this.filteredApiSites = []; // 过滤后的站点列表
        this.searchTerm = ''; // 搜索关键字
        this.showDetails = false; // 全局显示详情开关
        this.expandedSites = new Set(); // 记录展开的站点ID
        this.init();
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
        const addBtn = document.getElementById('addApiSiteBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }

        // 一键检查按钮
        const batchCheckBtn = document.getElementById('batchCheckBtn');
        if (batchCheckBtn) {
            batchCheckBtn.addEventListener('click', () => this.batchCheckAllSites());
        }

        // 显示详情开关
        const showDetailsToggle = document.getElementById('showDetailsToggle');
        if (showDetailsToggle) {
            showDetailsToggle.addEventListener('change', (e) => this.toggleAllDetails(e.target.checked));
        }

        // 搜索功能
        const searchInput = document.getElementById('apiSiteSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // 过滤器功能
        const apiTypeFilter = document.getElementById('apiTypeFilter');
        const enabledStatusFilter = document.getElementById('enabledStatusFilter');
        const checkinStatusFilter = document.getElementById('checkinStatusFilter');
        const checkStatusFilter = document.getElementById('checkStatusFilter');

        [apiTypeFilter, enabledStatusFilter, checkinStatusFilter, checkStatusFilter].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => this.applyFilters());
            }
        });

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
        } else if (button.classList.contains('btn-check')) {
            this.checkSite(siteId, siteName);
        } else if (button.classList.contains('btn-topup')) {
            this.showTopupModal(siteId, siteName);
        } else if (button.classList.contains('btn-toggle')) {
            this.toggleEnabled(siteId, !isEnabled);
        } else if (button.classList.contains('btn-delete')) {
            this.showDeleteModal(siteId, siteName);
        } else if (button.classList.contains('btn-expand')) {
            this.toggleSiteDetails(siteId);
        } else if (button.classList.contains('btn-copy-aff')) {
            this.copyAffiliateLink(button.dataset.siteUrl, button.dataset.affCode);
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
        try {
            const response = await fetch('/api/sites', {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                this.apiSites = result.data;
                this.filterApiSites(); // 应用当前搜索过滤
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
            const apiTypeFilter = document.getElementById('apiTypeFilter')?.value;
            if (apiTypeFilter && site.api_type !== apiTypeFilter) {
                return false;
            }

            // 启用状态过滤
            const enabledStatusFilter = document.getElementById('enabledStatusFilter')?.value;
            if (enabledStatusFilter) {
                const isEnabled = site.enabled === 1;
                if (enabledStatusFilter === 'enabled' && !isEnabled) return false;
                if (enabledStatusFilter === 'disabled' && isEnabled) return false;
            }

            // 签到状态过滤
            const checkinStatusFilter = document.getElementById('checkinStatusFilter')?.value;
            if (checkinStatusFilter) {
                const checkinEnabled = site.auto_checkin === 1;
                if (checkinStatusFilter === 'enabled' && !checkinEnabled) return false;
                if (checkinStatusFilter === 'disabled' && checkinEnabled) return false;
            }

            // 最后检测状态过滤
            const checkStatusFilter = document.getElementById('checkStatusFilter')?.value;
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

    // 渲染API站点表格
    renderApiSitesTable() {
        const tbody = document.getElementById('apiSitesTableBody');
        if (!tbody) return;

        // 使用过滤后的站点列表
        const sitesToRender = this.filteredApiSites || this.apiSites;

        if (this.apiSites.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="7">
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

        if (sitesToRender.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="7">
                        <div class="empty-message">
                            <div class="empty-icon">🔍</div>
                            <div class="empty-text">没有找到匹配的站点</div>
                            <div class="empty-description">请尝试其他搜索关键字</div>
                        </div>
                    </td>
                </tr>
            `;
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
                    <span class="info-value">${site.site_last_check_in_time ? new Date(site.site_last_check_in_time).toLocaleString('zh-CN') : '未签到'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">检测时间</span>
                    <span class="info-value">${lastCheckTime}</span>
                </div>
                <div class="info-item-full">
                    <span class="info-label">
                        模型列表 
                        <div class="model-actions" style="display: inline-block; margin-left: 10px;">
                            <button class="btn-small btn-secondary" onclick="apiSiteManager.refreshModels(${site.id})" title="刷新模型列表">🔄 刷新</button>
                        </div>
                        <span class="copy-hint" style="display:none; color: green; font-size: 0.8em;">已复制</span>
                    </span>
                    <div class="info-value models-list">${modelsListHtml}</div>
                </div>
                <div class="info-item-full">
                    <span class="info-label">
                        令牌列表 
                        <div class="token-actions">
                            <button class="btn-small btn-secondary" onclick="apiSiteManager.refreshTokens(${site.id})" title="刷新令牌列表">🔄 刷新</button>
                            <button class="btn-small btn-danger" onclick="apiSiteManager.deleteAllTokens(${site.id})">全部删除</button>
                            <button class="btn-small btn-primary" onclick="apiSiteManager.autoCreateTokens(${site.id})">自动创建令牌</button>
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

        const lastCheckTime = new Date(site.last_check_time).toLocaleString('zh-CN');
        
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
            const checkTime = new Date(site.last_check_time).toLocaleString('zh-CN');
            
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
            checkTimeDisplay = new Date(site.created_at).toLocaleString('zh-CN') + '<br><small class="text-muted">(创建时间)</small>';
            checkStatusTitle = '尚未检测';
        }
        
        const apiTypeBadge = `<span class="api-type-badge api-type-${site.api_type.toLowerCase()}">${site.api_type}</span>`;
        const statusBadge = site.enabled 
            ? '<span class="status-badge status-enabled" title="已启用">✅</span>'
            : '<span class="status-badge status-disabled" title="已禁用">❌</span>';
        
        // 签到状态显示 - 使用异步加载的方式
        let checkinBadge = '<span class="checkin-badge checkin-disabled" title="自动签到未启用">❌</span>';
        if (site.auto_checkin) {
            // 对于启用签到的站点，显示加载状态，稍后异步更新
            checkinBadge = `<span id="checkin-badge-${site.id}" class="checkin-badge checkin-loading" title="加载签到状态中...">⏳</span>`;
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
                <td>${this.escapeHtml(site.name)}</td>
                <td><a href="${this.escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer" class="api-url" title="点击在新窗口打开: ${this.escapeHtml(site.url)}">${this.escapeHtml(site.url)}</a></td>
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
                        badgeElement.title = `最近签到成功 - ${time}: ${message}`;
                    } else if (result.data.status === 'error') {
                        const time = new Date(result.data.time).toLocaleString('zh-CN');
                        const message = result.data.message || '签到失败';
                        badgeElement.className = 'checkin-badge checkin-failed';
                        badgeElement.innerHTML = '❌';
                        badgeElement.title = `最近签到失败 - ${time}: ${message}`;
                    }
                } else {
                    // 没有签到记录，但启用了签到
                    badgeElement.className = 'checkin-badge checkin-enabled';
                    badgeElement.innerHTML = '⏹️';
                    badgeElement.title = '自动签到已启用 - 暂无签到记录';
                }
            }
        } catch (error) {
            console.error('加载签到状态失败:', error);
            const badgeElement = document.getElementById(`checkin-badge-${siteId}`);
            if (badgeElement) {
                badgeElement.className = 'checkin-badge checkin-enabled';
                badgeElement.innerHTML = '✅';
                badgeElement.title = '自动签到已启用';
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

    // 创建令牌列表HTML
    createTokensListHtml(tokensList, siteId) {
        if (!tokensList || tokensList.length === 0) {
            return '无';
        }

        return tokensList.map(token => {
            const quotaDisplay = token.model_limits_enabled === false ? '无限制' : 
                `${(token.remain_quota / 500000).toFixed(2)}`;
            
            const statusDisplay = token.status === 1 ? '启用' : '禁用';
            const statusClass = token.status === 1 ? 'status-enabled' : 'status-disabled';
            
            const createdTime = new Date(token.created_time * 1000).toLocaleString('zh-CN');
            const expiredTime = token.expired_time === -1 ? '永不过期' : 
                new Date(token.expired_time * 1000).toLocaleString('zh-CN');

            return `
                <div class="token-item">
                    <div class="token-header">
                        <span class="token-name">${this.escapeHtml(token.name)}</span>
                        <div class="token-actions-inline">
                            <button class="btn-tiny btn-toggle" onclick="apiSiteManager.toggleToken(${siteId}, ${token.id}, ${token.status === 1 ? 2 : 1})" title="${token.status === 1 ? '禁用' : '启用'}">
                                ${token.status === 1 ? '🔴' : '🟢'}
                            </button>
                            <button class="btn-tiny btn-danger" onclick="apiSiteManager.deleteToken(${siteId}, ${token.id})" title="删除">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="token-details">
                        <div class="token-detail">
                            <span class="token-detail-label">密钥:</span>
                            <span class="token-key" onclick="navigator.clipboard.writeText('${this.escapeHtml(token.key)}'); this.style.color='green'; this.textContent='已复制'; setTimeout(() => {this.style.color=''; this.textContent='${this.escapeHtml(token.key.substring(0, 20))}...'}, 1000)" title="点击复制">
                                ${this.escapeHtml(token.key.substring(0, 20))}...
                            </span>
                        </div>
                        <div class="token-detail">
                            <span class="token-detail-label">状态:</span>
                            <span class="token-status ${statusClass}">${statusDisplay}</span>
                        </div>
                        <div class="token-detail">
                            <span class="token-detail-label">剩余限额:</span>
                            <span class="token-quota">${quotaDisplay}</span>
                        </div>
                        <div class="token-detail">
                            <span class="token-detail-label">创建时间:</span>
                            <span class="token-time">${createdTime}</span>
                        </div>
                        <div class="token-detail">
                            <span class="token-detail-label">过期时间:</span>
                            <span class="token-time">${expiredTime}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 切换令牌状态
    async toggleToken(siteId, tokenId, newStatus) {
        try {
            this.showAlert('正在更新令牌状态...', 'info');

            const response = await fetch(`/api/sites/${siteId}/token/${tokenId}/toggle`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: tokenId,
                    status: newStatus
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert(`令牌状态更新成功`, 'success');
                // 刷新站点列表
                this.loadApiSites();
            } else {
                this.showAlert(`令牌状态更新失败: ${result.message}`, 'error');
            }

        } catch (error) {
            console.error('切换令牌状态失败:', error);
            this.showAlert('切换令牌状态失败，请检查网络连接', 'error');
        }
    }

    // 删除令牌
    async deleteToken(siteId, tokenId) {
        if (!confirm('确定要删除此令牌吗？此操作不可撤销。')) {
            return;
        }

        try {
            this.showAlert('正在删除令牌...', 'info');

            const response = await fetch(`/api/sites/${siteId}/token/${tokenId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('令牌删除成功', 'success');
                // 刷新站点列表
                this.loadApiSites();
            } else {
                this.showAlert(`令牌删除失败: ${result.message}`, 'error');
            }

        } catch (error) {
            console.error('删除令牌失败:', error);
            this.showAlert('删除令牌失败，请检查网络连接', 'error');
        }
    }

    // 全部删除令牌
    async deleteAllTokens(siteId) {
        if (!confirm('确定要删除所有令牌吗？此操作不可撤销。')) {
            return;
        }

        try {
            this.showAlert('正在删除所有令牌...', 'info');

            const response = await fetch(`/api/sites/${siteId}/tokens/deleteAll`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert(`成功删除 ${result.deletedCount || 0} 个令牌`, 'success');
                // 刷新站点列表
                this.loadApiSites();
            } else {
                this.showAlert(`删除令牌失败: ${result.message}`, 'error');
            }

        } catch (error) {
            console.error('删除所有令牌失败:', error);
            this.showAlert('删除所有令牌失败，请检查网络连接', 'error');
        }
    }

    // 刷新模型列表
    async refreshModels(siteId) {
        try {
            this.showAlert('正在刷新模型列表...', 'info');
            const response = await fetch(`/api/sites/${siteId}/check`, {
                method: 'POST'
            });
            const result = await response.json();
            if (result.success) {
                this.showAlert('模型列表刷新成功', 'success');
                // 刷新站点列表以显示最新的模型信息
                this.loadApiSites();
            } else {
                this.showAlert(`刷新模型列表失败: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('刷新模型列表失败:', error);
            this.showAlert('刷新模型列表失败，请检查网络连接', 'error');
        }
    }
    
    // 刷新令牌列表
    async refreshTokens(siteId) {
        try {
            this.showAlert('正在刷新令牌列表...', 'info');
            const response = await fetch(`/api/sites/${siteId}/check`, {
                method: 'POST'
            });
            const result = await response.json();
            if (result.success) {
                this.showAlert('令牌列表刷新成功', 'success');
                // 刷新站点列表以显示最新的令牌信息
                this.loadApiSites();
            } else {
                this.showAlert(`刷新令牌列表失败: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('刷新令牌列表失败:', error);
            this.showAlert('刷新令牌列表失败，请检查网络连接', 'error');
        }
    }
    
    // 自动创建令牌
    async autoCreateTokens(siteId) {
        try {
            // 先刷新令牌列表获取最新状态
            this.showAlert('正在获取最新令牌列表...', 'info');
            const checkResponse = await fetch(`/api/sites/${siteId}/check`, {
                method: 'POST'
            });
            const checkResult = await checkResponse.json();
            if (!checkResult.success) {
                this.showAlert(`获取令牌列表失败: ${checkResult.message}`, 'error');
                return;
            }

            // 然后创建令牌
            this.showAlert('正在自动创建令牌...', 'info');

            const response = await fetch(`/api/sites/${siteId}/tokens/autoCreate`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert(`成功创建 ${result.createdCount || 0} 个令牌`, 'success');
                // 刷新站点列表
                this.loadApiSites();
            } else {
                this.showAlert(`创建令牌失败: ${result.message}`, 'error');
            }

        } catch (error) {
            console.error('自动创建令牌失败:', error);
            this.showAlert('自动创建令牌失败，请检查网络连接', 'error');
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