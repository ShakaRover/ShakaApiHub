const ApiClientBase = require('../base/ApiClientBase');

/**
 * 站点API操作统一管理器
 * 负责所有与站点相关的API操作，如获取用户信息、令牌列表、模型列表等
 * 
 * 遵循SOLID原则：
 * - 单一职责：专门处理站点API操作
 * - 依赖倒置：继承ApiClientBase获得通用API处理能力
 * - 开放封闭：可扩展新的API操作，不修改现有方法
 */
class SiteApiOperations extends ApiClientBase {
    constructor() {
        super();
    }

    /**
     * 获取用户信息
     * 
     * @param {string} siteUrl - 站点URL
     * @param {string} cookies - cookies字符串
     * @param {string} sessions - sessions字符串
     * @param {Object} site - 站点信息对象
     * @returns {Promise<Object>} 用户信息数据
     */
    async getUserInfo(siteUrl, cookies, sessions, site) {
        try {
            const apiUrl = `${siteUrl.replace(/\/$/, '')}/api/user/self`;
            const context = '[用户信息]';

            const response = await this.get(apiUrl, site, sessions, cookies, context);
            const data = this.processApiResponse(response, context);

            if (!data.success) {
                throw new Error(data.message || '获取用户信息失败');
            }

            if (!data.data) {
                throw new Error('API返回数据中缺少data字段');
            }

            return data.data;

        } catch (error) {
            console.error('获取用户信息失败详情:', {
                code: error.code,
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
                url: siteUrl
            });

            if (error.code === 'ECONNABORTED') {
                throw new Error('请求超时');
            } else if (error.response) {
                const responseText = typeof error.response.data === 'string'
                    ? error.response.data.substring(0, 200)
                    : JSON.stringify(error.response.data).substring(0, 200);
                throw new Error(`HTTP ${error.response.status}: ${error.response.statusText} - ${responseText}`);
            } else {
                throw error;
            }
        }
    }

    /**
     * 获取模型列表
     * 
     * @param {string} siteUrl - 站点URL
     * @param {string} cookies - cookies字符串
     * @param {string} sessions - sessions字符串
     * @param {Object} site - 站点信息对象
     * @returns {Promise<Object>} 模型列表结果
     */
    async getModelsList(siteUrl, cookies, sessions, site) {
        try {
            const apiUrl = `${siteUrl.replace(/\/$/, '')}/api/user/models`;
            const context = '[模型列表]';

            const response = await this.get(apiUrl, site, sessions, cookies, context);
            const data = this.processApiResponse(response, context);

            if (!data || typeof data !== 'object') {
                return {
                    success: false,
                    message: '模型列表API返回数据格式错误',
                    data: null
                };
            }

            if (!data.success) {
                return {
                    success: false,
                    message: data.message || '获取模型列表失败',
                    data: null
                };
            }

            if (!data.data || !Array.isArray(data.data)) {
                return {
                    success: false,
                    message: '模型列表数据格式异常',
                    data: null
                };
            }

            return {
                success: true,
                message: `获取到${data.data.length}个模型`,
                data: data.data
            };

        } catch (error) {
            console.error('获取模型列表失败:', error.message);
            return {
                success: false,
                message: `获取模型列表失败: ${error.message}`,
                data: null
            };
        }
    }

