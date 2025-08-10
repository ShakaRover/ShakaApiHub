const databaseConfig = require('../config/database');
const LogService = require('./LogService');
const SiteApiOperations = require('./operations/SiteApiOperations');

/**
 * 站点检测服务类
 * 负责站点的完整检测流程，包括获取用户信息、模型列表、令牌列表等
 * 
 * 重构后遵循SOLID原则：
 * - 单一职责：专注于站点检测的业务流程控制
 * - 依赖倒置：使用SiteApiOperations处理具体的API操作
 * - 开放封闭：可扩展新的检测步骤，不修改现有流程
 */
class SiteCheckService {
    constructor() {
        this.statements = databaseConfig.getStatements();
        this.logService = new LogService();
        // 使用新的站点API操作管理器
        this.siteApiOperations = new SiteApiOperations();
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
            const cookies = await this.siteApiOperations.getSiteCookies(site.url);
            console.log(`获取到cookies: ${cookies ? cookies.substring(0, 100) + '...' : '无'}`);

            // 步骤3：检查是否需要签到并执行签到
            if (site.auto_checkin && (site.api_type === 'Veloera' || site.api_type === 'AnyRouter' || site.api_type === 'VoApi')) {
                console.log('第三步：执行自动签到...');
                await this.logService.logSiteOperation(1, siteId, 'site_check', '执行自动签到', 3, 'success');
                const checkinResult = await this.siteApiOperations.performCheckin(site.url, cookies, site.sessions, site);
                
                if (checkinResult.success) {
                    if (checkinResult.type === 'checkin_success') {
                        // 签到成功，更新最后签到时间
                        await this.updateLastCheckinTime(siteId);
                        await this.logCheckinResult(siteId, 'success', checkinResult.message);
                    } else if (checkinResult.type === 'already_checked_in') {
                        // 已经签到，检查并更新签到时间
                        await this.checkAndUpdateCheckinTime(siteId);
                    }
                } else {
                    // 签到失败，记录日志
                    await this.logCheckinResult(siteId, 'error', checkinResult.message);
                }
            } else {
                console.log('第三步：跳过签到（未启用或不支持的API类型）');
                await this.logService.logSiteOperation(1, siteId, 'site_check', '跳过签到', 3, 'success', { reason: '未启用或不支持的API类型' });
            }

            // 步骤4：获取用户信息
            console.log('第四步：获取用户信息...');
            await this.logService.logSiteOperation(1, siteId, 'site_check', '获取用户信息', 4, 'success');
            const userInfo = await this.siteApiOperations.getUserInfo(site.url, cookies, site.sessions, site);
            console.log('用户信息获取成功:', JSON.stringify(userInfo, null, 2));

            // 步骤5：获取模型列表
            console.log('第五步：获取模型列表...');
            await this.logService.logSiteOperation(1, siteId, 'site_check', '获取模型列表', 5, 'success');
            const modelsList = await this.siteApiOperations.getModelsList(site.url, cookies, site.sessions, site);
            console.log('模型列表获取结果:', modelsList.success ? `获取到${modelsList.data?.length || 0}个模型` : modelsList.message);

            // 步骤6：获取令牌信息
            console.log('第六步：获取令牌信息...');
            await this.logService.logSiteOperation(1, siteId, 'site_check', '获取令牌信息', 6, 'success');
            const tokensList = await this.siteApiOperations.getTokensList(site.url, cookies, site.sessions, site);
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



    // 只刷新令牌列表的轻量级方法
    async refreshTokensOnly(siteId) {
        try {
            // 获取站点信息
            const site = await this.apiSiteService.getSiteById(siteId);
            if (!site) {
                return {
                    success: false,
                    message: '站点不存在'
                };
            }

            const result = await this.siteApiOperations.refreshTokensOnly(site);
            
            if (result.success) {
                console.log(`✅ 站点 ${site.name} 令牌刷新成功`);
                await this.logService.logSiteAction(siteId, 'refresh_tokens', `令牌刷新成功`);
                
                return {
                    success: true,
                    message: '令牌刷新成功',
                    data: result.data
                };
            } else {
                console.log(`❌ 站点 ${site.name} 令牌刷新失败: ${result.message}`);
                await this.logService.logSiteAction(siteId, 'refresh_tokens', `令牌刷新失败: ${result.message}`);
                
                return {
                    success: false,
                    message: result.message
                };
            }
        } catch (error) {
            console.error(`refreshTokensOnly error:`, error);
            await this.logService.logSiteAction(siteId, 'refresh_tokens', `令牌刷新异常: ${error.message}`);
            
            return {
                success: false,
                message: `令牌刷新失败: ${error.message}`
            };
        }
    }

    // 只刷新模型列表的轻量级方法
    async refreshModelsOnly(siteId) {
        try {
            // 获取站点信息
            const site = await this.statements.findApiSiteById.get(siteId);
            if (!site) {
                throw new Error('站点不存在');
            }

            // 使用SiteApiOperations的模型刷新方法
            const result = await this.siteApiOperations.refreshModelsOnly(site);
            
            if (result.success) {
                // 更新数据库中的模型信息
                const modelsListJson = JSON.stringify(result.data.models);
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

                // 记录检测日志
                await this.logCheckResult(siteId, 'success', '模型列表刷新成功', JSON.stringify({
                    models: result.data.models,
                    refreshType: 'models_only',
                    executionTime: result.data.executionTime
                }));
            } else {
                await this.statements.updateSiteCheckStatus.run('error', result.message, siteId);
                await this.logCheckResult(siteId, 'error', result.message, null);
            }
            
            return result;
            
        } catch (error) {
            const errorMsg = `模型刷新失败: ${error.message}`;
            console.error(`❌ ${errorMsg}`, error);
            
            // 更新检测状态为失败
            try {
                await this.statements.updateSiteCheckStatus.run('error', errorMsg, siteId);
                await this.logCheckResult(siteId, 'error', errorMsg, JSON.stringify({
                    error: error.message,
                    stack: error.stack,
                    refreshType: 'models_only'
                }));
            } catch (updateError) {
                console.error('更新检测状态失败:', updateError.message);
            }

            return {
                success: false,
                message: errorMsg
            };
        }
    }
}

module.exports = SiteCheckService;