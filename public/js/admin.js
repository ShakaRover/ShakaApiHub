// ShakaHub 后台管理系统 JavaScript

// 全局状态管理
const AdminApp = {
    currentPage: 'api-management',
    sidebarCollapsed: false,
    isMobile: false,
    loginTime: Date.now(),
    
    // 初始化应用
    init() {
        this.detectMobile();
        this.bindEvents();
        this.updateTime();
        this.startTimeCounter();
        this.loadUserData();
        
        // 设置初始状态
        if (this.isMobile) {
            this.collapseSidebar();
        }
        
        // 导航到默认页面
        this.navigateToPage(this.currentPage);
    },
    
    // 检测移动设备
    detectMobile() {
        this.isMobile = window.innerWidth <= 768;
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;
            
            if (wasMobile !== this.isMobile) {
                if (this.isMobile) {
                    this.collapseSidebar();
                } else {
                    this.hideMobileSidebar();
                }
            }
        });
    },
    
    // 绑定事件监听器
    bindEvents() {
        // 侧边栏切换按钮
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // 侧边栏覆盖层（移动端）
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => this.hideMobileSidebar());
        }
        
        // 导航链接
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.getAttribute('data-page');
                this.navigateToPage(page);
                
                // 移动端点击导航后隐藏侧边栏
                if (this.isMobile) {
                    this.hideMobileSidebar();
                }
            });
        });
        
        // 用户下拉菜单
        const userDropdownBtn = document.getElementById('userDropdownBtn');
        const userDropdownMenu = document.getElementById('userDropdownMenu');
        
        if (userDropdownBtn && userDropdownMenu) {
            userDropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdownMenu.classList.toggle('show');
            });
            
            // 点击外部关闭下拉菜单
            document.addEventListener('click', (e) => {
                if (!userDropdownBtn.contains(e.target) && !userDropdownMenu.contains(e.target)) {
                    userDropdownMenu.classList.remove('show');
                }
            });
        }
        
        // 登出按钮
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        // 快捷操作按钮
        document.querySelectorAll('button[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.getAttribute('data-page');
                this.navigateToPage(page);
            });
        });
        
        // ESC键关闭下拉菜单和移动端侧边栏
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                userDropdownMenu?.classList.remove('show');
                if (this.isMobile) {
                    this.hideMobileSidebar();
                }
            }
        });
    },
    
    // 页面导航
    navigateToPage(page) {
        if (this.currentPage === page) return;
        
        // 更新当前页面
        this.currentPage = page;
        
        // 隐藏所有页面
        document.querySelectorAll('.page-content').forEach(p => {
            p.classList.remove('active');
        });
        
        // 显示目标页面
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            targetPage.style.animation = 'fadeIn 0.3s ease-in';
        }
        
        // 更新导航链接激活状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        document.querySelectorAll(`[data-page="${page}"]`).forEach(link => {
            if (link.classList.contains('nav-link')) {
                link.classList.add('active');
            }
        });
        
        // 关闭用户下拉菜单
        document.getElementById('userDropdownMenu')?.classList.remove('show');
        
        // 页面特定初始化
        this.initPageSpecific(page);
    },
    
    // 页面特定初始化
    initPageSpecific(page) {
        switch (page) {
            case 'settings':
                // 重新加载用户信息（如果在设置页面）
                if (typeof loadUserProfile === 'function') {
                    loadUserProfile();
                }
                break;
            case 'dashboard':
                this.updateDashboardStats();
                break;
        }
    },
    
    // 切换侧边栏
    toggleSidebar() {
        if (this.isMobile) {
            this.toggleMobileSidebar();
        } else {
            this.toggleDesktopSidebar();
        }
    },
    
    // 桌面端侧边栏切换
    toggleDesktopSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        const navbarBrand = document.getElementById('navbarBrand');
        
        this.sidebarCollapsed = !this.sidebarCollapsed;
        
        if (this.sidebarCollapsed) {
            sidebar?.classList.add('collapsed');
            mainContent?.classList.add('collapsed');
            navbarBrand?.classList.add('collapsed');
        } else {
            sidebar?.classList.remove('collapsed');
            mainContent?.classList.remove('collapsed');
            navbarBrand?.classList.remove('collapsed');
        }
    },
    
    // 移动端侧边栏切换
    toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        const isShown = sidebar?.classList.contains('show');
        
        if (isShown) {
            this.hideMobileSidebar();
        } else {
            this.showMobileSidebar();
        }
    },
    
    // 显示移动端侧边栏
    showMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar?.classList.add('show');
        overlay?.classList.add('show');
        document.body.style.overflow = 'hidden';
    },
    
    // 隐藏移动端侧边栏
    hideMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar?.classList.remove('show');
        overlay?.classList.remove('show');
        document.body.style.overflow = '';
    },
    
    // 折叠侧边栏（初始化时使用）
    collapseSidebar() {
        if (this.isMobile) {
            this.hideMobileSidebar();
        } else {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            const navbarBrand = document.getElementById('navbarBrand');
            
            sidebar?.classList.add('collapsed');
            mainContent?.classList.add('collapsed');
            navbarBrand?.classList.add('collapsed');
            this.sidebarCollapsed = true;
        }
    },
    
    // 更新时间显示
    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
        
        // 更新欢迎消息
        this.updateWelcomeMessage(now);
    },
    
    // 更新欢迎消息
    updateWelcomeMessage(now) {
        const hour = now.getHours();
        let message = '';
        
        if (hour < 6) {
            message = '夜深了，注意休息哦 😴';
        } else if (hour < 9) {
            message = '早上好！新的一天开始了 🌅';
        } else if (hour < 12) {
            message = '上午好！今天也要加油工作哦 💪';
        } else if (hour < 14) {
            message = '中午好！记得按时吃饭 🍽️';
        } else if (hour < 18) {
            message = '下午好！继续保持专注 ⚡';
        } else if (hour < 22) {
            message = '晚上好！今天辛苦了 🌙';
        } else {
            message = '夜深了，早点休息吧 😊';
        }
        
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            welcomeMessage.textContent = message;
        }
    },
    
    // 开始在线时长计数器
    startTimeCounter() {
        const updateOnlineTime = () => {
            const onlineTime = Math.floor((Date.now() - this.loginTime) / 1000);
            const hours = Math.floor(onlineTime / 3600);
            const minutes = Math.floor((onlineTime % 3600) / 60);
            const seconds = onlineTime % 60;
            
            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            const onlineTimeElement = document.getElementById('onlineTime');
            if (onlineTimeElement) {
                onlineTimeElement.textContent = timeString;
            }
        };
        
        // 立即更新一次
        updateOnlineTime();
        
        // 每秒更新
        setInterval(updateOnlineTime, 1000);
        
        // 每分钟更新时间显示
        setInterval(() => this.updateTime(), 60000);
    },
    
    // 加载用户数据
    loadUserData() {
        // 获取用户信息并更新UI
        if (typeof apiRequest === 'function') {
            apiRequest('/profile')
                .then(({ data }) => {
                    if (data.success && data.user) {
                        this.updateUserDisplay(data.user);
                    }
                })
                .catch(error => {
                    console.error('加载用户数据失败:', error);
                });
        }
    },
    
    // 更新用户显示
    updateUserDisplay(user) {
        // 更新用户头像
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar && user.username) {
            userAvatar.textContent = user.username.charAt(0).toUpperCase();
        }
        
        // 更新用户名显示
        const userDisplayName = document.getElementById('userDisplayName');
        if (userDisplayName) {
            userDisplayName.textContent = user.username;
        }
        
        // 更新页面标题
        document.title = `ShakaHub - ${user.username} 的管理后台`;
    },
    
    // 更新仪表板统计
    updateDashboardStats() {
        // 这里可以添加更多的统计数据更新逻辑
        // 目前主要是演示功能
    },
    
    // 处理登出
    async handleLogout() {
        if (typeof handleLogout === 'function') {
            await handleLogout();
        } else {
            // 降级处理
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    window.location.href = '/index.html';
                } else {
                    console.error('登出失败');
                }
            } catch (error) {
                console.error('登出过程中发生错误:', error);
            }
        }
    }
};