    /**
     * 获取令牌列表
     * 支持多种JSON响应格式: data.data.records, data.data.items, data.data.data, data.data
     * 
     * @param {string} siteUrl - 站点URL
     * @param {string} cookies - cookies字符串
     * @param {string} sessions - sessions字符串
     * @param {Object} site - 站点信息对象
     * @returns {Promise<Object>} 令牌列表结果
     */
    async getTokensList(siteUrl, cookies, sessions, site) {
        try {
            const apiUrl = `${siteUrl.replace(/\/$/, '')}/api/token/?p=0&size=10`;
            const context = '[令牌列表]';

            const response = await this.get(apiUrl, site, sessions, cookies, context);
            const data = this.processApiResponse(response, context);

            if (!data || typeof data !== 'object') {
                return {
                    success: false,
                    message: '令牌列表API返回数据格式错误',
                    data: null
                };
            }

            if (!data.success) {
                return {
                    success: false,
                    message: data.message || '获取令牌列表失败',
                    data: null
                };
            }

            // 兼容多种不同的响应格式
            let tokensList = null;
            let tokensCount = 0;
            let formatUsed = '';

            // 格式1: data.data.records (分页格式)
            if (data.data && data.data.records && Array.isArray(data.data.records)) {
                tokensList = data.data.records;
                tokensCount = data.data.records.length;
                formatUsed = 'data.data.records';
                console.log(`${context}使用格式1: data.data.records`);
            }
            // 格式2: data.data.items (简单格式)
            else if (data.data && data.data.items && Array.isArray(data.data.items)) {
                tokensList = data.data.items;
                tokensCount = data.data.items.length;
                formatUsed = 'data.data.items';
                console.log(`${context}使用格式2: data.data.items`);
            }
            // 格式3: data.data.data (新嵌套格式)
            else if (data.data && data.data.data && Array.isArray(data.data.data)) {
                tokensList = data.data.data;
                tokensCount = data.data.data.length;
                formatUsed = 'data.data.data';
                console.log(`${context}使用格式3: data.data.data (新嵌套格式)`);
            }
            // 格式4: data.data (数组直接在data.data内)
            else if (data.data && Array.isArray(data.data)) {
                tokensList = data.data;
                tokensCount = data.data.length;
                formatUsed = 'data.data';
                console.log(`${context}使用格式4: data.data (数组格式)`);
            }
            // 格式不匹配
            else {
                console.error(`${context}数据格式不匹配，期望以下格式之一：data.data.records、data.data.items、data.data.data 或 data.data (数组)`);
                console.error(`${context}实际接收到的数据结构:`, JSON.stringify(data.data, null, 2));
                return {
                    success: false,
                    message: '令牌列表数据格式异常，请检查API响应格式',
                    data: null
                };
            }

            return {
                success: true,
                message: `获取到${tokensCount}个令牌 (使用${formatUsed}格式)`,
                data: tokensList,
                metadata: {
                    format: formatUsed,
                    count: tokensCount,
                    // 如果是新格式，还可能包含分页信息
                    pagination: data.data?.page ? {
                        page: data.data.page,
                        size: data.data.size,
                        total_count: data.data.total_count
                    } : null
                }
            };

        } catch (error) {
            console.error('获取令牌列表失败:', error.message);
            return {
                success: false,
                message: `获取令牌列表失败: ${error.message}`,
                data: null
            };
        }
    }

    /**
     * 执行签到操作
     * 支持Veloera, AnyRouter, VoApi三种API类型的签到
     * 
     * @param {string} siteUrl - 站点URL
     * @param {string} cookies - cookies字符串
     * @param {string} sessions - sessions字符串
     * @param {Object} site - 站点信息对象
     * @returns {Promise<Object>} 签到结果
     */
    async performCheckin(siteUrl, cookies, sessions, site) {
        try {
            // 确定签到API路径
            let checkinPath;
            if (site.api_type === 'Veloera') {
                checkinPath = '/api/user/check_in';
            } else if (site.api_type === 'AnyRouter') {
                checkinPath = '/api/user/sign_in';
            } else if (site.api_type === 'VoApi') {
                checkinPath = '/api/user/clock_in';
            } else {
                console.log(`${site.api_type} 不支持签到`);
                return {
                    success: false,
                    message: `API类型 ${site.api_type} 不支持签到`
                };
            }

            const checkinUrl = `${siteUrl.replace(/\/$/, '')}${checkinPath}`;
            const context = '[签到]';
            
            console.log(`${context}站点URL: ${siteUrl}, 签到路径: ${checkinPath}`);

            // 发送POST请求进行签到
            const response = await this.post(checkinUrl, {}, site, sessions, cookies, context);
            
            console.log(`${context}API响应状态: ${response.status}`);
            console.log(`${context}响应数据: ${JSON.stringify(response.data, null, 2)}`);

            const data = response.data;

            // 检查响应格式
            if (!data || typeof data !== 'object') {
                console.log(`${context}响应格式异常，跳过签到处理`);
                return {
                    success: false,
                    message: '签到响应格式异常'
                };
            }

            // 分析签到结果
            const success = data.success === true;
            const message = data.message || '';

            if (success && message && !message.includes('已经签到')) {
                // 签到成功
                console.log(`${context}✅ 签到成功: ${message}`);
                return {
                    success: true,
                    message: `签到成功: ${message}`,
                    type: 'checkin_success'
                };
            } else if (success && (!message || message.includes('已经签到'))) {
                // 已经签到过了
                console.log(`${context}ℹ️  今日已签到: ${message || '已签到'}`);
                return {
                    success: true,
                    message: `今日已签到: ${message || '已签到'}`,
                    type: 'already_checked_in'
                };
            } else {
                // 签到失败
                console.log(`${context}❌ 签到失败: ${message}`);
                return {
                    success: false,
                    message: `签到失败: ${message}`,
                    type: 'checkin_failed'
                };
            }

        } catch (error) {
            console.error('[签到]过程中出现异常:', error.message);
            return {
                success: false,
                message: `签到异常: ${error.message}`,
                type: 'checkin_error'
            };
        }
    }

