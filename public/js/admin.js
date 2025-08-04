// ShakaHub 后台管理系统 JavaScript

// 全局状态管理
const AdminApp = {
    currentPage: 'dashboard',
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