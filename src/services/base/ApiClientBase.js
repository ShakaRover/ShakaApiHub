const axios = require('axios');

/**
 * API客户端基础类
 * 提供统一的请求头处理、认证信息处理和API类型头信息设置
 * 
 * 遵循SOLID原则：
 * - 单一职责：专门处理API请求的通用逻辑
 * - 开放封闭：可扩展新的认证方式，但不修改现有逻辑
 * - 依赖倒置：依赖抽象的接口而非具体实现
 */
class ApiClientBase {
    constructor() {
        this.defaultTimeout = 15000;
        this.defaultHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }

    /**
     * 处理认证信息和cookies
     * 支持token和sessions两种认证方式
     * 
     * @param {Object} site - 站点信息对象
     * @param {string} sessions - sessions字符串
     * @param {string} context - 上下文标识（用于日志）
     * @returns {Object} { authHeaders: Object, configCookies: string }
     */
    processAuthentication(site, sessions, context = '') {
        const authHeaders = {};
        let configCookies = '';
        
        const logPrefix = context ? `${context}` : '';
        
        if (site.auth_method === 'token' && site.token) {
            // Token模式：直接使用token字段作为Authorization Bearer
            authHeaders['Authorization'] = `Bearer ${site.token}`;
            console.log(`${logPrefix}Token模式：添加Authorization Bearer头`);
            
        } else if (site.auth_method === 'sessions' && sessions) {
            // Sessions模式：处理sessions数据
            console.log(`${logPrefix}处理sessions数据: ${sessions.substring(0, 100)}...`);
            
            try {
                const sessionData = JSON.parse(sessions);
                console.log(`${logPrefix}Sessions数据解析为JSON成功`);
                
                if (sessionData.token) {
                    authHeaders['Authorization'] = `Bearer ${sessionData.token}`;
                    console.log(`${logPrefix}Sessions模式：从JSON中添加Authorization头`);
                }
                
                if (sessionData.cookie) {
                    configCookies = sessionData.cookie;
                    console.log(`${logPrefix}Sessions模式：获取配置中的cookie`);
                }
            } catch (e) {
                console.log(`${logPrefix}Sessions数据不是JSON，直接作为cookie使用`);
                configCookies = sessions;
            }
        }
        
        return { authHeaders, configCookies };
    }

    /**
     * 根据API类型添加用户头信息
     * DoneHub类型不需要设置UserId头信息
     * 
     * @param {Object} headers - 请求头对象
     * @param {Object} site - 站点信息对象
     * @param {string} context - 上下文标识（用于日志）
     */
    addApiTypeHeaders(headers, site, context = '') {
        if (!site) {
            console.log(`${context}未提供站点信息，跳过用户头信息设置`);
            return;
        }

        const logPrefix = context ? `${context}` : '';
        
        // DoneHub类型不需要设置UserId头信息
        if (site.api_type === 'DoneHub') {
            console.log(`${logPrefix}DoneHub类型，跳过用户头信息设置`);
            return;
        }
        
        if (!site.user_id) {
            console.log(`${context}未提供User ID，跳过用户头信息设置`);
            return;
        }
        
        if (site.api_type === 'AnyRouter' || site.api_type === 'NewApi') {
            headers['new-api-user'] = site.user_id;
            console.log(`${logPrefix}添加new-api-user头: ${site.user_id}`);
            
        } else if (site.api_type === 'Veloera') {
            headers['veloera-user'] = site.user_id;
            console.log(`${logPrefix}添加veloera-user头: ${site.user_id}`);
            
        } else if (site.api_type === 'VoApi') {
            headers['voapi-user'] = site.user_id;
            console.log(`${logPrefix}添加voapi-user头: ${site.user_id}`);
        }
    }

    /**
     * 智能合并cookies
     * set-cookies优先级最高，覆盖配置中的同名字段
     * 
     * @param {string} setCookies - 从响应中获取的cookies
     * @param {string} configCookies - 配置中的cookies
     * @returns {string} 合并后的cookie字符串
     */
    mergeCookies(setCookies, configCookies) {
        const cookieMap = new Map();

        // 首先解析配置中的cookies
        if (configCookies) {
            const configPairs = configCookies.split(';').map(pair => pair.trim());
            configPairs.forEach(pair => {
                const equalIndex = pair.indexOf('=');
                if (equalIndex > 0) {
                    const name = pair.substring(0, equalIndex).trim();
                    const value = pair.substring(equalIndex + 1).trim();
                    if (name && value) {
                        cookieMap.set(name, value);
                    }
                }
            });
            console.log(`解析配置cookies: ${configPairs.length} 个字段`);
        }

        // 然后解析set-cookies，覆盖同名字段
        if (setCookies) {
            const setCookiePairs = setCookies.split(';').map(pair => pair.trim());
            setCookiePairs.forEach(pair => {
                const equalIndex = pair.indexOf('=');
                if (equalIndex > 0) {
                    const name = pair.substring(0, equalIndex).trim();
                    const value = pair.substring(equalIndex + 1).trim();
                    if (name && value) {
                        if (cookieMap.has(name)) {
                            console.log(`set-cookies覆盖配置字段: ${name}=${cookieMap.get(name)} → ${value}`);
                        }
                        cookieMap.set(name, value);
                    }
                }
            });
            console.log(`解析set-cookies: ${setCookiePairs.length} 个字段`);
        }

        // 合并为最终的cookie字符串
        const finalCookies = Array.from(cookieMap.entries())
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');

        console.log(`合并后的cookies: ${cookieMap.size} 个唯一字段`);
        return finalCookies;
    }

