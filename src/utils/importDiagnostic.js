/**
 * 数据导入诊断工具
 * 帮助用户识别和修复导入数据的问题
 */
class ImportDiagnostic {
    /**
     * 诊断导入数据的问题
     * @param {Object} importData - 要诊断的导入数据
     * @returns {Object} 诊断结果
     */
    static diagnoseImportData(importData) {
        const issues = [];
        const warnings = [];
        const suggestions = [];

        // 基本格式检查
        if (!importData) {
            issues.push({
                type: 'critical',
                field: 'root',
                message: '导入数据为空或未定义',
                solution: '请提供有效的JSON格式数据'
            });
            return { isValid: false, issues, warnings, suggestions };
        }

        if (typeof importData !== 'object') {
            issues.push({
                type: 'critical',
                field: 'root',
                message: '导入数据必须是JSON对象格式',
                solution: '请确保数据是有效的JSON对象'
            });
            return { isValid: false, issues, warnings, suggestions };
        }

        // 检查sites字段
        if (!importData.sites) {
            issues.push({
                type: 'critical',
                field: 'sites',
                message: '缺少必需的sites字段',
                solution: '请添加sites字段，包含要导入的站点数组'
            });
        } else if (!Array.isArray(importData.sites)) {
            issues.push({
                type: 'critical',
                field: 'sites',
                message: 'sites字段必须是数组格式',
                solution: '请将sites字段改为数组格式: "sites": [...]'
            });
        } else if (importData.sites.length === 0) {
            warnings.push({
                type: 'warning',
                field: 'sites',
                message: 'sites数组为空，没有要导入的数据',
                solution: '请在sites数组中添加站点配置'
            });
        } else {
            // 检查每个站点配置
            importData.sites.forEach((site, index) => {
                const siteIssues = this.diagnoseSiteData(site, index + 1);
                issues.push(...siteIssues.issues);
                warnings.push(...siteIssues.warnings);
                suggestions.push(...siteIssues.suggestions);
            });
        }

        // 检查元数据
        if (!importData.metadata) {
            suggestions.push({
                type: 'suggestion',
                field: 'metadata',
                message: '建议添加metadata字段以提供导入信息',
                solution: '添加metadata字段包含exportTime、version等信息'
            });
        }

        const isValid = issues.length === 0;
        return { isValid, issues, warnings, suggestions };
    }

    /**
     * 诊断单个站点数据
     * @param {Object} site - 站点数据
     * @param {number} index - 站点索引
     * @returns {Object} 诊断结果
     */
    static diagnoseSiteData(site, index) {
        const issues = [];
        const warnings = [];
        const suggestions = [];

        const prefix = `站点${index}`;

        // 检查基本字段
        if (!site || typeof site !== 'object') {
            issues.push({
                type: 'critical',
                field: `sites[${index-1}]`,
                message: `${prefix}: 站点数据必须是对象格式`,
                solution: '请确保每个站点配置都是有效的JSON对象'
            });
            return { issues, warnings, suggestions };
        }

        // API类型检查
        if (!site.apiType) {
            issues.push({
                type: 'critical',
                field: `sites[${index-1}].apiType`,
                message: `${prefix}: 缺少apiType字段`,
                solution: '请添加apiType字段，值为: NewApi, Veloera, 或 AnyRouter'
            });
        } else if (!['NewApi', 'Veloera', 'AnyRouter'].includes(site.apiType)) {
            issues.push({
                type: 'critical',
                field: `sites[${index-1}].apiType`,
                message: `${prefix}: apiType值无效 (${site.apiType})`,
                solution: 'apiType必须是: NewApi, Veloera, 或 AnyRouter'
            });
        }

        // 名称检查
        if (!site.name) {
            issues.push({
                type: 'critical',
                field: `sites[${index-1}].name`,
                message: `${prefix}: 缺少name字段`,
                solution: '请添加站点名称'
            });
        } else if (typeof site.name !== 'string' || site.name.trim().length === 0) {
            issues.push({
                type: 'critical',
                field: `sites[${index-1}].name`,
                message: `${prefix}: 站点名称不能为空`,
                solution: '请提供有效的站点名称'
            });
        } else if (site.name.trim().length > 100) {
            issues.push({
                type: 'critical',
                field: `sites[${index-1}].name`,
                message: `${prefix}: 站点名称过长 (${site.name.length}字符)`,
                solution: '站点名称不能超过100个字符'
            });
        }

        // URL检查
        if (!site.url) {
            issues.push({
                type: 'critical',
                field: `sites[${index-1}].url`,
                message: `${prefix}: 缺少url字段`,
                solution: '请添加API地址'
            });
        } else if (typeof site.url !== 'string' || site.url.trim().length === 0) {
            issues.push({
                type: 'critical',
                field: `sites[${index-1}].url`,
                message: `${prefix}: URL不能为空`,
                solution: '请提供有效的API地址'
            });
        } else {
            try {
                new URL(site.url.trim());
            } catch (error) {
                issues.push({
                    type: 'critical',
                    field: `sites[${index-1}].url`,
                    message: `${prefix}: URL格式无效 (${site.url})`,
                    solution: '请提供有效的URL地址，如: https://api.example.com'
                });
            }
        }

        // 授权方式检查
        if (!site.authMethod) {
            issues.push({
                type: 'critical',
                field: `sites[${index-1}].authMethod`,
                message: `${prefix}: 缺少authMethod字段`,
                solution: '请添加authMethod字段，值为: sessions 或 token'
            });
        } else if (!['sessions', 'token'].includes(site.authMethod)) {
            issues.push({
                type: 'critical',
                field: `sites[${index-1}].authMethod`,
                message: `${prefix}: authMethod值无效 (${site.authMethod})`,
                solution: 'authMethod必须是: sessions 或 token'
            });
        }

        // AnyRouter特殊检查
        if (site.apiType === 'AnyRouter') {
            if (site.authMethod === 'token') {
                issues.push({
                    type: 'critical',
                    field: `sites[${index-1}].authMethod`,
                    message: `${prefix}: AnyRouter只支持sessions授权方式`,
                    solution: '请将authMethod改为sessions'
                });
            }
            if (!site.userId || typeof site.userId !== 'string' || site.userId.trim().length === 0) {
                issues.push({
                    type: 'critical',
                    field: `sites[${index-1}].userId`,
                    message: `${prefix}: AnyRouter类型必须提供userId`,
                    solution: '请添加userId字段'
                });
            }
        }

        // 授权信息检查
        if (site.authMethod === 'sessions') {
            if (!site.sessions || typeof site.sessions !== 'string' || site.sessions.trim().length === 0) {
                issues.push({
                    type: 'critical',
                    field: `sites[${index-1}].sessions`,
                    message: `${prefix}: sessions授权方式必须提供sessions信息`,
                    solution: '请添加sessions字段'
                });
            }
        }

        if (site.authMethod === 'token') {
            if (!site.token || typeof site.token !== 'string' || site.token.trim().length === 0) {
                issues.push({
                    type: 'critical',
                    field: `sites[${index-1}].token`,
                    message: `${prefix}: token授权方式必须提供token信息`,
                    solution: '请添加token字段'
                });
            }
            if (!site.userId || typeof site.userId !== 'string' || site.userId.trim().length === 0) {
                issues.push({
                    type: 'critical',
                    field: `sites[${index-1}].userId`,
                    message: `${prefix}: token授权方式必须提供userId信息`,
                    solution: '请添加userId字段'
                });
            }
        }

        // 可选字段建议
        if (site.enabled === undefined) {
            suggestions.push({
                type: 'suggestion',
                field: `sites[${index-1}].enabled`,
                message: `${prefix}: 建议明确指定enabled状态`,
                solution: '添加enabled字段 (true/false) 来控制站点启用状态'
            });
        }

        if (site.autoCheckin === undefined && ['Veloera', 'AnyRouter'].includes(site.apiType)) {
            suggestions.push({
                type: 'suggestion',
                field: `sites[${index-1}].autoCheckin`,
                message: `${prefix}: 建议设置autoCheckin状态`,
                solution: '添加autoCheckin字段 (true/false) 来控制自动签到'
            });
        }

        return { issues, warnings, suggestions };
    }

