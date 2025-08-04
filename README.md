# ShakaApiHub

基于Node.js + Express + SQLite的现代化用户认证系统，具备响应式设计和完整的用户管理功能。

## 功能特性

- ✅ 用户登录认证
- ✅ 密码安全加密（bcrypt）
- ✅ 用户名和密码修改
- ✅ 现代化响应式UI设计
- ✅ PC和移动端适配
- ✅ 会话管理和安全防护
- ✅ SQLite数据库存储
- ✅ API速率限制
- ✅ 输入验证和安全防护

## 技术栈

- **后端**: Node.js, Express.js
- **数据库**: SQLite (better-sqlite3)
- **安全**: bcrypt, helmet, express-session
- **前端**: 原生HTML5/CSS3/JavaScript
- **架构**: MVC模式，遵循SOLID原则

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量（可选）
```bash
cp .env.example .env
# 编辑.env文件设置自定义配置
```

### 3. 启动应用
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 4. 访问应用
打开浏览器访问: http://localhost:3000

## 默认账户

- **用户名**: admin
- **密码**: admin123

⚠️ **重要**: 首次登录后请立即修改默认密码！

## 项目结构

```
src/
├── app.js              # 应用入口
├── config/             # 配置文件
│   ├── database.js     # 数据库配置
│   └── session.js      # 会话配置
├── models/             # 数据模型
│   └── User.js         # 用户模型
├── controllers/        # 控制器
│   └── AuthController.js
├── middleware/         # 中间件
│   ├── auth.js         # 认证中间件
│   └── validation.js   # 验证中间件
├── routes/             # 路由
│   └── auth.js         # 认证路由
├── services/           # 服务层
│   └── UserService.js  # 用户服务
└── utils/              # 工具函数
    └── security.js     # 安全工具

public/
├── index.html          # 登录页面
├── dashboard.html      # 用户管理页面
├── css/
│   └── styles.css      # 样式文件
└── js/
    └── app.js          # 前端逻辑
```

## API端点

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/profile` - 获取用户信息
- `POST /api/auth/update-password` - 更新密码
- `POST /api/auth/update-username` - 更新用户名

## 安全特性

- ✅ 密码bcrypt加密（12轮）
- ✅ 会话安全管理
- ✅ CSRF防护
- ✅ XSS防护
- ✅ SQL注入防护
- ✅ 输入验证和清理
- ✅ 请求速率限制
- ✅ 安全HTTP头设置

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| PORT | 3000 | 服务器端口 |
| NODE_ENV | development | 运行环境 |
| SESSION_SECRET | 随机生成 | 会话密钥 |

## 开发说明

### 架构原则
项目严格遵循以下设计原则：
- **KISS**: 保持简单直观
- **YAGNI**: 只实现必要功能
- **DRY**: 避免代码重复
- **SOLID**: 面向对象设计原则

### 代码规范
- 使用ES6+语法
- 遵循MVC架构模式
- 分层设计：控制器-服务-模型
- 统一错误处理
- 完整的输入验证