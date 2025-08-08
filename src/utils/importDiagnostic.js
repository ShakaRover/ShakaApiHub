/**
 * 数据导入诊断工具
 * 帮助用户识别和修复导入数据的问题
 */
const ApiTypeValidator = require('./ApiTypeValidator');
const { getSupportedApiTypes, getSupportedAuthMethods } = require('../config/apiTypes');
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

        // 使用集中验证器进行API类型和授权模式验证
        const validation = ApiTypeValidator.validateApiSiteData({
            apiType: site.apiType,
            authMethod: site.authMethod,
            userId: site.userId,
            sessions: site.sessions,
            token: site.token
        });

        // 将验证错误转换为诊断问题
        validation.errors.forEach(error => {
            issues.push({
                type: 'critical',
                field: `sites[${index-1}]`,
                message: `${prefix}: ${error}`,
                solution: '请根据错误信息修正配置'
            });
        });

        // 将验证警告转换为诊断警告
        validation.warnings.forEach(warning => {
            warnings.push({
                type: 'warning',
                field: `sites[${index-1}]`,
                message: `${prefix}: ${warning}`,
                solution: '建议检查配置'
            });
        });

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

        // 授权信息检查已在集中验证器中处理

        // 可选字段建议
        if (site.enabled === undefined) {
            suggestions.push({
                type: 'suggestion',
                field: `sites[${index-1}].enabled`,
                message: `${prefix}: 建议明确指定enabled状态`,
                solution: '添加enabled字段 (true/false) 来控制站点启用状态'
            });
        }

        if (site.autoCheckin === undefined && ['Veloera', 'AnyRouter', 'VoApi'].includes(site.apiType)) {
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
                totalSites: 4
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
                },
                {
                    apiType: 'VoApi',
                    name: '示例VoApi站点',
                    url: 'https://voapi.example.com',
                    authMethod: 'token',
                    token: 'your-voapi-token-here',
                    userId: 'your-user-id',
                    enabled: true,
                    autoCheckin: false
                }
            ]
        };
    }
}

module.exports = ImportDiagnostic;