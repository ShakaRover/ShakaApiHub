const databaseConfig = require('../config/database');

class ApiSite {
    constructor() {
        this.db = databaseConfig.getDatabase();
        this.statements = databaseConfig.getStatements();
    }

    // 获取所有API站点
    findAll() {
        try {
            return this.statements.findAllApiSites.all();
        } catch (error) {
            console.error('获取API站点列表失败:', error.message);
            throw new Error('数据库查询失败');
        }
    }

    // 根据ID获取API站点
    findById(id) {
        try {
            return this.statements.findApiSiteById.get(id);
        } catch (error) {
            console.error('根据ID获取API站点失败:', error.message);
            throw new Error('数据库查询失败');
        }
    }

    // 根据创建者获取API站点
    findByCreatedBy(userId) {
        try {
            return this.statements.findApiSitesByCreatedBy.all(userId);
        } catch (error) {
            console.error('根据创建者获取API站点失败:', error.message);
            throw new Error('数据库查询失败');
        }
    }

    // 创建新API站点
    create(apiSiteData) {
        const { apiType, name, url, authMethod, sessions, token, userId, enabled = 1, createdBy } = apiSiteData;
        
        // 验证必填字段
        if (!apiType || !name || !url || !authMethod || !createdBy) {
            throw new Error('缺少必填字段');
        }

        // 验证API类型
        if (!['NewApi', 'Veloera'].includes(apiType)) {
            throw new Error('无效的API类型');
        }

        // 验证授权方式
        if (!['sessions', 'token'].includes(authMethod)) {
            throw new Error('无效的授权方式');
        }

        // 验证token类型必须有userId
        if (authMethod === 'token' && !userId) {
            throw new Error('Token授权方式必须提供userId');
        }

        try {
            const result = this.statements.insertApiSite.run(
                apiType,
                name,
                url,
                authMethod,
                sessions || null,
                token || null,
                userId || null,
                enabled ? 1 : 0,
                createdBy
            );
            
            return this.findById(result.lastInsertRowid);
        } catch (error) {
            console.error('创建API站点失败:', error.message);
            if (error.message.includes('UNIQUE constraint failed')) {
                throw new Error('API站点名称已存在');
            }
            throw new Error('创建API站点失败');
        }
    }

    // 更新API站点
    update(id, apiSiteData) {
        const { apiType, name, url, authMethod, sessions, token, userId, enabled } = apiSiteData;
        
        // 验证必填字段
        if (!apiType || !name || !url || !authMethod) {
            throw new Error('缺少必填字段');
        }

        // 验证API类型
        if (!['NewApi', 'Veloera'].includes(apiType)) {
            throw new Error('无效的API类型');
        }

        // 验证授权方式
        if (!['sessions', 'token'].includes(authMethod)) {
            throw new Error('无效的授权方式');
        }

        // 验证token类型必须有userId
        if (authMethod === 'token' && !userId) {
            throw new Error('Token授权方式必须提供userId');
        }

        try {
            const result = this.statements.updateApiSite.run(
                apiType,
                name,
                url,
                authMethod,
                sessions || null,
                token || null,
                userId || null,
                enabled !== undefined ? (enabled ? 1 : 0) : 1,
                id
            );

            if (result.changes === 0) {
                throw new Error('API站点不存在');
            }

            return this.findById(id);
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
    delete(id) {
        try {
            const result = this.statements.deleteApiSite.run(id);
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
    toggleEnabled(id, enabled) {
        try {
            const result = this.statements.toggleApiSiteEnabled.run(enabled ? 1 : 0, id);
            if (result.changes === 0) {
                throw new Error('API站点不存在');
            }
            return this.findById(id);
        } catch (error) {
            console.error('切换API站点状态失败:', error.message);
            if (error.message === 'API站点不存在') {
                throw error;
            }
            throw new Error('切换API站点状态失败');
        }
    }

    // 获取API站点统计
    getStats() {
        try {
            const total = this.statements.countApiSites.get().count;
            const enabled = this.statements.countEnabledApiSites.get().count;
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
}

module.exports = ApiSite;