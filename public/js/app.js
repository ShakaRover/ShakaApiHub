// 工具函数
const API_BASE = '/api/auth';

// DOM操作工具
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// 显示浮窗提示消息
function showAlert(message, type = 'error') {
    const alertContainer = $('#alert-container');
    if (!alertContainer) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // 添加到容器顶部
    alertContainer.insertBefore(alertDiv, alertContainer.firstChild);
    
    // 触发滑入动画
    requestAnimationFrame(() => {
        alertDiv.classList.add('slide-up');
    });
    
    // 3.5秒后自动消失
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.style.transform = 'translateX(100%)';
            alertDiv.style.opacity = '0';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 300);
        }
    }, 3500);
    
    // 限制最多显示3个提示
    const alerts = alertContainer.querySelectorAll('.alert');
    if (alerts.length > 3) {
        const oldestAlert = alerts[alerts.length - 1];
        oldestAlert.style.transform = 'translateX(100%)';
        oldestAlert.style.opacity = '0';
        setTimeout(() => {
            if (oldestAlert.parentNode) {
                oldestAlert.remove();
            }
        }, 300);
    }
}

// 清除警告消息
function clearAlerts() {
    const alertContainer = $('#alert-container');
    if (alertContainer) {
        alertContainer.innerHTML = '';
    }
}

// 设置按钮加载状态
function setButtonLoading(buttonId, loading = true) {
    const btn = $(`#${buttonId}`);
    const text = $(`#${buttonId.replace('Btn', 'Text')}`);
    const loadingSpinner = $(`#${buttonId.replace('Btn', 'Loading')}`);
    
    if (btn && text && loadingSpinner) {
        btn.disabled = loading;
        text.style.display = loading ? 'none' : 'inline';
        loadingSpinner.style.display = loading ? 'inline-block' : 'none';
    }
}

// API请求封装
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include'
    };
    
    const config = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();
        return { response, data };
    } catch (error) {
        console.error('API请求失败:', error);
        throw new Error('网络连接失败，请检查网络连接');
    }
}

// 检查认证状态
async function checkAuthStatus() {
    try {
        const { data } = await apiRequest('/profile');
        if (!data.success) {
            window.location.href = '/index.html';
        }
    } catch (error) {
        window.location.href = '/index.html';
    }
}

// 登录功能
async function handleLogin(event) {
    event.preventDefault();
    clearAlerts();
    
    const username = $('#username').value.trim();
    const password = $('#password').value;
    
    if (!username || !password) {
        showAlert('请填写用户名和密码');
        return;
    }
    
    setButtonLoading('loginBtn', true);
    
    try {
        const { response, data } = await apiRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (data.success) {
            showAlert('登录成功，正在跳转...', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            showAlert(data.message || '登录失败');
        }
    } catch (error) {
        showAlert(error.message);
    } finally {
        setButtonLoading('loginBtn', false);
    }
}

// 加载用户信息
async function loadUserProfile() {
    try {
        const { data } = await apiRequest('/profile');
        if (data.success) {
            const user = data.user;
            if ($('#currentUsername')) $('#currentUsername').textContent = user.username;
            if ($('#createdAt')) $('#createdAt').textContent = new Date(user.created_at).toLocaleString('zh-CN');
            if ($('#updatedAt')) $('#updatedAt').textContent = new Date(user.updated_at).toLocaleString('zh-CN');
        }
    } catch (error) {
        console.error('加载用户信息失败:', error);
    }
}

// 更新用户名
async function handleUsernameUpdate(event) {
    event.preventDefault();
    clearAlerts();
    
    const newUsername = $('#newUsername').value.trim();
    
    if (!newUsername) {
        showAlert('请输入新用户名');
        return;
    }
    
    setButtonLoading('usernameBtn', true);
    
    try {
        const { response, data } = await apiRequest('/update-username', {
            method: 'POST',
            body: JSON.stringify({ newUsername })
        });
        
        if (data.success) {
            showAlert('用户名更新成功', 'success');
            $('#newUsername').value = '';
            loadUserProfile(); // 重新加载用户信息
        } else {
            showAlert(data.message || '用户名更新失败');
        }
    } catch (error) {
        showAlert(error.message);
    } finally {
        setButtonLoading('usernameBtn', false);
    }
}

// 更新密码
async function handlePasswordUpdate(event) {
    event.preventDefault();
    clearAlerts();
    
    const currentPassword = $('#currentPassword').value;
    const newPassword = $('#newPassword').value;
    const confirmPassword = $('#confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert('请填写所有密码字段');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showAlert('新密码与确认密码不匹配');
        return;
    }
    
    if (newPassword.length < 6) {
        showAlert('新密码长度至少6个字符');
        return;
    }
    
    setButtonLoading('passwordBtn', true);
    
    try {
        const { response, data } = await apiRequest('/update-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        if (data.success) {
            showAlert('密码更新成功', 'success');
            $('#currentPassword').value = '';
            $('#newPassword').value = '';
            $('#confirmPassword').value = '';
        } else {
            showAlert(data.message || '密码更新失败');
        }
    } catch (error) {
        showAlert(error.message);
    } finally {
        setButtonLoading('passwordBtn', false);
    }
}

// 登出功能
async function handleLogout() {
    clearAlerts();
    setButtonLoading('logoutBtn', true);
    
    try {
        const { response, data } = await apiRequest('/logout', {
            method: 'POST'
        });
        
        if (data.success) {
            showAlert('已成功登出', 'success');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1000);
        } else {
            showAlert(data.message || '登出失败');
        }
    } catch (error) {
        showAlert(error.message);
    } finally {
        setButtonLoading('logoutBtn', false);
    }
}

// DOM加载完成后绑定事件
document.addEventListener('DOMContentLoaded', function() {
    // 登录表单
    const loginForm = $('#loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // 用户名更新表单
    const usernameForm = $('#usernameForm');
    if (usernameForm) {
        usernameForm.addEventListener('submit', handleUsernameUpdate);
    }
    
    // 密码更新表单
    const passwordForm = $('#passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordUpdate);
    }
    
    // 登出按钮
    const logoutBtn = $('#logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 回车键快捷提交
    document.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.tagName === 'INPUT') {
                const form = activeElement.closest('form');
                if (form) {
                    form.dispatchEvent(new Event('submit'));
                }
            }
        }
    });
});

// 导出函数供HTML使用
window.checkAuthStatus = checkAuthStatus;
window.loadUserProfile = loadUserProfile;