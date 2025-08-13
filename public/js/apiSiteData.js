// API站点配置数据
const ApiSiteData = {
    // API类型默认站点配置
    defaultSites: {
        'NewApi': {
            name: 'InstCopilot',
            url: 'https://instcopilot-api.com',
            aff: '/register?aff=xFc4'
        },
        'Veloera': {
            name: 'Veloera Zone',
            url: 'https://zone.veloera.org',
            aff: '/register?aff=UIie'
        },
        'AnyRouter': {
            name: 'AnyRouter',
            url: 'https://anyrouter.top',
            aff: '/register?aff=qNgQ'
        },
        'VoApi': {
            name: '公益站',
            url: 'https://api.zhongruanapi.dpdns.org',
            aff: '/register?aff=MdCr'
        },
        'HusanApi': {
            name: '虎三Api',
            url: 'https://claude.husan97x.xyz',
            aff: '/register?aff=cMiX'
        },
        'DoneHub': {
            name: '有间公益',
            url: 'https://api.ccode.qzz.io',
            aff: '/register?aff=BLCN'
        }
    },

    // 已知API站点列表
    knownSites: [
        // NewApi类型
        {
            apiType: 'NewApi',
            name: 'InstCopilot',
            url: 'https://instcopilot-api.com',
            aff: '/register?aff=xFc4'
        },
        {
            apiType: 'NewApi',
            name: 'ClaudeHub',
            url: 'https://qinzhiai.com',
            aff: '/register?aff=Bin7'
        },
        {
            apiType: 'NewApi',
            name: '红石API',
            url: 'https://hongshi1024-l-api.hf.space',
            aff: '/register?aff=HceE'
        },
        {
            apiType: 'NewApi',
            name: 'Kyx公益站',
            url: 'https://api.kkyyxx.xyz',
            aff: '/register?aff=uB1W'
        },
        {
            apiType: 'NewApi',
            name: '猫猫公益',
            url: 'https://catsapi.com',
            aff: '/register?aff=WYWm'
        },
        {
            apiType: 'NewApi',
            name: '图钉LLM',
            url: 'http://llm.imerji.cn',
            aff: '/register?aff=zQss'
        },
        {
            apiType: 'NewApi',
            name: 'DEV API',
            url: 'https://new.crond.dev',
            aff: '/register?aff=POAC'
        },
        {
            apiType: 'NewApi',
            name: '波波公益站',
            url: 'https://for.shuo.bar',
            aff: '/register?aff=1qIp'
        },
        {
            apiType: 'NewApi',
            name: 'yanami.vip',
            url: 'https://newapi.yanami.vip',
            aff: '/register?aff=2GM9'
        },
        {
            apiType: 'NewApi',
            name: 'CloseAI API',
            url: 'https://api.closeai.im',
            aff: '/register?aff=VQwZ'
        },
        {
            apiType: 'NewApi',
            name: 'aliyahzombie',
            url: 'https://newapi.aliyahzombie.top',
            aff: '/register?aff=wtht'
        },
        {
            apiType: 'NewApi',
            name: '23公益站',
            url: 'https://sdwfger.edu.kg',
            aff: '/register?aff=mxgj'
        },
        {
            apiType: 'NewApi',
            name: '薄荷API',
            url: 'https://x666.me',
            aff: '/register?aff=2o1H'
        },
        {
            apiType: 'NewApi',
            name: '翰林文苑',
            url: 'https://api.voct.dev',
            aff: '/register?aff=xMJR'
        },
        // Veloera类型
        {
            apiType: 'Veloera',
            name: 'Veloera Zone',
            url: 'https://zone.veloera.org',
            aff: '/register?aff=UIie'
        },
        {
            apiType: 'Veloera',
            name: '小明公益站',
            url: 'https://aiapi.696988.xyz',
            aff: '/register?aff=3Xp9'
        },
        {
            apiType: 'Veloera',
            name: 'CTW公益',
            url: 'https://free.ctw.ink',
            aff: '/register?aff=gHRw'
        },
        {
            apiType: 'Veloera',
            name: 'LinsAI',
            url: 'https://ai.lins.dev',
            aff: '/register?aff=zROJ'
        },
        {
            apiType: 'Veloera',
            name: 'SlowAPI',
            url: 'https://api.banlanzs.tech',
            aff: '/register?aff=3Bqn'
        },
        {
            apiType: 'Veloera',
            name: '归一',
            url: 'https://ai.luckylu71.qzz.io',
            aff: '/register?aff=Ehwd'
        },
        {
            apiType: 'Veloera',
            name: 'wenwen12345',
            url: 'https://veloera.wenwen12345.top',
            aff: '/register?aff=Jxcc'
        },
        {
            apiType: 'Veloera',
            name: 'Mu.Li API',
            url: 'https://api.awa1.fun',
            aff: '/register?aff=G59l'
        },
        // AnyRouter类型
        {
            apiType: 'AnyRouter',
            name: 'AnyRouter',
            url: 'https://anyrouter.top',
            aff: '/register?aff=qNgQ'
        },
        // HusanApi类型
        {
            apiType: 'HusanApi',
            name: '虎三Api',
            url: 'https://claude.husan97x.xyz',
            aff: '/register?aff=cMiX'
        },
        // DoneHub类型
        {
            apiType: 'DoneHub',
            name: '有间公益',
            url: 'https://api.ccode.qzz.io',
            aff: '/register?aff=BLCN'
        },
        // VoApi类型
        {
            apiType: 'VoApi',
            name: '公益站',
            url: 'https://api.zhongruanapi.dpdns.org',
            aff: '/register?aff=MdCr'
        }
    ],

    // 获取API类型的默认站点
    getDefaultSite(apiType) {
        return this.defaultSites[apiType] || null;
    },

    // 获取指定API类型的所有已知站点
    getKnownSitesByType(apiType) {
        return this.knownSites.filter(site => site.apiType === apiType);
    },

    // 搜索已知站点
    searchKnownSites(keyword) {
        const lowerKeyword = keyword.toLowerCase();
        return this.knownSites.filter(site => 
            site.name.toLowerCase().includes(lowerKeyword) ||
            site.url.toLowerCase().includes(lowerKeyword) ||
            site.apiType.toLowerCase().includes(lowerKeyword)
        );
    },

    // 获取所有API类型
    getAllApiTypes() {
        return Object.keys(this.defaultSites);
    }
};

// 导出到全局
window.ApiSiteData = ApiSiteData;