    /**
     * 获取站点cookies
     * 首先尝试访问logo.png，如果失败则回退到站点首页
     * 
     * @param {string} siteUrl - 站点URL
     * @returns {Promise<string>} cookies字符串
     */
    async getSiteCookies(siteUrl) {
        // 首先尝试访问 logo.png
        const logoUrl = `${siteUrl.replace(/\/$/, '')}/logo.png`;
        console.log(`[Cookies]首先尝试访问logo: ${logoUrl}`);

        try {
            const logoResponse = await this.get(logoUrl, {}, '', '', '[Logo]', {
                validateStatus: () => true, // 接受所有状态码
                maxRedirects: 0 // 不处理重定向
            });

            console.log(`[Logo]响应状态: ${logoResponse.status}`);

            // 如果logo存在（状态码200-299），使用logo的cookies
            if (logoResponse.status >= 200 && logoResponse.status < 300) {
                console.log('[Logo]存在，使用logo响应的cookies');
                return this.extractCookiesFromResponse(logoResponse, logoUrl);
            } else if (logoResponse.status >= 300 && logoResponse.status < 400) {
                // 处理重定向响应，从重定向中获取cookies
                console.log(`[Logo]返回重定向 (${logoResponse.status})，从重定向响应中获取cookies`);
                const redirectLocation = logoResponse.headers.location;
                console.log(`[Logo]重定向到: ${redirectLocation}`);
                return this.extractCookiesFromResponse(logoResponse, logoUrl);
            } else {
                console.log(`[Logo]不存在 (状态码: ${logoResponse.status})，回退到站点首页`);
            }
        } catch (error) {
            // 检查是否是重定向错误
            if (error.response && error.response.status >= 300 && error.response.status < 400) {
                console.log(`[Logo]重定向响应 (${error.response.status})，从重定向中获取cookies`);
                const redirectLocation = error.response.headers.location;
                console.log(`[Logo]重定向到: ${redirectLocation}`);
                return this.extractCookiesFromResponse(error.response, logoUrl);
            } else {
                console.log(`[Logo]访问失败: ${error.message}，回退到站点首页`);
            }
        }

        // 如果logo不存在或访问失败，使用站点首页
        try {
            console.log(`[Cookies]正在访问站点首页: ${siteUrl}`);
            const response = await this.get(siteUrl, {}, '', '', '[首页]', {
                validateStatus: () => true, // 接受所有状态码
                maxRedirects: 5
            });

            console.log(`[首页]响应状态: ${response.status}`);
            return this.extractCookiesFromResponse(response, siteUrl);
        } catch (error) {
            console.error('[Cookies]获取站点cookies失败:', {
                code: error.code,
                message: error.message,
                status: error.response?.status,
                url: siteUrl
            });

            if (error.code === 'ECONNABORTED') {
                throw new Error('连接超时');
            } else if (error.code === 'ENOTFOUND') {
                throw new Error('域名解析失败');
            } else if (error.code === 'ECONNREFUSED') {
                throw new Error('连接被拒绝');
            } else {
                throw new Error(`网络错误: ${error.message}`);
            }
        }
    }

