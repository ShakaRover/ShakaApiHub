# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

- **安装依赖**:
  ```bash
  npm install
  ```
- **启动开发服务器 (使用 nodemon)**:
  ```bash
  npm run dev
  ```
- **启动生产服务器**:
  ```bash
  npm start
  ```
- **运行测试**:
  ```bash
  npm test
  ```
  *(注意: 当前 `test` 脚本只返回一个错误，需要实现真正的测试)*

## 项目架构

本项目是一个基于 Node.js, Express 和 SQLite 的用户认证系统，遵循 MVC (Model-View-Controller) 架构模式。

### 核心目录结构

- `src/`: 后端源代码
    - `app.js`: Express 应用主入口，配置中间件和路由。
    - `config/`: 存放配置文件，如数据库 (`database.js`) 和会话 (`session.js`)。
    - `models/`: 数据模型层 (`User.js`)，负责与数据库交互。使用 `better-sqlite3`。
    - `controllers/`: 控制器层 (`AuthController.js`)，处理路由的业务逻辑。
    - `middleware/`: Express 中间件，如认证 (`auth.js`) 和输入验证 (`validation.js`)。
    - `routes/`: 路由定义 (`auth.js`)，将 API 端点映射到控制器。
    - `services/`: 服务层 (`UserService.js`)，封装核心业务逻辑，被控制器调用。
    - `utils/`: 通用工具函数，如安全相关的函数 (`security.js`)。
- `public/`: 前端静态文件 (HTML, CSS, JS)。
- `shakaHub.db`: SQLite 数据库文件。

### 技术栈

- **后端**: Node.js, Express.js
- **数据库**: SQLite (`better-sqlite3`)
- **安全**:
    - `bcrypt`: 密码哈希
    - `helmet`: 设置安全的 HTTP 头
    - `express-session`: 会话管理
    - `express-rate-limit`: API 速率限制
- **前端**: 原生 HTML/CSS/JavaScript

### 开发原则

项目遵循以下设计原则，在进行代码修改或添加新功能时应予以遵守：
- **KISS (Keep It Simple, Stupid)**
- **YAGNI (You Aren't Gonna Need It)**
- **DRY (Don't Repeat Yourself)**
- **SOLID**
