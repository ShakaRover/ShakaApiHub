const axios = require('axios');
const databaseConfig = require('../config/database');
const LogService = require('./LogService');

class SiteCheckService {
    constructor() {
        this.statements = databaseConfig.getStatements();
        this.logService = new LogService();
    }

    // 检测单个站点
    async checkSite(siteId) {
        let site = null;
        const startTime = Date.now();
        try {
            // 步骤1：获取站点信息
            console.log(`开始检测站点 ID: ${siteId}`);
            await this.logService.logSiteOperation(1, siteId, 'site_check', '获取站点信息', 1, 'success');
            
            site = await this.statements.findApiSiteById.get(siteId);
            if (!site) {
                await this.logService.logSiteOperation(1, siteId, 'site_check', '获取站点信息', 1, 'error', null, '站点不存在');
                throw new Error('站点不存在');
            }

            console.log(`开始检测站点: ${site.name} (${site.url})`);
            console.log(`站点认证方式: ${site.auth_method}`);
            console.log(`Sessions数据: ${site.sessions ? '已提供' : '未提供'}`);

            // 步骤2：访问站点获取 cookies
            console.log('第二步：获取站点cookies...');
            await this.logService.logSiteOperation(1, siteId, 'site_check', '获取站点cookies', 2, 'success');
            const cookies = await this.getSiteCookies(site.url);
            console.log(`获取到cookies: ${cookies ? cookies.substring(0, 100) + '...' : '无'}`);

            // 步骤3：检查是否需要签到并执行签到
            if (site.auto_checkin && (site.api_type === 'Veloera' || site.api_type === 'AnyRouter' || site.api_type === 'VoApi')) {
                console.log('第三步：执行自动签到...');
                await this.logService.logSiteOperation(1, siteId, 'site_check', '执行自动签到', 3, 'success');
                await this.performCheckin(site.url, cookies, site.sessions, site);
            } else {
                console.log('第三步：跳过签到（未启用或不支持的API类型）');
                await this.logService.logSiteOperation(1, siteId, 'site_check', '跳过签到', 3, 'success', { reason: '未启用或不支持的API类型' });
            }

            // 步骤4：获取用户信息
            console.log('第四步：获取用户信息...');
            await this.logService.logSiteOperation(1, siteId, 'site_check', '获取用户信息', 4, 'success');
            const userInfo = await this.getUserInfo(site.url, cookies, site.sessions, site);
            console.log('用户信息获取成功:', JSON.stringify(userInfo, null, 2));

            // 步骤5：获取模型列表
            console.log('第五步：获取模型列表...');
            await this.logService.logSiteOperation(1, siteId, 'site_check', '获取模型列表', 5, 'success');
            const modelsList = await this.getModelsList(site.url, cookies, site.sessions, site);
            console.log('模型列表获取结果:', modelsList.success ? `获取到${modelsList.data?.length || 0}个模型` : modelsList.message);

            // 步骤6：获取令牌信息
            console.log('第六步：获取令牌信息...');
            await this.logService.logSiteOperation(1, siteId, 'site_check', '获取令牌信息', 6, 'success');
            const tokensList = await this.getTokensList(site.url, cookies, site.sessions, site);
            console.log('令牌列表获取结果:', tokensList.success ? `获取到${tokensList.data?.length || 0}个令牌` : tokensList.message);

            // 步骤7：保存检测结果
            console.log('第七步：保存检测结果...');
            await this.logService.logSiteOperation(1, siteId, 'site_check', '保存检测结果', 7, 'success');
            await this.saveSiteInfo(siteId, userInfo, modelsList.data, tokensList.data);

            // 步骤8：记录检测日志
            console.log('第八步：记录检测日志...');
            const executionTime = Date.now() - startTime;
            await this.logCheckResult(siteId, 'success', '检测成功', JSON.stringify({
                userInfo,
                modelsCount: modelsList.data?.length || 0,
                tokensCount: tokensList.data?.length || 0,
                executionTime: `${executionTime}ms`
            }));

            await this.logService.logSiteOperation(1, siteId, 'site_check', '完成检测', 8, 'success', {
                modelsCount: modelsList.data?.length || 0,
                tokensCount: tokensList.data?.length || 0
            }, null, executionTime);

            console.log(`站点检测完成: ${site.name} (用时: ${executionTime}ms)`);
            return {
                success: true,
                message: '站点检测成功',
                data: userInfo
            };

        } catch (error) {
            const siteName = site ? site.name : `ID:${siteId}`;
            const executionTime = Date.now() - startTime;
            
            console.error(`\n=== 站点检测失败详情 ===`);
            console.error(`站点: ${siteName}`);
            console.error(`错误类型: ${error.constructor.name}`);
            console.error(`错误消息: ${error.message}`);
            console.error(`错误代码: ${error.code || '无'}`);
            console.error(`错误状态: ${error.response?.status || '无'}`);
            console.error(`完整错误:`, error);
            console.error(`=== 错误详情结束 ===\n`);

            // 记录失败步骤
            await this.logService.logSiteOperation(1, siteId, 'site_check', '检测失败', 9, 'error', {
                errorType: error.constructor.name,
                errorCode: error.code,
                errorStatus: error.response?.status
            }, error.message, executionTime);

            // 更新检测状态为失败
            try {
                await this.statements.updateSiteCheckStatus.run('error', error.message, siteId);
            } catch (dbError) {
                console.error('更新数据库状态失败:', dbError.message);
            }

            // 记录错误日志
            await this.logCheckResult(siteId, 'error', error.message, JSON.stringify({
                errorType: error.constructor.name,
                errorCode: error.code,
                errorStatus: error.response?.status,
                errorStack: error.stack,
                executionTime: `${executionTime}ms`
            }));

            return {
                success: false,
                message: error.message
            };
        }
    }