    /**
     * 从响应中提取cookies的辅助方法
     * 
     * @param {Object} response - axios响应对象
     * @param {string} url - 请求URL
     * @returns {string} cookies字符串
     */
    extractCookiesFromResponse(response, url) {
        console.log(`[提取Cookies]从 ${url} 提取cookies`);
        console.log(`[提取Cookies]响应头数量: ${Object.keys(response.headers).length}`);

        const cookies = [];
        const setCookieHeaders = response.headers['set-cookie'];

        if (setCookieHeaders) {
            console.log(`[提取Cookies]找到 ${setCookieHeaders.length} 个set-cookie头`);
            setCookieHeaders.forEach(cookie => {
                const cookiePart = cookie.split(';')[0];
                cookies.push(cookiePart);
            });
        } else {
            console.log('[提取Cookies]未找到set-cookie头');
        }

        const cookieString = cookies.join('; ');
        console.log(`[提取Cookies]合并后的cookies长度: ${cookieString.length}`);
        return cookieString;
    }

    /**
     * 只刷新模型列表的轻量级方法
     * 
     * @param {Object} site - 站点信息对象
     * @returns {Promise<Object>} 刷新结果
     */
    /**
     * 只刷新令牌列表（不执行完整检测）
     * @param {Object} site - 站点信息对象
     * @returns {Promise<Object>} 刷新结果
     */
    async refreshTokensOnly(site) {
        const startTime = Date.now();
        try {
            console.log(`[令牌刷新]开始刷新站点令牌: ${site.name} (${site.url})`);

            // 获取站点cookies
            console.log('[令牌刷新]获取站点cookies...');
            const cookies = await this.getSiteCookies(site.url);

            // 只获取令牌列表
            console.log('[令牌刷新]获取令牌列表...');
            const tokensList = await this.getTokensList(site.url, cookies, site.sessions, site);
            console.log('[令牌刷新]令牌列表获取结果:', tokensList.success ? `获取到${tokensList.data?.length || 0}个令牌` : tokensList.message);

            if (tokensList.success && tokensList.data) {
                console.log(`[令牌刷新]✅ 站点 ${site.id} 令牌刷新完成`);
                
                const duration = Date.now() - startTime;
                return {
                    success: true,
                    message: `令牌刷新成功，共${tokensList.data.length}个令牌`,
                    data: {
                        tokens: tokensList.data,
                        tokensCount: tokensList.data.length,
                        duration: `${duration}ms`
                    }
                };
            } else {
                console.log(`[令牌刷新]❌ 站点 ${site.id} 令牌刷新失败: ${tokensList.message}`);
                
                const duration = Date.now() - startTime;
                return {
                    success: false,
                    message: tokensList.message || '令牌刷新失败',
                    duration: `${duration}ms`
                };
            }
        } catch (error) {
            console.error(`[令牌刷新]❌ 站点 ${site.id} 令牌刷新异常:`, error);
            
            const duration = Date.now() - startTime;
            return {
                success: false,
                message: `令牌刷新异常: ${error.message}`,
                duration: `${duration}ms`
            };
        }
    }

    async refreshModelsOnly(site) {
        const startTime = Date.now();
        try {
            console.log(`[模型刷新]开始刷新站点模型: ${site.name} (${site.url})`);

            // 获取站点cookies
            console.log('[模型刷新]获取站点cookies...');
            const cookies = await this.getSiteCookies(site.url);

            // 只获取模型列表
            console.log('[模型刷新]获取模型列表...');
            const modelsList = await this.getModelsList(site.url, cookies, site.sessions, site);
            console.log('[模型刷新]模型列表获取结果:', modelsList.success ? `获取到${modelsList.data?.length || 0}个模型` : modelsList.message);

            if (modelsList.success && modelsList.data) {
                console.log(`[模型刷新]✅ 站点 ${site.id} 模型刷新完成`);
                
                return {
                    success: true,
                    message: `模型刷新成功，获取到 ${modelsList.data.length} 个模型`,
                    data: {
                        models: modelsList.data,
                        refreshType: 'models_only',
                        executionTime: Date.now() - startTime
                    }
                };
            } else {
                const errorMsg = modelsList.message || '获取模型列表失败';
                return {
                    success: false,
                    message: errorMsg
                };
            }

        } catch (error) {
            const executionTime = Date.now() - startTime;
            const errorMsg = `模型刷新失败: ${error.message}`;
            console.error(`[模型刷新]❌ ${errorMsg}`, error);
            
            return {
                success: false,
                message: errorMsg
            };
        }
    }
}

module.exports = SiteApiOperations;