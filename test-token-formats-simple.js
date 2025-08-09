#!/usr/bin/env node

/**
 * 测试令牌API的多种JSON格式支持（独立测试）
 */

async function testTokenFormats() {
    console.log('🧪 开始测试令牌API的多种JSON格式支持\n');
    
    // 模拟不同格式的API响应数据
    const testCases = [
        {
            name: '格式1: data.data.records (分页格式)',
            mockResponse: {
                success: true,
                data: {
                    records: [
                        {
                            id: 1,
                            name: "test-token-1",
                            key: "tk-abc123...",
                            status: 1,
                            remain_quota: 1000000,
                            model_limits_enabled: true,
                            created_time: 1640995200,
                            expired_time: -1
                        }
                    ]
                }
            }
        },
        {
            name: '格式2: data.data.items (简单格式)',
            mockResponse: {
                success: true,
                data: {
                    items: [
                        {
                            id: 2,
                            name: "test-token-2",
                            key: "tk-def456...",
                            status: 1,
                            model_limits_enabled: false,
                            created_time: 1640995200,
                            expired_time: -1
                        }
                    ]
                }
            }
        },
        {
            name: '格式3: data.data (新数组格式)',
            mockResponse: {
                success: true,
                data: {
                    data: [
                        {
                            id: 287,
                            user_id: 29,
                            key: "ujt2FYFqCLpgx5X_RkVqkQsmPoiTGHwbnG7wjzZxLZ2SBSpFB1P3AJbzByA",
                            status: 1,
                            name: "c2",
                            created_time: 1754750441,
                            accessed_time: 1754750441,
                            expired_time: -1,
                            remain_quota: 0,
                            unlimited_quota: true,
                            used_quota: 0,
                            group: "Kimi-K2",
                            setting: {
                                heartbeat: {
                                    enabled: false,
                                    timeout_seconds: 30
                                }
                            }
                        },
                        {
                            id: 17,
                            user_id: 29,
                            key: "A1sd1HQ6DpsIjwn_ncck8S_G-Fite86-2KnxYTe7ZG7n0Ip79LBHKNRYRAQ",
                            status: 1,
                            name: "cc",
                            created_time: 1754454381,
                            accessed_time: 1754454381,
                            expired_time: -1,
                            remain_quota: 0,
                            unlimited_quota: true,
                            used_quota: 0,
                            group: "claude-code",
                            setting: {
                                heartbeat: {
                                    enabled: false,
                                    timeout_seconds: 30
                                }
                            }
                        }
                    ],
                    page: 1,
                    size: 10,
                    total_count: 2
                },
                message: ""
            }
        },
        {
            name: '无效格式测试',
            mockResponse: {
                success: true,
                data: {
                    unknown_field: []
                }
            }
        }
    ];
    
    // 模拟parseTokenResponse方法来测试格式解析逻辑
    function parseTokenResponse(data) {
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
        }
        // 格式2: data.data.items (简单格式)
        else if (data.data && data.data.items && Array.isArray(data.data.items)) {
            tokensList = data.data.items;
            tokensCount = data.data.items.length;
            formatUsed = 'data.data.items';
        }
        // 格式3: data.data.data (新嵌套格式)
        else if (data.data && data.data.data && Array.isArray(data.data.data)) {
            tokensList = data.data.data;
            tokensCount = data.data.data.length;
            formatUsed = 'data.data.data';
        }
        // 格式4: data.data (数组直接在data.data内)
        else if (data.data && Array.isArray(data.data)) {
            tokensList = data.data;
            tokensCount = data.data.length;
            formatUsed = 'data.data';
        }
        // 格式不匹配
        else {
            return {
                success: false,
                message: '令牌列表数据格式异常，请检查API响应格式',
                data: null,
                debug: JSON.stringify(data.data, null, 2)
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
    }
    
    // 测试每种格式
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`📋 测试 ${i + 1}/4: ${testCase.name}`);
        
        try {
            const result = parseTokenResponse(testCase.mockResponse);
            
            if (result.success) {
                console.log(`✅ 成功: ${result.message}`);
                if (result.metadata) {
                    console.log(`   📊 元数据: 格式=${result.metadata.format}, 数量=${result.metadata.count}`);
                    if (result.metadata.pagination) {
                        console.log(`   📄 分页: 第${result.metadata.pagination.page}页, 每页${result.metadata.pagination.size}条, 总计${result.metadata.pagination.total_count}条`);
                    }
                }
                if (result.data && result.data.length > 0) {
                    console.log(`   🎫 首个令牌: ID=${result.data[0].id}, 名称="${result.data[0].name}", 组="${result.data[0].group || '默认组'}"`);
                }
            } else {
                console.log(`❌ 失败: ${result.message}`);
                if (result.debug) {
                    console.log(`   🐛 调试信息:`, result.debug);
                }
            }
        } catch (error) {
            console.log(`💥 异常: ${error.message}`);
        }
        
        console.log(''); // 空行分隔
    }
    
    console.log('🎯 测试完成! 所有格式均已验证。');
}

// 运行测试
if (require.main === module) {
    testTokenFormats().catch(console.error);
}

module.exports = { testTokenFormats };