    // 获取站点 cookies
    async getSiteCookies(siteUrl) {
        // 首先尝试访问 logo.png
        const logoUrl = `${siteUrl.replace(/\/$/, '')}/logo.png`;
        console.log(`首先尝试访问logo: ${logoUrl}`);

        try {
            const logoResponse = await axios.get(logoUrl, {
                timeout: 10000,
                validateStatus: () => true, // 接受所有状态码
                maxRedirects: 0 // 不处理重定向
            });

            console.log(`Logo响应状态: ${logoResponse.status}`);

            // 如果logo存在（状态码200-299），使用logo的cookies
            if (logoResponse.status >= 200 && logoResponse.status < 300) {
                console.log('Logo存在，使用logo响应的cookies');
                return this.extractCookiesFromResponse(logoResponse, logoUrl);
            } else if (logoResponse.status >= 300 && logoResponse.status < 400) {
                // 处理重定向响应，从重定向中获取cookies
                console.log(`Logo返回重定向 (${logoResponse.status})，从重定向响应中获取cookies`);
                const redirectLocation = logoResponse.headers.location;
                console.log(`重定向到: ${redirectLocation}`);
                return this.extractCookiesFromResponse(logoResponse, logoUrl);
            } else {
                console.log(`Logo不存在 (状态码: ${logoResponse.status})，回退到站点首页`);
            }
        } catch (error) {
            // 检查是否是重定向错误
            if (error.response && error.response.status >= 300 && error.response.status < 400) {
                console.log(`Logo重定向响应 (${error.response.status})，从重定向中获取cookies`);
                const redirectLocation = error.response.headers.location;
                console.log(`重定向到: ${redirectLocation}`);
                return this.extractCookiesFromResponse(error.response, logoUrl);
            } else {
                console.log(`访问logo失败: ${error.message}，回退到站点首页`);
            }
        }

        // 如果logo不存在或访问失败，使用站点首页
        try {
            console.log(`正在访问站点首页: ${siteUrl}`);
            const response = await axios.get(siteUrl, {
                timeout: 10000,
                validateStatus: () => true, // 接受所有状态码
                maxRedirects: 5
            });

            console.log(`站点首页响应状态: ${response.status}`);
            return this.extractCookiesFromResponse(response, siteUrl);
        } catch (error) {
            console.error('获取站点cookies失败:', {
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

    // 智能合并cookies，set-cookies优先级最高
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

    // 从响应中提取cookies的辅助方法
    extractCookiesFromResponse(response, url) {
        console.log(`从 ${url} 提取cookies`);
        console.log(`响应头数量: ${Object.keys(response.headers).length}`);

        const cookies = [];
        const setCookieHeaders = response.headers['set-cookie'];

        if (setCookieHeaders) {
            console.log(`找到 ${setCookieHeaders.length} 个set-cookie头`);
            setCookieHeaders.forEach(cookie => {
                const cookiePart = cookie.split(';')[0];
                cookies.push(cookiePart);
            });
        } else {
            console.log('未找到set-cookie头');
        }

        const cookieString = cookies.join('; ');
        console.log(`合并后的cookies长度: ${cookieString.length}`);
        return cookieString;
    }

    // 执行签到
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
                console.log(`API类型 ${site.api_type} 不支持签到`);
                return;
            }

            const checkinUrl = `${siteUrl.replace(/\/$/, '')}${checkinPath}`;
            console.log(`正在请求签到API: ${checkinUrl}`);
            console.log(`站点URL: ${siteUrl}, 签到路径: ${checkinPath}`);

            // 构建请求头（与getUserInfo相同的逻辑）
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // 处理认证信息和cookies
            let configCookies = '';

            // 根据认证方式处理认证信息
            if (site.auth_method === 'token' && site.token) {
                // Token模式：直接使用token字段作为Authorization Bearer
                headers['Authorization'] = `Bearer ${site.token}`;
                console.log('签到Token模式：添加Authorization Bearer头');
            } else if (site.auth_method === 'sessions' && sessions) {
                // Sessions模式：处理sessions数据
                console.log(`签到处理sessions数据: ${sessions.substring(0, 100)}...`);
                try {
                    const sessionData = JSON.parse(sessions);
                    console.log('签到Sessions数据解析为JSON成功');
                    if (sessionData.token) {
                        headers['Authorization'] = `Bearer ${sessionData.token}`;
                        console.log('签到Sessions模式：从JSON中添加Authorization头');
                    }
                    if (sessionData.cookie) {
                        configCookies = sessionData.cookie;
                        console.log('签到Sessions模式：获取配置中的cookie');
                    }
                } catch (e) {
                    console.log('签到Sessions数据不是JSON，直接作为cookie使用');
                    configCookies = sessions;
                }
            }

            // 智能合并cookies：set-cookies优先级最高
            const finalCookies = this.mergeCookies(cookies, configCookies);

            // 设置最终的cookies
            if (finalCookies) {
                headers['Cookie'] = finalCookies;
                console.log(`签到最终cookies: ${finalCookies.substring(0, 200)}...`);
            }

            // 根据API类型和User ID添加用户头信息
            if (site && site.user_id) {
                if (site.api_type === 'AnyRouter' || site.api_type === 'NewApi') {
                    headers['new-api-user'] = site.user_id;
                    console.log(`签到添加new-api-user头: ${site.user_id}`);
                } else if (site.api_type === 'Veloera') {
                    headers['veloera-user'] = site.user_id;
                    console.log(`签到添加veloera-user头: ${site.user_id}`);
                } else if (site.api_type === 'VoApi') {
                    headers['voapi-user'] = site.user_id;
                    console.log(`签到添加voapi-user头: ${site.user_id}`);
                }
            }

            console.log('签到请求头:', JSON.stringify(headers, null, 2));

            // 发送POST请求进行签到
            const response = await axios.post(checkinUrl, {}, {
                headers,
                timeout: 15000,
                validateStatus: (status) => status < 500 // 接受 4xx 和 2xx
            });

            console.log(`签到API响应状态: ${response.status}`);
            console.log(`签到响应数据: ${JSON.stringify(response.data, null, 2)}`);

            const data = response.data;

            // 检查响应格式
            if (!data || typeof data !== 'object') {
                console.log('签到响应格式异常，跳过签到处理');
                return;
            }

            // 分析签到结果
            const success = data.success === true;
            const message = data.message || '';

            if (success && message && !message.includes('已经签到')) {
                // 签到成功
                console.log(`✅ 签到成功: ${message}`);

                // 更新最后签到时间
                await this.updateLastCheckinTime(site.id);

                // 记录签到成功日志
                await this.logCheckinResult(site.id, 'success', `签到成功: ${message}`);

            } else if (success && (!message || message.includes('已经签到'))) {
                // 已经签到过了
                console.log(`ℹ️  今日已签到: ${message || '已签到'}`);

                // 检查系统记录的最后签到时间是否为今天
                await this.checkAndUpdateCheckinTime(site.id);

                // 不记录日志，因为这是正常情况

            } else {
                // 签到失败
                console.log(`❌ 签到失败: ${message}`);

                // 记录签到失败日志
                await this.logCheckinResult(site.id, 'error', `签到失败: ${message}`);
            }

        } catch (error) {
            console.error('签到过程中出现异常:', error.message);

            // 记录签到异常日志
            await this.logCheckinResult(site.id, 'error', `签到异常: ${error.message}`);

            // 签到异常不影响后续流程，继续执行
        }
    }

    // 获取用户信息
    async getUserInfo(siteUrl, cookies, sessions, site) {
        try {
            const apiUrl = `${siteUrl.replace(/\/$/, '')}/api/user/self`;
            console.log(`正在请求API: ${apiUrl}`);

            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // 处理认证信息和cookies
            let configCookies = '';

            // 根据认证方式处理认证信息
            if (site.auth_method === 'token' && site.token) {
                // Token模式：直接使用token字段作为Authorization Bearer
                headers['Authorization'] = `Bearer ${site.token}`;
                console.log('Token模式：添加Authorization Bearer头');
            } else if (site.auth_method === 'sessions' && sessions) {
                // Sessions模式：处理sessions数据
                console.log(`处理sessions数据: ${sessions.substring(0, 100)}...`);
                try {
                    const sessionData = JSON.parse(sessions);
                    console.log('Sessions数据解析为JSON成功');
                    if (sessionData.token) {
                        headers['Authorization'] = `Bearer ${sessionData.token}`;
                        console.log('Sessions模式：从JSON中添加Authorization头');
                    }
                    if (sessionData.cookie) {
                        configCookies = sessionData.cookie;
                        console.log('Sessions模式：获取配置中的cookie');
                    }
                } catch (e) {
                    console.log('Sessions数据不是JSON，直接作为cookie使用');
                    configCookies = sessions;
                }
            }

            // 智能合并cookies：set-cookies优先级最高
            const finalCookies = this.mergeCookies(cookies, configCookies);

            // 设置最终的cookies
            if (finalCookies) {
                headers['Cookie'] = finalCookies;
                console.log(`最终cookies: ${finalCookies.substring(0, 200)}...`);
            }

            // 根据API类型和User ID添加用户头信息
            if (site && site.user_id) {
                if (site.api_type === 'AnyRouter' || site.api_type === 'NewApi') {
                    headers['new-api-user'] = site.user_id;
                    console.log(`添加new-api-user头: ${site.user_id}`);
                } else if (site.api_type === 'Veloera') {
                    headers['veloera-user'] = site.user_id;
                    console.log(`添加veloera-user头: ${site.user_id}`);
                } else if (site.api_type === 'VoApi') {
                    headers['voapi-user'] = site.user_id;
                    console.log(`添加voapi-user头: ${site.user_id}`);
                }
            } else {
                console.log('未提供User ID，跳过用户头信息设置');
            }

            console.log('请求头:', JSON.stringify(headers, null, 2));

            const response = await axios.get(apiUrl, {
                headers,
                timeout: 15000,
                validateStatus: (status) => status < 500 // 接受 4xx 和 2xx
            });

            console.log(`API响应状态: ${response.status}`);
            console.log(`响应数据类型: ${typeof response.data}`);

            // 检查是否返回了HTML页面（可能是反爬虫页面）
            if (typeof response.data === 'string' && response.data.includes('<html>')) {
                console.log('检测到HTML响应，可能是反爬虫保护');
                throw new Error('站点返回HTML页面，可能有反爬虫保护或需要验证');
            }

            console.log(`响应数据: ${JSON.stringify(response.data, null, 2)}`);

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

    // 保存站点信息
    async saveSiteInfo(siteId, userInfo, modelsList = null, tokensList = null) {
        try {
            const quota = userInfo.quota ? userInfo.quota / 500000 : 0;
            const usedQuota = userInfo.used_quota ? userInfo.used_quota / 500000 : 0;
            const affQuota = userInfo.aff_quota ? userInfo.aff_quota / 500000 : 0;
            const affHistoryQuota = userInfo.aff_history_quota ? userInfo.aff_history_quota / 500000 : 0;

            // 处理签到时间：如果用户信息中没有签到时间，保持数据库中的原有值
            let lastCheckinTime = null;
            if (userInfo.last_check_in_time) {
                lastCheckinTime = userInfo.last_check_in_time;
                console.log(`用户信息包含签到时间，将更新为: ${lastCheckinTime}`);
            } else {
                // 获取当前数据库中的签到时间
                const currentSite = await this.statements.findApiSiteById.get(siteId);
                lastCheckinTime = currentSite ? currentSite.site_last_check_in_time : null;
                console.log(`用户信息不包含签到时间，保持原有值: ${lastCheckinTime || '无'}`);
            }

            // 处理模型列表
            const modelsListJson = modelsList ? JSON.stringify(modelsList) : null;
            console.log(`模型列表数据: ${modelsListJson ? `${modelsList.length}个模型` : '无'}`);

            // 处理令牌列表
            const tokensListJson = tokensList ? JSON.stringify(tokensList) : null;
            console.log(`令牌列表数据: ${tokensListJson ? `${tokensList.length}个令牌` : '无'}`);

            await this.statements.updateSiteCheckInfo.run(
                quota,
                usedQuota,
                userInfo.request_count || 0,
                userInfo.group || '',
                userInfo.aff_code || '',
                userInfo.aff_count || 0,
                affQuota,
                affHistoryQuota,
                userInfo.username || '',
                lastCheckinTime,
                modelsListJson,
                tokensListJson,
                'success',
                '检测成功',
                siteId
            );

            console.log(`站点信息已保存 (ID: ${siteId})`);
        } catch (error) {
            console.error('保存站点信息失败:', error.message);
            throw new Error('保存站点信息失败');
        }
    }

    // 记录检测日志
    async logCheckResult(siteId, status, message, responseData) {
        try {
            // 使用LogService统一记录站点检测日志
            await this.logService.logSiteCheck(siteId, status, message, responseData);
        } catch (error) {
            console.error('记录检测日志失败:', error.message);
        }
    }

    // 获取站点检测历史
    async getCheckHistory(siteId) {
        try {
            const logs = await this.statements.findCheckLogsBySiteId.all(siteId);
            return {
                success: true,
                data: logs
            };
        } catch (error) {
            console.error('获取检测历史失败:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // 获取最新检测结果
    async getLatestCheckResult(siteId) {
        try {
            const log = await this.statements.findLatestCheckLog.get(siteId);
            return {
                success: true,
                data: log
            };
        } catch (error) {
            console.error('获取最新检测结果失败:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // 更新最后签到时间
    async updateLastCheckinTime(siteId) {
        try {
            await this.statements.updateSiteCheckinTime.run(siteId);
            console.log(`✅ 已更新站点 ${siteId} 的最后签到时间`);
        } catch (error) {
            console.error('更新最后签到时间失败:', error.message);
        }
    }

    // 检查并更新签到时间（如果不是今天）
    async checkAndUpdateCheckinTime(siteId) {
        try {
            // 获取站点的最后签到时间
            const result = await this.statements.getSiteCheckinTime.get(siteId);

            if (!result || !result.site_last_check_in_time) {
                // 如果没有签到记录，更新为当前时间
                console.log(`站点 ${siteId} 无签到记录，更新为当前时间`);
                await this.updateLastCheckinTime(siteId);
                return;
            }

            // 检查最后签到时间是否为今天
            const lastCheckin = new Date(result.site_last_check_in_time);
            const today = new Date();

            // 比较日期（忽略时间）
            const lastCheckinDate = new Date(lastCheckin.getFullYear(), lastCheckin.getMonth(), lastCheckin.getDate());
            const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            if (lastCheckinDate.getTime() !== todayDate.getTime()) {
                // 最后签到时间不是今天，更新为当前时间
                console.log(`站点 ${siteId} 最后签到时间不是今天 (${lastCheckin.toLocaleDateString()})，更新为当前时间`);
                await this.updateLastCheckinTime(siteId);
            } else {
                console.log(`站点 ${siteId} 最后签到时间已是今天，无需更新`);
            }

        } catch (error) {
            console.error('检查签到时间失败:', error.message);
        }
    }

    // 记录签到结果日志
    async logCheckinResult(siteId, status, message) {
        try {
            const logData = {
                type: 'checkin',
                timestamp: new Date().toISOString(),
                status: status,
                message: message
            };

            // 使用LogService统一记录签到日志
            await this.logService.logSiteCheck(siteId, status, `[签到] ${message}`, logData);
            console.log(`📝 已记录站点 ${siteId} 的签到日志: ${status} - ${message}`);
        } catch (error) {
            console.error('记录签到日志失败:', error.message);
        }
    }

    // 获取最近的签到状态
    async getLatestCheckinStatus(siteId) {
        try {
            const result = await this.statements.findLatestCheckinStatus.get(siteId);
            
            return result ? {
                success: true,
                data: {
                    status: result.status,
                    message: result.message,
                    time: result.created_at
                }
            } : {
                success: false,
                message: '未找到签到记录'
            };
        } catch (error) {
            console.error('获取签到状态失败:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // 获取模型列表
    async getModelsList(siteUrl, cookies, sessions, site) {
        try {
            const apiUrl = `${siteUrl.replace(/\/$/, '')}/api/user/models`;
            console.log(`正在请求模型列表API: ${apiUrl}`);

            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // 处理认证信息和cookies（与getUserInfo相同逻辑）
            let configCookies = '';

            if (site.auth_method === 'token' && site.token) {
                headers['Authorization'] = `Bearer ${site.token}`;
                console.log('模型列表Token模式：添加Authorization Bearer头');
            } else if (site.auth_method === 'sessions' && sessions) {
                console.log(`模型列表处理sessions数据: ${sessions.substring(0, 100)}...`);
                try {
                    const sessionData = JSON.parse(sessions);
                    console.log('模型列表Sessions数据解析为JSON成功');
                    if (sessionData.token) {
                        headers['Authorization'] = `Bearer ${sessionData.token}`;
                        console.log('模型列表Sessions模式：从JSON中添加Authorization头');
                    }
                    if (sessionData.cookie) {
                        configCookies = sessionData.cookie;
                        console.log('模型列表Sessions模式：获取配置中的cookie');
                    }
                } catch (e) {
                    console.log('模型列表Sessions数据不是JSON，直接作为cookie使用');
                    configCookies = sessions;
                }
            }

            const finalCookies = this.mergeCookies(cookies, configCookies);
            if (finalCookies) {
                headers['Cookie'] = finalCookies;
                console.log(`模型列表最终cookies: ${finalCookies.substring(0, 200)}...`);
            }

            // 根据API类型添加用户头信息
            if (site && site.user_id) {
                if (site.api_type === 'AnyRouter' || site.api_type === 'NewApi') {
                    headers['new-api-user'] = site.user_id;
                    console.log(`模型列表添加new-api-user头: ${site.user_id}`);
                } else if (site.api_type === 'Veloera') {
                    headers['veloera-user'] = site.user_id;
                    console.log(`模型列表添加veloera-user头: ${site.user_id}`);
                } else if (site.api_type === 'VoApi') {
                    headers['voapi-user'] = site.user_id;
                    console.log(`模型列表添加voapi-user头: ${site.user_id}`);
                }
            }

            const response = await axios.get(apiUrl, {
                headers,
                timeout: 15000,
                validateStatus: (status) => status < 500
            });

            console.log(`模型列表API响应状态: ${response.status}`);
            console.log(`模型列表响应数据: ${JSON.stringify(response.data, null, 2)}`);

            const data = response.data;

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

    // 获取令牌列表
    async getTokensList(siteUrl, cookies, sessions, site) {
        try {
            const apiUrl = `${siteUrl.replace(/\/$/, '')}/api/token/?p=0&size=10`;
            console.log(`正在请求令牌列表API: ${apiUrl}`);

            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // 处理认证信息和cookies（与getUserInfo相同逻辑）
            let configCookies = '';

            if (site.auth_method === 'token' && site.token) {
                headers['Authorization'] = `Bearer ${site.token}`;
                console.log('令牌列表Token模式：添加Authorization Bearer头');
            } else if (site.auth_method === 'sessions' && sessions) {
                console.log(`令牌列表处理sessions数据: ${sessions.substring(0, 100)}...`);
                try {
                    const sessionData = JSON.parse(sessions);
                    console.log('令牌列表Sessions数据解析为JSON成功');
                    if (sessionData.token) {
                        headers['Authorization'] = `Bearer ${sessionData.token}`;
                        console.log('令牌列表Sessions模式：从JSON中添加Authorization头');
                    }
                    if (sessionData.cookie) {
                        configCookies = sessionData.cookie;
                        console.log('令牌列表Sessions模式：获取配置中的cookie');
                    }
                } catch (e) {
                    console.log('令牌列表Sessions数据不是JSON，直接作为cookie使用');
                    configCookies = sessions;
                }
            }

            const finalCookies = this.mergeCookies(cookies, configCookies);
            if (finalCookies) {
                headers['Cookie'] = finalCookies;
                console.log(`令牌列表最终cookies: ${finalCookies.substring(0, 200)}...`);
            }

            // 根据API类型添加用户头信息
            if (site && site.user_id) {
                if (site.api_type === 'AnyRouter' || site.api_type === 'NewApi') {
                    headers['new-api-user'] = site.user_id;
                    console.log(`令牌列表添加new-api-user头: ${site.user_id}`);
                } else if (site.api_type === 'Veloera') {
                    headers['veloera-user'] = site.user_id;
                    console.log(`令牌列表添加veloera-user头: ${site.user_id}`);
                } else if (site.api_type === 'VoApi') {
                    headers['voapi-user'] = site.user_id;
                    console.log(`令牌列表添加voapi-user头: ${site.user_id}`);
                }
            }

            const response = await axios.get(apiUrl, {
                headers,
                timeout: 15000,
                validateStatus: (status) => status < 500
            });

            console.log(`令牌列表API响应状态: ${response.status}`);
            console.log(`令牌列表响应数据: ${JSON.stringify(response.data, null, 2)}`);

            const data = response.data;

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
                console.log('令牌列表使用格式1: data.data.records');
            }
            // 格式2: data.data.items (简单格式)
            else if (data.data && data.data.items && Array.isArray(data.data.items)) {
                tokensList = data.data.items;
                tokensCount = data.data.items.length;
                formatUsed = 'data.data.items';
                console.log('令牌列表使用格式2: data.data.items');
            }
            // 格式3: data.data.data (新嵌套格式)
            else if (data.data && data.data.data && Array.isArray(data.data.data)) {
                tokensList = data.data.data;
                tokensCount = data.data.data.length;
                formatUsed = 'data.data.data';
                console.log('令牌列表使用格式3: data.data.data (新嵌套格式)');
            }
            // 格式4: data.data (数组直接在data.data内)
            else if (data.data && Array.isArray(data.data)) {
                tokensList = data.data;
                tokensCount = data.data.length;
                formatUsed = 'data.data';
                console.log('令牌列表使用格式4: data.data (数组格式)');
            }
            // 格式不匹配
            else {
                console.error('令牌列表数据格式不匹配，期望以下格式之一：data.data.records、data.data.items、data.data.data 或 data.data (数组)');
                console.error('实际接收到的数据结构:', JSON.stringify(data.data, null, 2));
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

    // 只刷新模型列表的轻量级方法
    async refreshModelsOnly(siteId) {
        let site = null;
        const startTime = Date.now();
        try {
            console.log(`开始刷新站点模型 ID: ${siteId}`);
            
            // 步骤1：获取站点信息
            site = await this.statements.findApiSiteById.get(siteId);
            if (!site) {
                throw new Error('站点不存在');
            }

            console.log(`开始刷新站点模型: ${site.name} (${site.url})`);

            // 步骤2：访问站点获取 cookies（保留cookie设置步骤）
            console.log('获取站点cookies...');
            const cookies = await this.getSiteCookies(site.url);

            // 步骤3：只获取模型列表
            console.log('获取模型列表...');
            const modelsList = await this.getModelsList(site.url, cookies, site.sessions, site);
            console.log('模型列表获取结果:', modelsList.success ? `获取到${modelsList.data?.length || 0}个模型` : modelsList.message);

            // 步骤4：更新数据库中的模型信息
            if (modelsList.success && modelsList.data) {
                const modelsListJson = JSON.stringify(modelsList.data);
                await this.statements.updateSiteCheckInfo.run(
                    site.site_quota || 0,
                    site.site_used_quota || 0,
                    site.site_request_count || 0,
                    site.site_user_group || null,
                    site.site_aff_code || null,
                    site.site_aff_count || 0,
                    site.site_aff_quota || 0,
                    site.site_aff_history_quota || 0,
                    site.site_username || null,
                    site.site_last_check_in_time || null,
                    modelsListJson, // 更新模型列表
                    site.tokens_list || null, // 保留原有令牌列表
                    'success',
                    '模型列表刷新成功',
                    siteId
                );

                console.log(`✅ 站点 ${siteId} 模型刷新完成`);
                
                // 记录检测日志
                await this.logCheckResult(siteId, 'success', '模型列表刷新成功', JSON.stringify({
                    models: modelsList.data,
                    refreshType: 'models_only',
                    executionTime: Date.now() - startTime
                }));

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
                await this.statements.updateSiteCheckStatus.run('error', errorMsg, siteId);
                await this.logCheckResult(siteId, 'error', errorMsg, null);
                
                return {
                    success: false,
                    message: errorMsg
                };
            }

        } catch (error) {
            const executionTime = Date.now() - startTime;
            const errorMsg = `模型刷新失败: ${error.message}`;
            console.error(`❌ ${errorMsg}`, error);
            
            // 更新检测状态为失败
            if (site) {
                try {
                    await this.statements.updateSiteCheckStatus.run('error', errorMsg, siteId);
                    await this.logCheckResult(siteId, 'error', errorMsg, JSON.stringify({
                        error: error.message,
                        stack: error.stack,
                        refreshType: 'models_only',
                        executionTime: executionTime
                    }));
                } catch (updateError) {
                    console.error('更新检测状态失败:', updateError.message);
                }
            }

            return {
                success: false,
                message: errorMsg
            };
        }
    }
}

module.exports = SiteCheckService;