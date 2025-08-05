# Gemini 上下文

## 项目概述

这是一个基于 Node.js、Express 和 SQLite 的全栈 Web 应用，名为 ShakaApiHub。它提供了一个功能完整的用户认证系统和一个 API 站点管理模块。前端使用原生 HTML、CSS 和 JavaScript，后端遵循 MVC 架构模式。

### 主要技术栈

- **后端**: Node.js, Express.js
- **数据库**: SQLite (使用 `better-sqlite3` 库)
- **前端**: 原生 HTML/CSS/JavaScript
- **认证**: 基于会话 (express-session)
- **安全**: 使用 `helmet` 设置安全头部, `express-rate-limit` 进行速率限制, `bcrypt` 进行密码哈希。

### 核心功能

- 用户登录、登出、注册。
- 安全的密码和用户名修改。
- API 站点的增删改查 (CRUD)。
- 启用/禁用 API 站点。
- 区分用户所属的 API 站点。
- 响应式前端界面。

## 构建与运行

### 安装依赖

```bash
npm install
```

### 运行开发服务器

此命令使用 `nodemon` 启动服务器，文件更改时会自动重启。

```bash
npm run dev
```

### 启动生产环境

```bash
npm start
```

### 访问应用

应用启动后，可以通过以下地址访问：
- **登录页**: `http://localhost:3000`
- **管理后台**: `http://localhost:3000/dashboard.html`

### 默认凭证

- **用户名**: `admin`
- **密码**: `admin123`

**注意**: 首次登录后，强烈建议立即修改默认密码。

## 开发约定

### 项目结构

项目遵循经典的 MVC 模式，代码结构清晰：

- `src/`: 后端源代码
  - `app.js`: 应用主入口，负责中间件、路由和服务器的配置与启动。
  - `config/`: 存放数据库和会话等配置文件。
  - `controllers/`: 控制器层，处理HTTP请求，调用服务并返回响应。
  - `middleware/`: Express 中间件，如用户认证、输入验证等。
  - `models/`: 数据模型，定义数据结构和数据库交互。
  - `routes/`: 路由定义，将 URL 路径映射到相应的控制器。
  - `services/`: 服务层，封装核心业务逻辑。
  - `utils/`: 通用工具函数，如安全相关的函数。
- `public/`: 前端静态文件
  - `*.html`: HTML 页面。
  - `css/`: CSS 样式文件。
  - `js/`: 前端 JavaScript 文件。

### API 端点

项目提供了两组主要的 API 端点：

1.  **认证 API (`/api/auth`)**:
    - `POST /login`: 用户登录
    - `POST /logout`: 用户登出
    - `POST /update-password`: 更新密码
    - `POST /update-username`: 更新用户名
    - `GET /profile`: 获取当前用户信息

2.  **API 站点管理 API (`/api/sites`)**:
    - `GET /`: 获取所有 API 站点
    - `GET /my`: 获取当前用户的 API 站点
    - `GET /stats`: 获取统计信息
    - `GET /:id`: 获取单个 API 站点
    - `POST /`: 创建新的 API 站点
    - `PUT /:id`: 更新 API 站点
    - `PATCH /:id/toggle`: 切换启用/禁用状态
    - `DELETE /:id`: 删除 API 站点

### 代码风格

- 使用 ES6+ 语法。
- 遵循分层架构（路由 -> 控制器 -> 服务 -> 模型）。
- 在路由层和中间件中进行严格的输入验证。
- 通过统一的错误处理中间件管理服务器错误。
