/**
 * API类型验证器
 * 提供统一的API类型和授权模式验证功能
 * 遵循SOLID原则中的单一责任原则
 */

const {
    isValidApiType,
    isValidAuthMethod,
    isAuthMethodSupportedByApiType,
    requiresUserId,
    getDefaultAutoCheckin,
    getSupportedApiTypes,
    getSupportedAuthMethods,
    getApiTypeConfig
} = require('../config/apiTypes');

class ApiTypeValidator {
    /**
     * 验证API站点数据的完整性
     * @param {Object} siteData - 站点数据
     * @param {string} siteData.apiType - API类型
     * @param {string} siteData.authMethod - 授权方法
     * @param {string} siteData.userId - 用户ID
     * @param {string} siteData.sessions - 会话数据
     * @param {string} siteData.token - 令牌数据
     * @returns {Object} 验证结果 {isValid: boolean, errors: string[], warnings: string[]}
     */
    static validateApiSiteData(siteData) {
        const errors = [];
        const warnings = [];

        const { apiType, authMethod, userId, sessions, token } = siteData;

        // 验证API类型
        const apiTypeValidation = this.validateApiType(apiType);
        if (!apiTypeValidation.isValid) {
            errors.push(...apiTypeValidation.errors);
        }

        // 验证授权方法
        const authMethodValidation = this.validateAuthMethod(authMethod);
        if (!authMethodValidation.isValid) {
            errors.push(...authMethodValidation.errors);
        }

        // 如果基础验证通过，进行组合验证
        if (apiTypeValidation.isValid && authMethodValidation.isValid) {
            const compatibilityValidation = this.validateApiTypeAuthMethodCompatibility(apiType, authMethod);
            if (!compatibilityValidation.isValid) {
                errors.push(...compatibilityValidation.errors);
            }

            const credentialsValidation = this.validateCredentials(apiType, authMethod, { userId, sessions, token });
            errors.push(...credentialsValidation.errors);
            warnings.push(...credentialsValidation.warnings);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 验证API类型
     * @param {string} apiType - API类型
     * @returns {Object} 验证结果
     */
    static validateApiType(apiType) {
        const errors = [];

        if (!apiType) {
            errors.push('缺少必填字段: apiType');
        } else if (typeof apiType !== 'string') {
            errors.push('apiType必须是字符串类型');
        } else if (!isValidApiType(apiType)) {
            const supportedTypes = getSupportedApiTypes().join(', ');
            errors.push(`无效的API类型 "${apiType}"，支持的类型: ${supportedTypes}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * 验证授权方法
     * @param {string} authMethod - 授权方法
     * @returns {Object} 验证结果
     */
    static validateAuthMethod(authMethod) {
        const errors = [];

        if (!authMethod) {
            errors.push('缺少必填字段: authMethod');
        } else if (typeof authMethod !== 'string') {
            errors.push('authMethod必须是字符串类型');
        } else if (!isValidAuthMethod(authMethod)) {
            const supportedMethods = getSupportedAuthMethods().join(', ');
            errors.push(`无效的授权方法 "${authMethod}"，支持的方法: ${supportedMethods}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * 验证API类型和授权方法的兼容性
     * @param {string} apiType - API类型
     * @param {string} authMethod - 授权方法
     * @returns {Object} 验证结果
     */
    static validateApiTypeAuthMethodCompatibility(apiType, authMethod) {
        const errors = [];

        if (!isAuthMethodSupportedByApiType(apiType, authMethod)) {
            const config = getApiTypeConfig(apiType);
            const supportedMethods = config ? config.supportedAuthMethods.join(', ') : '无';
            errors.push(`${apiType} 不支持 ${authMethod} 授权方式，支持的方式: ${supportedMethods}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * 验证认证凭据
     * @param {string} apiType - API类型
     * @param {string} authMethod - 授权方法
     * @param {Object} credentials - 认证凭据
     * @param {string} credentials.userId - 用户ID
     * @param {string} credentials.sessions - 会话数据
     * @param {string} credentials.token - 令牌数据
     * @returns {Object} 验证结果
     */
    static validateCredentials(apiType, authMethod, credentials) {
        const errors = [];
        const warnings = [];
        const { userId, sessions, token } = credentials;

        // 检查userId要求
        if (requiresUserId(apiType, authMethod)) {
            if (!userId || (typeof userId === 'string' && userId.trim().length === 0)) {
                errors.push(`${apiType} 的 ${authMethod} 授权方式必须提供 userId`);
            }
        }

        // 根据授权方法验证对应的凭据
        if (authMethod === 'sessions') {
            if (!sessions || (typeof sessions === 'string' && sessions.trim().length === 0)) {
                errors.push('sessions 授权方式必须提供有效的 sessions 数据');
            }
            if (token && token.trim().length > 0) {
                warnings.push('使用 sessions 授权时，token 字段将被忽略');
            }
        } else if (authMethod === 'token') {
            if (!token || (typeof token === 'string' && token.trim().length === 0)) {
                errors.push('token 授权方式必须提供有效的 token 数据');
            }
            if (sessions && sessions.trim().length > 0) {
                warnings.push('使用 token 授权时，sessions 字段将被忽略');
            }
        }

        return {
            errors,
            warnings
        };
    }

    /**
     * 获取API类型的推荐配置
     * @param {string} apiType - API类型
     * @returns {Object} 推荐配置
     */
    static getRecommendedConfig(apiType) {
        const config = getApiTypeConfig(apiType);
        if (!config) {
            return null;
        }

        return {
            apiType: config.name,
            displayName: config.displayName,
            supportedAuthMethods: config.supportedAuthMethods,
            defaultAutoCheckin: config.defaultAutoCheckin,
            description: config.description,
            recommendations: this.generateRecommendations(config)
        };
    }

    /**
     * 生成推荐设置
     * @private
     * @param {Object} config - API类型配置
     * @returns {Object} 推荐设置
     */
    static generateRecommendations(config) {
        const recommendations = {
            preferredAuthMethod: config.supportedAuthMethods[0],
            autoCheckin: config.defaultAutoCheckin
        };

        if (config.name === 'AnyRouter') {
            recommendations.notes = 'AnyRouter 只支持 sessions 授权方式，且需要提供 userId';
        } else if (config.name === 'VoApi') {
            recommendations.notes = 'VoApi 支持两种授权方式，建议根据实际需求选择';
        }

        return recommendations;
    }

    /**
     * 检查API类型在指定授权方法下是否需要userId
     * @param {string} apiType - API类型
     * @param {string} authMethod - 授权方法
     * @returns {boolean} 是否需要userId
     */
    static requiresUserId(apiType, authMethod) {
        return requiresUserId(apiType, authMethod);
    }

    /**
     * 创建验证错误消息（用于用户友好的错误提示）
     * @param {Object} validationResult - 验证结果
     * @param {string} context - 上下文信息（如"站点27"）
     * @returns {string} 格式化的错误消息
     */
    static formatValidationErrors(validationResult, context = '') {
        if (validationResult.isValid) {
            return '';
        }

        let message = '';
        if (context) {
            message = `${context}: `;
        }

        const errors = validationResult.errors.join('; ');
        message += errors;

        if (validationResult.warnings && validationResult.warnings.length > 0) {
            const warnings = validationResult.warnings.join('; ');
            message += ` (警告: ${warnings})`;
        }

        return message;
    }
}

module.exports = ApiTypeValidator;