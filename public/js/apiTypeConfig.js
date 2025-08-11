/**
 * API类型和授权模式配置（前端版本）
 * 与后端 src/config/apiTypes.js 保持一致
 * 遵循DRY原则，避免在多处重复定义
 */

// 支持的API类型定义
const API_TYPES = {
    NewApi: {
        name: 'NewApi',
        displayName: 'New API',
        supportedAuthMethods: ['sessions', 'token'],
        requiresUserId: {
            sessions: false,
            token: true
        },
        defaultAutoCheckin: false,
        description: 'Standard New API implementation'
    },
    Veloera: {
        name: 'Veloera',
        displayName: 'Veloera API',
        supportedAuthMethods: ['sessions', 'token'],
        requiresUserId: {
            sessions: false,
            token: true
        },
        defaultAutoCheckin: true,
        description: 'Veloera API with auto check-in support'
    },
    AnyRouter: {
        name: 'AnyRouter',
        displayName: 'Any Router',
        supportedAuthMethods: ['sessions'], // 只支持sessions
        requiresUserId: {
            sessions: true,  // AnyRouter的sessions也需要userId
            token: true
        },
        defaultAutoCheckin: true,
        description: 'AnyRouter API (sessions only)'
    },
    VoApi: {
        name: 'VoApi',
        displayName: 'Voice API',
        supportedAuthMethods: ['sessions', 'token'],
        requiresUserId: {
            sessions: false,
            token: true
        },
        defaultAutoCheckin: true,
        description: 'Voice API with dual auth support'
    },
    HusanApi: {
        name: 'HusanApi',
        displayName: 'Husan API',
        supportedAuthMethods: ['sessions', 'token'],
        requiresUserId: {
            sessions: false,
            token: true
        },
        defaultAutoCheckin: false,
        description: 'Husan API implementation'
    },
    DoneHub: {
        name: 'DoneHub',
        displayName: 'Done Hub',
        supportedAuthMethods: ['sessions', 'token'],
        requiresUserId: {
            sessions: false,
            token: false  // DoneHub 不需要 userId
        },
        defaultAutoCheckin: true,
        description: 'Done Hub API (no user ID required)'
    }
};

// 支持的授权方法
const AUTH_METHODS = {
    sessions: {
        name: 'sessions',
        displayName: 'Sessions',
        description: '基于会话的认证方式'
    },
    token: {
        name: 'token',
        displayName: 'Token',
        description: '基于令牌的认证方式'
    }
};

/**
 * 获取所有支持的API类型名称
 * @returns {string[]} API类型名称数组
 */
function getSupportedApiTypes() {
    return Object.keys(API_TYPES);
}

/**
 * 获取所有支持的授权方法名称
 * @returns {string[]} 授权方法名称数组
 */
function getSupportedAuthMethods() {
    return Object.keys(AUTH_METHODS);
}

/**
 * 获取API类型配置信息
 * @param {string} apiType - API类型名称
 * @returns {Object|null} API类型配置对象，如果不存在则返回null
 */
function getApiTypeConfig(apiType) {
    return API_TYPES[apiType] || null;
}

/**
 * 获取授权方法配置信息
 * @param {string} authMethod - 授权方法名称
 * @returns {Object|null} 授权方法配置对象，如果不存在则返回null
 */
function getAuthMethodConfig(authMethod) {
    return AUTH_METHODS[authMethod] || null;
}

/**
 * 检查API类型是否有效
 * @param {string} apiType - 要检查的API类型
 * @returns {boolean} 是否有效
 */
function isValidApiType(apiType) {
    return apiType && typeof apiType === 'string' && API_TYPES.hasOwnProperty(apiType);
}

/**
 * 检查授权方法是否有效
 * @param {string} authMethod - 要检查的授权方法
 * @returns {boolean} 是否有效
 */
function isValidAuthMethod(authMethod) {
    return authMethod && typeof authMethod === 'string' && AUTH_METHODS.hasOwnProperty(authMethod);
}

/**
 * 检查API类型是否支持指定的授权方法
 * @param {string} apiType - API类型
 * @param {string} authMethod - 授权方法
 * @returns {boolean} 是否支持
 */
function isAuthMethodSupportedByApiType(apiType, authMethod) {
    const config = getApiTypeConfig(apiType);
    if (!config || !isValidAuthMethod(authMethod)) {
        return false;
    }
    return config.supportedAuthMethods.includes(authMethod);
}

/**
 * 检查API类型在指定授权方法下是否需要userId
 * @param {string} apiType - API类型
 * @param {string} authMethod - 授权方法
 * @returns {boolean} 是否需要userId
 */
function requiresUserId(apiType, authMethod) {
    const config = getApiTypeConfig(apiType);
    if (!config || !isValidAuthMethod(authMethod)) {
        return false;
    }
    return config.requiresUserId[authMethod] || false;
}

/**
 * 获取API类型的默认自动签到设置
 * @param {string} apiType - API类型
 * @returns {boolean} 默认自动签到设置
 */
function getDefaultAutoCheckin(apiType) {
    const config = getApiTypeConfig(apiType);
    return config ? config.defaultAutoCheckin : false;
}

// 导出供其他模块使用
window.ApiTypeConfig = {
    API_TYPES,
    AUTH_METHODS,
    getSupportedApiTypes,
    getSupportedAuthMethods,
    getApiTypeConfig,
    getAuthMethodConfig,
    isValidApiType,
    isValidAuthMethod,
    isAuthMethodSupportedByApiType,
    requiresUserId,
    getDefaultAutoCheckin
};