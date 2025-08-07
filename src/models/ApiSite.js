const databaseConfig = require('../config/database');

class ApiSite {
    constructor() {
        this.statements = databaseConfig.getStatements();
    }

    // 获取所有API站点
    async findAll() {
        try {
            return await this.statements.findAllApiSites.all();
        } catch (error) {
            console.error('获取API站点列表失败:', error.message);
            throw new Error('数据库查询失败');
        }
    }

    // 根据ID获取API站点
    async findById(id) {
        try {
            return await this.statements.findApiSiteById.get(id);
        } catch (error) {
            console.error('根据ID获取API站点失败:', error.message);
            throw new Error('数据库查询失败');
        }
    }

    // 根据创建者获取API站点
    async findByCreatedBy(userId) {
        try {
            return await this.statements.findApiSitesByCreatedBy.all(userId);
        } catch (error) {
            console.error('根据创建者获取API站点失败:', error.message);
            throw new Error('数据库查询失败');
        }
    }

    // 创建新API站点
    async create(apiSiteData) {
        const { apiType, name, url, authMethod, sessions, token, userId, enabled = 1, autoCheckin = 0, createdBy } = apiSiteData;
        
        // 验证必填字段
        if (!apiType || !name || !url || !authMethod || !createdBy) {
            throw new Error('缺少必填字段');
        }

        // 验证API类型
        if (!['NewApi', 'Veloera', 'AnyRouter', 'VoApi'].includes(apiType)) {
            console.error(`ApiSiteService.create: 无效的API类型 "${apiType}"，支持的类型: NewApi, Veloera, AnyRouter, VoApi`);
            throw new Error(`无效的API类型 "${apiType}"，支持的类型: NewApi, Veloera, AnyRouter, VoApi`);
        }

        // 验证授权方式
        if (!['sessions', 'token'].includes(authMethod)) {
            throw new Error('无效的授权方式');
        }

        // AnyRouter只支持sessions模式
        if (apiType === 'AnyRouter' && authMethod === 'token') {
            throw new Error('AnyRouter只支持Sessions授权方式');
        }

        // VoApi只支持token模式
        if (apiType === 'VoApi' && authMethod === 'sessions') {
            throw new Error('VoApi只支持Token授权方式');
        }

        // 验证token类型必须有userId
        if (authMethod === 'token' && !userId) {
            throw new Error('Token授权方式必须提供userId');
        }

        // AnyRouter默认启用签到功能
        const finalAutoCheckin = apiType === 'AnyRouter' ? 1 : (autoCheckin ? 1 : 0);

        try {
            const result = await this.statements.insertApiSite.run(
                apiType,
                name,
                url,
                authMethod,
                sessions || null,
                token || null,
                userId || null,
                enabled ? 1 : 0,
                finalAutoCheckin,
                createdBy
            );
            
            return await this.findById(result.lastID);
        } catch (error) {
            console.error('创建API站点失败:', error.message);
            if (error.message.includes('UNIQUE constraint failed')) {
                throw new Error('API站点名称已存在');
            }
            throw new Error('创建API站点失败');
        }
    }

    // 更新API站点
    async update(id, apiSiteData) {
        const { apiType, name, url, authMethod, sessions, token, userId, enabled, autoCheckin } = apiSiteData;
        
        // 验证必填字段
        if (!apiType || !name || !url || !authMethod) {
            throw new Error('缺少必填字段');
        }

        // 验证API类型
        if (!['NewApi', 'Veloera', 'AnyRouter', 'VoApi'].includes(apiType)) {
            console.error(`ApiSiteService.update: 无效的API类型 "${apiType}"，支持的类型: NewApi, Veloera, AnyRouter, VoApi`);
            throw new Error(`无效的API类型 "${apiType}"，支持的类型: NewApi, Veloera, AnyRouter, VoApi`);
        }

        // 验证授权方式
        if (!['sessions', 'token'].includes(authMethod)) {
            throw new Error('无效的授权方式');
        }

        // AnyRouter只支持sessions模式
        if (apiType === 'AnyRouter' && authMethod === 'token') {
            throw new Error('AnyRouter只支持Sessions授权方式');
        }

        // VoApi只支持token模式
        if (apiType === 'VoApi' && authMethod === 'sessions') {
            throw new Error('VoApi只支持Token授权方式');
        }

        // 验证token类型必须有userId
        if (authMethod === 'token' && !userId) {
            throw new Error('Token授权方式必须提供userId');
        }

        // AnyRouter默认启用签到功能
        const finalAutoCheckin = apiType === 'AnyRouter' ? 1 : (autoCheckin ? 1 : 0);

        try {
            const result = await this.statements.updateApiSite.run(
                apiType,
                name,
                url,
                authMethod,
                sessions || null,
                token || null,
                userId || null,
                enabled !== undefined ? (enabled ? 1 : 0) : 1,
                finalAutoCheckin,
                id
            );

            if (result.changes === 0) {
                throw new Error('API站点不存在');
            }

            return await this.findById(id);
        } catch (error) {
            console.error('更新API站点失败:', error.message);
            if (error.message.includes('UNIQUE constraint failed')) {
                throw new Error('API站点名称已存在');
            }
            if (error.message === 'API站点不存在') {
                throw error;
            }
            throw new Error('更新API站点失败');
        }
    }

    // 删除API站点
    async delete(id) {
        try {
            const result = await this.statements.deleteApiSite.run(id);
            if (result.changes === 0) {
                throw new Error('API站点不存在');
            }
            return true;
        } catch (error) {
            console.error('删除API站点失败:', error.message);
            if (error.message === 'API站点不存在') {
                throw error;
            }
            throw new Error('删除API站点失败');
        }
    }

    // 切换API站点启用状态
    async toggleEnabled(id, enabled) {
        try {
            const result = await this.statements.toggleApiSiteEnabled.run(enabled ? 1 : 0, id);
            if (result.changes === 0) {
                throw new Error('API站点不存在');
            }
            return await this.findById(id);
        } catch (error) {
            console.error('切换API站点状态失败:', error.message);
            if (error.message === 'API站点不存在') {
                throw error;
            }
            throw new Error('切换API站点状态失败');
        }
    }

    // 获取API站点统计
    async getStats() {
        try {
            const totalResult = await this.statements.countApiSites.get();
            const enabledResult = await this.statements.countEnabledApiSites.get();
            const total = totalResult.count;
            const enabled = enabledResult.count;
            const disabled = total - enabled;

            return {
                total,
                enabled,
                disabled
            };
        } catch (error) {
            console.error('获取API站点统计失败:', error.message);
            throw new Error('获取统计数据失败');
        }
    }

    // 更新签到时间
    async updateLastCheckin(id) {
        try {
            const result = await this.statements.updateLastCheckin.run(id);
            if (result.changes === 0) {
                throw new Error('API站点不存在');
            }
            return true;
        } catch (error) {
            console.error('更新签到时间失败:', error.message);
            throw new Error('更新签到时间失败');
        }
    }
}

module.exports = ApiSite;