// 初始化管理面板
function initAdminPanel() {
    AdminApp.init();
}

// 导出给全局使用
window.AdminApp = AdminApp;
window.initAdminPanel = initAdminPanel;

// CSS样式调整函数
function addPageContentStyles() {
    if (!document.getElementById('admin-page-styles')) {
        const style = document.createElement('style');
        style.id = 'admin-page-styles';
        style.textContent = `
            .page-content {
                display: none;
            }
            .page-content.active {
                display: block;
            }
            .user-info {
                background: var(--background);
                border-radius: 8px;
                padding: 1rem;
                border: 1px solid var(--border-color);
            }
            .user-info p {
                margin-bottom: 0.5rem;
                color: var(--text-color);
            }
            .user-info p:last-child {
                margin-bottom: 0;
            }
        `;
        document.head.appendChild(style);
    }
}

// DOM加载完成后添加样式
document.addEventListener('DOMContentLoaded', addPageContentStyles);

// 数据管理功能模块
const DataManager = {
    initialized: false, // 添加初始化标志
    allBackups: [], // 存储所有备份数据
    filteredBackups: [], // 存储过滤后的备份数据
    selectedBackups: new Set(), // 存储选中的备份
    
    // 初始化数据管理功能
    init() {
        if (this.initialized) {
            // 如果已经初始化过，只刷新数据
            this.loadBackupList();
            this.updateNextBackupTime();
            return;
        }
        
        this.bindTabEvents();
        this.bindExportEvents();
        this.bindImportEvents();
        this.bindBackupEvents();
        this.bindBackupFilterEvents(); // 绑定过滤事件
        this.loadBackupList();
        this.updateNextBackupTime();
        
        this.initialized = true; // 标记为已初始化
    },

    // 绑定选项卡切换事件
    bindTabEvents() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });
    },

    // 切换选项卡
    switchTab(tabName) {
        // 更新选项卡按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 更新内容区域显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // 如果切换到备份管理，刷新备份列表
        if (tabName === 'backup') {
            this.loadBackupList();
        }
    },

    // 绑定导出功能事件
    bindExportEvents() {
        const exportTypeSelect = document.getElementById('exportType');
        const siteSelectionGroup = document.getElementById('siteSelectionGroup');
        const exportBtn = document.getElementById('exportBtn');

        // 导出类型变化事件
        exportTypeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'selected') {
                siteSelectionGroup.style.display = 'block';
                this.loadSiteCheckboxList();
            } else {
                siteSelectionGroup.style.display = 'none';
            }
        });

        // 导出按钮点击事件
        exportBtn.addEventListener('click', () => {
            this.handleExport();
        });
    },

    // 加载站点复选框列表
    async loadSiteCheckboxList() {
        try {
            const response = await fetch('/api/sites/my');
            const result = await response.json();
            
            if (result.success) {
                const container = document.getElementById('siteCheckboxList');
                container.innerHTML = '';
                
                result.data.forEach(site => {
                    const checkboxItem = document.createElement('div');
                    checkboxItem.className = 'checkbox-item';
                    checkboxItem.innerHTML = `
                        <label class="checkbox-label">
                            <input type="checkbox" value="${site.id}" name="siteIds" />
                            <span class="checkmark"></span>
                            ${site.name} (${site.api_type})
                        </label>
                    `;
                    container.appendChild(checkboxItem);
                });
            }
        } catch (error) {
            console.error('加载站点列表失败:', error);
            showAlert('加载站点列表失败', 'error');
        }
    },

    // 处理导出
    async handleExport() {
        try {
            const exportType = document.getElementById('exportType').value;
            let queryParams = `exportType=${exportType}`;
            
            if (exportType === 'selected') {
                const selectedSites = Array.from(document.querySelectorAll('input[name="siteIds"]:checked'))
                    .map(checkbox => checkbox.value);
                
                if (selectedSites.length === 0) {
                    showAlert('请至少选择一个站点', 'warning');
                    return;
                }
                
                queryParams += `&siteIds=${selectedSites.join(',')}`;
            }

            // 创建下载链接
            const downloadUrl = `/api/sites/export?${queryParams}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `api_sites_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showAlert('配置导出成功', 'success');
        } catch (error) {
            console.error('导出失败:', error);
            showAlert('导出失败: ' + error.message, 'error');
        }
    },

    // 绑定导入功能事件
    bindImportEvents() {
        const importFileInput = document.getElementById('importFile');
        const importBtn = document.getElementById('importBtn');
        const skipExistingCheckbox = document.getElementById('skipExisting');
        const overwriteExistingCheckbox = document.getElementById('overwriteExisting');

        // 文件选择事件
        importFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importBtn.disabled = false;
                this.previewImportFile(e.target.files[0]);
            } else {
                importBtn.disabled = true;
                this.hideImportPreview();
            }
        });

        // 互斥复选框
        skipExistingCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                overwriteExistingCheckbox.checked = false;
            }
        });

        overwriteExistingCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                skipExistingCheckbox.checked = false;
            }
        });

        // 导入按钮点击事件
        importBtn.addEventListener('click', () => {
            this.handleImport();
        });
    },

    // 预览导入文件
    async previewImportFile(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // 验证文件格式
            if (!data.sites || !Array.isArray(data.sites)) {
                throw new Error('无效的导入文件格式');
            }

            // 显示预览信息
            const previewContainer = document.getElementById('importPreview');
            const previewInfo = document.getElementById('previewInfo');
            const previewSites = document.getElementById('previewSites');

            previewInfo.innerHTML = `
                <div class="preview-info">
                    <p><strong>文件信息:</strong></p>
                    <ul>
                        <li>导出时间: ${data.metadata?.exportTime || '未知'}</li>
                        <li>版本: ${data.metadata?.version || '未知'}</li>
                        <li>站点数量: ${data.sites.length}</li>
                    </ul>
                </div>
            `;

            // 显示站点列表预览
            let sitesHtml = '<div class="preview-sites"><h4>包含的站点:</h4><ul>';
            data.sites.forEach(site => {
                sitesHtml += `<li>${site.name} (${site.apiType}) - ${site.url}</li>`;
            });
            sitesHtml += '</ul></div>';
            previewSites.innerHTML = sitesHtml;

            previewContainer.style.display = 'block';
        } catch (error) {
            console.error('预览文件失败:', error);
            showAlert('无效的导入文件: ' + error.message, 'error');
            this.hideImportPreview();
        }
    },

    // 隐藏导入预览
    hideImportPreview() {
        document.getElementById('importPreview').style.display = 'none';
    },

    // 处理导入
    async handleImport() {
        try {
            const fileInput = document.getElementById('importFile');
            const file = fileInput.files[0];
            
            if (!file) {
                showAlert('请选择导入文件', 'warning');
                return;
            }

            const text = await file.text();
            const importData = JSON.parse(text);

            const options = {
                skipExisting: document.getElementById('skipExisting').checked,
                overwrite: document.getElementById('overwriteExisting').checked
            };

            const response = await fetch('/api/sites/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ importData, options })
            });

            const result = await response.json();

            if (result.success) {
                const { data } = result;
                let message = `导入完成: 成功${data.success}个`;
                if (data.failed > 0) message += `, 失败${data.failed}个`;
                if (data.skipped > 0) message += `, 跳过${data.skipped}个`;
                
                showAlert(message, data.failed > 0 ? 'warning' : 'success');
                
                // 如果有错误，显示详细信息
                if (data.errors.length > 0) {
                    console.log('导入错误详情:', data.errors);
                }

                // 清空文件输入和预览
                fileInput.value = '';
                document.getElementById('importBtn').disabled = true;
                this.hideImportPreview();
                
                // 刷新API管理页面（如果存在）
                if (typeof window.ApiSiteManager !== 'undefined') {
                    window.ApiSiteManager.loadApiSites();
                }
            } else {
                showAlert('导入失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('导入失败:', error);
            showAlert('导入失败: ' + error.message, 'error');
        }
    },

    // 绑定备份功能事件
    bindBackupEvents() {
        const createBackupBtn = document.getElementById('createBackupBtn');
        const refreshBackupsBtn = document.getElementById('refreshBackupsBtn');

        createBackupBtn.addEventListener('click', () => {
            this.createBackup();
        });

        refreshBackupsBtn.addEventListener('click', () => {
            this.loadBackupList();
        });
    },

    // 绑定备份过滤事件
    bindBackupFilterEvents() {
        const applyFiltersBtn = document.getElementById('applyBackupFiltersBtn');
        const clearFiltersBtn = document.getElementById('clearBackupFiltersBtn');
        const selectAllBtn = document.getElementById('selectAllBackupsBtn');
        const batchDeleteBtn = document.getElementById('batchDeleteBackupsBtn');

        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyBackupFilters();
            });
        }

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearBackupFilters();
            });
        }

        if (selectAllBtn) {
            selectAllBtn.addEventListener('change', (e) => {
                this.toggleSelectAllBackups(e.target.checked);
            });
        }

        if (batchDeleteBtn) {
            batchDeleteBtn.addEventListener('click', () => {
                this.showBatchDeleteConfirm();
            });
        }
    },

    // 应用备份过滤
    applyBackupFilters() {
        const typeFilter = document.getElementById('backupTypeFilter')?.value;
        const dateFilter = document.getElementById('backupDateFilter')?.value;
        const sizeFilter = document.getElementById('backupSizeFilter')?.value;

        this.filteredBackups = this.allBackups.filter(backup => {
            // 类型过滤
            if (typeFilter && backup.backupType !== typeFilter) {
                return false;
            }

            // 日期过滤
            if (dateFilter) {
                const backupDate = new Date(backup.createdAt).toISOString().split('T')[0];
                if (backupDate !== dateFilter) {
                    return false;
                }
            }

            // 大小过滤
            if (sizeFilter) {
                const fileSizeInMB = backup.fileSize / (1024 * 1024);
                if (sizeFilter === 'small' && fileSizeInMB >= 1) return false;
                if (sizeFilter === 'medium' && (fileSizeInMB < 1 || fileSizeInMB > 5)) return false;
                if (sizeFilter === 'large' && fileSizeInMB <= 5) return false;
            }

            return true;
        });

        this.renderBackupList(this.filteredBackups);
        showAlert(`已筛选出 ${this.filteredBackups.length} 个备份文件`, 'info');
    },

    // 清除备份过滤
    clearBackupFilters() {
        // 清空过滤条件
        const typeFilter = document.getElementById('backupTypeFilter');
        const dateFilter = document.getElementById('backupDateFilter');
        const sizeFilter = document.getElementById('backupSizeFilter');

        if (typeFilter) typeFilter.value = '';
        if (dateFilter) dateFilter.value = '';
        if (sizeFilter) sizeFilter.value = '';

        // 重置过滤结果
        this.filteredBackups = [...this.allBackups];
        this.renderBackupList(this.filteredBackups);
        showAlert('过滤条件已清除', 'success');
    },

    // 全选/取消全选备份
    toggleSelectAllBackups(selectAll) {
        const checkboxes = document.querySelectorAll('.backup-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
            const fileName = checkbox.dataset.filename;
            if (selectAll) {
                this.selectedBackups.add(fileName);
            } else {
                this.selectedBackups.delete(fileName);
            }
        });

        this.updateBatchDeleteButton();
    },

    // 更新批量删除按钮状态
    updateBatchDeleteButton() {
        const batchDeleteBtn = document.getElementById('batchDeleteBackupsBtn');
        if (batchDeleteBtn) {
            if (this.selectedBackups.size > 0) {
                batchDeleteBtn.style.display = 'inline-block';
                batchDeleteBtn.textContent = `🗑️ 批量删除 (${this.selectedBackups.size})`;
            } else {
                batchDeleteBtn.style.display = 'none';
            }
        }
    },

    // 创建备份
    async createBackup() {
        try {
            const includeAllUsers = document.getElementById('includeAllUsers').checked;
            
            const response = await fetch('/api/backups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    backupType: 'manual',
                    includeAllUsers
                })
            });

            const result = await response.json();

            if (result.success) {
                showAlert(result.message, 'success');
                this.loadBackupList();
            } else {
                showAlert('创建备份失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('创建备份失败:', error);
            showAlert('创建备份失败: ' + error.message, 'error');
        }
    },

    // 加载备份列表
    async loadBackupList() {
        try {
            const response = await fetch('/api/backups');
            const result = await response.json();

            if (result.success) {
                this.allBackups = result.data;
                this.filteredBackups = [...this.allBackups]; // 初始化过滤数据
                this.renderBackupList(this.filteredBackups);
            } else {
                showAlert('加载备份列表失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('加载备份列表失败:', error);
            showAlert('加载备份列表失败: ' + error.message, 'error');
        }
    },

    // 渲染备份列表
    renderBackupList(backups) {
        const container = document.getElementById('backupsList');
        
        if (backups.length === 0) {
            container.innerHTML = '<p class="text-muted">暂无备份文件</p>';
            this.updateBatchDeleteButton();
            return;
        }

        let html = '<div class="backup-items">';
        backups.forEach(backup => {
            const createdAt = new Date(backup.createdAt).toLocaleString('zh-CN');
            const fileSize = this.formatFileSize(backup.fileSize);
            const backupTypeText = backup.backupType === 'auto' ? '自动' : '手动';
            const isSelected = this.selectedBackups.has(backup.fileName);
            
            html += `
                <div class="backup-item">
                    <div class="backup-checkbox-wrapper">
                        <label class="checkbox-label">
                            <input type="checkbox" class="backup-checkbox" data-filename="${backup.fileName}" ${isSelected ? 'checked' : ''} />
                            <span class="checkmark"></span>
                        </label>
                    </div>
                    <div class="backup-info">
                        <div class="backup-name">${backup.fileName}</div>
                        <div class="backup-meta">
                            <span class="backup-type badge ${backup.backupType}">${backupTypeText}</span>
                            <span>创建时间: ${createdAt}</span>
                            <span>文件大小: ${fileSize}</span>
                            <span>站点数量: ${backup.sitesCount}</span>
                        </div>
                    </div>
                    <div class="backup-actions">
                        <button class="btn btn-sm btn-info download-backup-btn" data-filename="${backup.fileName}" title="下载备份文件">
                            📥 下载
                        </button>
                        <button class="btn btn-sm btn-secondary restore-backup-btn" data-filename="${backup.fileName}" title="恢复备份">
                            🔄 恢复
                        </button>
                        <button class="btn btn-sm btn-danger delete-backup-btn" data-filename="${backup.fileName}" title="删除备份">
                            🗑️ 删除
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
        
        // 重新绑定事件监听器
        this.bindBackupActionEvents();
        this.updateBatchDeleteButton();
    },

    // 绑定备份操作事件
    bindBackupActionEvents() {
        const container = document.getElementById('backupsList');
        if (!container) return;

        // 复选框事件
        container.querySelectorAll('.backup-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const fileName = e.target.getAttribute('data-filename');
                if (e.target.checked) {
                    this.selectedBackups.add(fileName);
                } else {
                    this.selectedBackups.delete(fileName);
                }
                this.updateBatchDeleteButton();
            });
        });

        // 下载备份按钮事件
        container.querySelectorAll('.download-backup-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fileName = e.target.getAttribute('data-filename');
                this.downloadBackup(fileName);
            });
        });

        // 恢复备份按钮事件
        container.querySelectorAll('.restore-backup-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fileName = e.target.getAttribute('data-filename');
                this.restoreBackup(fileName);
            });
        });

        // 删除备份按钮事件
        container.querySelectorAll('.delete-backup-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fileName = e.target.getAttribute('data-filename');
                this.deleteBackup(fileName);
            });
        });
    },

    // 恢复备份
    async restoreBackup(fileName) {
        if (!confirm(`确定要恢复备份 "${fileName}" 吗？这可能会覆盖现有的站点配置。`)) {
            return;
        }

        try {
            const response = await fetch('/api/backups/restore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileName,
                    options: {
                        skipExisting: true, // 默认跳过已存在的站点
                        overwrite: false
                    }
                })
            });

            const result = await response.json();

            if (result.success) {
                const { data } = result;
                let message = `恢复完成: 成功${data.success}个`;
                if (data.failed > 0) message += `, 失败${data.failed}个`;
                if (data.skipped > 0) message += `, 跳过${data.skipped}个`;
                
                showAlert(message, data.failed > 0 ? 'warning' : 'success');
                
                // 刷新API管理页面（如果存在）
                if (typeof window.ApiSiteManager !== 'undefined') {
                    window.ApiSiteManager.loadApiSites();
                }
            } else {
                showAlert('恢复备份失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('恢复备份失败:', error);
            showAlert('恢复备份失败: ' + error.message, 'error');
        }
    },

    // 删除备份
    async deleteBackup(fileName) {
        if (!confirm(`确定要删除备份 "${fileName}" 吗？此操作不可恢复。`)) {
            return;
        }

        try {
            const response = await fetch(`/api/backups/${encodeURIComponent(fileName)}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                showAlert(result.message, 'success');
                this.selectedBackups.delete(fileName); // 从选中集合中移除
                this.loadBackupList();
            } else {
                showAlert('删除备份失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('删除备份失败:', error);
            showAlert('删除备份失败: ' + error.message, 'error');
        }
    },

    // 下载备份文件
    downloadBackup(fileName) {
        try {
            // 创建下载链接
            const link = document.createElement('a');
            link.href = `/api/backups/${encodeURIComponent(fileName)}/download`;
            link.download = fileName;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showAlert('备份文件下载已开始', 'success');
        } catch (error) {
            console.error('下载备份失败:', error);
            showAlert('下载备份失败: ' + error.message, 'error');
        }
    },

    // 显示批量删除确认对话框
    showBatchDeleteConfirm() {
        const selectedFiles = Array.from(this.selectedBackups);
        if (selectedFiles.length === 0) {
            showAlert('请先选择要删除的备份文件', 'warning');
            return;
        }

        const fileList = selectedFiles.map(f => `• ${f}`).join('\n');
        const confirmMessage = `确定要删除以下 ${selectedFiles.length} 个备份文件吗？此操作不可恢复。\n\n${fileList}`;
        
        if (confirm(confirmMessage)) {
            this.batchDeleteBackups(selectedFiles);
        }
    },

    // 批量删除备份
    async batchDeleteBackups(fileNames) {
        try {
            showAlert(`正在删除 ${fileNames.length} 个备份文件...`, 'info');
            
            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            // 逐个删除备份文件
            for (const fileName of fileNames) {
                try {
                    const response = await fetch(`/api/backups/${encodeURIComponent(fileName)}`, {
                        method: 'DELETE'
                    });

                    const result = await response.json();

                    if (result.success) {
                        successCount++;
                        this.selectedBackups.delete(fileName);
                    } else {
                        errorCount++;
                        errors.push(`${fileName}: ${result.message}`);
                    }
                } catch (error) {
                    errorCount++;
                    errors.push(`${fileName}: ${error.message}`);
                }
            }

            // 显示结果
            let message = `批量删除完成！成功删除 ${successCount} 个文件`;
            if (errorCount > 0) {
                message += `，失败 ${errorCount} 个文件`;
                console.error('批量删除错误:', errors);
            }

            showAlert(message, errorCount === 0 ? 'success' : 'warning');
            
            // 刷新备份列表
            this.loadBackupList();
            
            // 取消全选状态
            const selectAllBtn = document.getElementById('selectAllBackupsBtn');
            if (selectAllBtn) {
                selectAllBtn.checked = false;
            }

        } catch (error) {
            console.error('批量删除失败:', error);
            showAlert('批量删除失败: ' + error.message, 'error');
        }
    },

    // 更新下次备份时间
    updateNextBackupTime() {
        const nextBackupElement = document.getElementById('nextBackupTime');
        if (nextBackupElement) {
            const now = new Date();
            const nextBackup = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24小时后
            nextBackupElement.textContent = nextBackup.toLocaleString('zh-CN');
        }
    },

    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// 扩展AdminApp以包含数据管理功能
const originalNavigateToPage = AdminApp.navigateToPage;
AdminApp.navigateToPage = function(pageName) {
    originalNavigateToPage.call(this, pageName);
    
    // 如果切换到数据管理页面，初始化数据管理功能
    if (pageName === 'data-management') {
        setTimeout(() => {
            DataManager.init();
        }, 100);
    }
    
    // 如果切换到日志管理页面，初始化日志管理功能
    if (pageName === 'logs' && typeof logManager !== 'undefined') {
        setTimeout(() => {
            logManager.initLogPage();
        }, 100);
    }
};

// 导出数据管理器供全局使用
window.DataManager = DataManager;