    /**
     * 生成诊断报告
     * @param {Object} diagnostic - 诊断结果
     * @returns {string} 格式化的报告
     */
    static generateReport(diagnostic) {
        const { isValid, issues, warnings, suggestions } = diagnostic;
        
        let report = '=== 数据导入诊断报告 ===\n\n';
        
        if (isValid) {
            report += '✅ 数据格式验证通过！\n\n';
        } else {
            report += '❌ 数据格式验证失败！\n\n';
        }

        if (issues.length > 0) {
            report += '🚨 严重问题 (必须修复):\n';
            issues.forEach((issue, index) => {
                report += `${index + 1}. [${issue.field}] ${issue.message}\n`;
                report += `   解决方案: ${issue.solution}\n\n`;
            });
        }

        if (warnings.length > 0) {
            report += '⚠️  警告信息:\n';
            warnings.forEach((warning, index) => {
                report += `${index + 1}. [${warning.field}] ${warning.message}\n`;
                report += `   建议: ${warning.solution}\n\n`;
            });
        }

        if (suggestions.length > 0) {
            report += '💡 优化建议:\n';
            suggestions.forEach((suggestion, index) => {
                report += `${index + 1}. [${suggestion.field}] ${suggestion.message}\n`;
                report += `   建议: ${suggestion.solution}\n\n`;
            });
        }

        if (isValid && warnings.length === 0 && suggestions.length === 0) {
            report += '🎉 数据完美，可以直接导入！\n';
        }

        return report;
    }

    /**
     * 生成示例数据
     * @returns {Object} 示例导入数据
     */
    static generateSampleData() {
        return {
            metadata: {
                exportTime: new Date().toISOString(),
                version: '1.0',
                totalSites: 3
            },
            sites: [
                {
                    apiType: 'NewApi',
                    name: '示例NewApi站点',
                    url: 'https://api.example.com',
                    authMethod: 'token',
                    token: 'your-api-token-here',
                    userId: 'your-user-id',
                    enabled: true,
                    autoCheckin: false
                },
                {
                    apiType: 'Veloera',
                    name: '示例Veloera站点',
                    url: 'https://veloera.example.com',
                    authMethod: 'sessions',
                    sessions: 'your-session-data-here',
                    enabled: true,
                    autoCheckin: true
                },
                {
                    apiType: 'AnyRouter',
                    name: '示例AnyRouter站点',
                    url: 'https://anyrouter.example.com',
                    authMethod: 'sessions',
                    sessions: 'your-session-data-here',
                    userId: 'your-anyrouter-user-id',
                    enabled: true,
                    autoCheckin: true
                }
            ]
        };
    }
}

module.exports = ImportDiagnostic;