    /**
     * 构建完整的请求头
     * 
     * @param {Object} site - 站点信息对象
     * @param {string} sessions - sessions字符串
     * @param {string} setCookies - 从响应中获取的cookies
     * @param {string} context - 上下文标识
     * @returns {Object} 完整的请求头对象
     */
    buildHeaders(site, sessions, setCookies = '', context = '') {
        // 从默认请求头开始
        const headers = { ...this.defaultHeaders };
        
        // 处理认证信息
        const { authHeaders, configCookies } = this.processAuthentication(site, sessions, context);
        Object.assign(headers, authHeaders);
        
        // 智能合并cookies
        const finalCookies = this.mergeCookies(setCookies, configCookies);
        if (finalCookies) {
            headers['Cookie'] = finalCookies;
            console.log(`${context}最终cookies: ${finalCookies.substring(0, 200)}...`);
        }
        
        // 根据API类型添加用户头信息
        this.addApiTypeHeaders(headers, site, context);
        
        console.log(`${context}请求头:`, JSON.stringify(headers, null, 2));
        return headers;
    }

    /**
     * 发送GET请求的通用方法
     * 
     * @param {string} url - 请求URL
     * @param {Object} site - 站点信息对象
     * @param {string} sessions - sessions字符串
     * @param {string} cookies - cookies字符串
     * @param {string} context - 上下文标识
     * @param {Object} options - 额外的axios选项
     * @returns {Promise<Object>} axios响应对象
     */
    async get(url, site, sessions, cookies = '', context = '', options = {}) {
        const headers = this.buildHeaders(site, sessions, cookies, context);
        
        const axiosConfig = {
            headers,
            timeout: this.defaultTimeout,
            validateStatus: (status) => status < 500, // 接受 4xx 和 2xx
            ...options
        };

        console.log(`${context}正在请求API: ${url}`);
        return await axios.get(url, axiosConfig);
    }

    /**
     * 发送POST请求的通用方法
     * 
     * @param {string} url - 请求URL
     * @param {Object} data - 请求数据
     * @param {Object} site - 站点信息对象
     * @param {string} sessions - sessions字符串
     * @param {string} cookies - cookies字符串
     * @param {string} context - 上下文标识
     * @param {Object} options - 额外的axios选项
     * @returns {Promise<Object>} axios响应对象
     */
    async post(url, data, site, sessions, cookies = '', context = '', options = {}) {
        const headers = this.buildHeaders(site, sessions, cookies, context);
        
        const axiosConfig = {
            headers,
            timeout: this.defaultTimeout,
            validateStatus: (status) => status < 500, // 接受 4xx 和 2xx
            ...options
        };

        console.log(`${context}正在请求API: ${url}`);
        return await axios.post(url, data, axiosConfig);
    }

    /**
     * 发送PUT请求的通用方法
     * 
     * @param {string} url - 请求URL
     * @param {Object} data - 请求数据
     * @param {Object} site - 站点信息对象
     * @param {string} sessions - sessions字符串
     * @param {string} cookies - cookies字符串
     * @param {string} context - 上下文标识
     * @param {Object} options - 额外的axios选项
     * @returns {Promise<Object>} axios响应对象
     */
    async put(url, data, site, sessions, cookies = '', context = '', options = {}) {
        const headers = this.buildHeaders(site, sessions, cookies, context);
        
        const axiosConfig = {
            headers,
            timeout: this.defaultTimeout,
            validateStatus: (status) => status < 500, // 接受 4xx 和 2xx
            ...options
        };

        console.log(`${context}正在请求API: ${url}`);
        return await axios.put(url, data, axiosConfig);
    }

    /**
     * 处理API响应的通用方法
     * 检查响应格式和状态，返回标准化的结果
     * 
     * @param {Object} response - axios响应对象
     * @param {string} context - 上下文标识
     * @returns {Object} 标准化的响应结果
     */
    processApiResponse(response, context = '') {
        console.log(`${context}API响应状态: ${response.status}`);
        console.log(`${context}响应数据类型: ${typeof response.data}`);

        // 检查是否返回了HTML页面（可能是反爬虫页面）
        if (typeof response.data === 'string' && response.data.includes('<html>')) {
            console.log(`${context}检测到HTML响应，可能是反爬虫保护`);
            throw new Error('站点返回HTML页面，可能有反爬虫保护或需要验证');
        }

        console.log(`${context}响应数据: ${JSON.stringify(response.data, null, 2)}`);

        const data = response.data;

        // 首先检查是否是有效的JSON对象
        if (!data || typeof data !== 'object') {
            if (typeof data === 'string') {
                if (data.includes('<!DOCTYPE html>') || data.includes('<html>')) {
                    throw new Error('API返回HTML页面而非JSON数据，请检查认证信息');
                } else {
                    throw new Error(`API返回非JSON数据: ${data.substring(0, 100)}...`);
                }
            }

            // 如果不是对象，根据HTTP状态码返回错误
            if (response.status === 404) {
                throw new Error('API接口不存在 (404)');
            } else if (response.status === 401) {
                throw new Error('认证失败 (401)');
            } else if (response.status === 403) {
                throw new Error('访问被禁止 (403)');
            } else if (response.status >= 400) {
                throw new Error(`HTTP错误 (${response.status})`);
            }

            throw new Error('API返回数据格式错误');
        }

        // 如果是JSON对象，优先使用其中的message
        if (response.status >= 400) {
            // 对于HTTP错误状态码，优先使用响应中的message
            const errorMessage = data.message ||
                (response.status === 404 ? 'API接口不存在 (404)' :
                    response.status === 401 ? '认证失败 (401)' :
                        response.status === 403 ? '访问被禁止 (403)' :
                            `HTTP错误 (${response.status})`);
            throw new Error(errorMessage);
        }

        return data;
    }
}

module.exports = ApiClientBase;