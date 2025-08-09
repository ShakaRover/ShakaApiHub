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

本项目是一个基于 Node.js, Express 和 SQLite 的 **API站点管理与监控系统**，集成了用户认证、站点管理、定时检测、日志管理等功能。遵循 MVC (Model-View-Controller) 架构模式。

### 核心功能模块

1. **用户认证系统** - 基础的登录、注册、密码管理
2. **API站点管理** - 添加、编辑、删除API站点配置
3. **站点监控检测** - 定时检测站点状态和自动签到
4. **日志管理** - 操作日志记录和查看
5. **备份服务** - 数据自动备份和恢复

### 核心目录结构

- `src/`: 后端源代码
    - `app.js`: Express 应用主入口，配置中间件、路由和启动定时任务
    - `config/`: 配置文件
        - `database.js`: 数据库连接和预编译语句
        - `session.js`: 会话配置
    - `models/`: 数据模型层（使用 `better-sqlite3`）
        - `User.js`: 用户模型
        - `ApiSite.js`: API站点模型
    - `controllers/`: 控制器层，处理HTTP请求
        - `AuthController.js`: 用户认证控制器
        - `ApiSiteController.js`: API站点管理控制器
        - `LogController.js`: 日志管理控制器
    - `middleware/`: 中间件
        - `auth.js`: 身份认证中间件
        - `validation.js`: 输入验证中间件
        - `logging.js`: 请求日志中间件
    - `routes/`: 路由定义
        - `auth.js`: 认证相关路由
        - `apiSites.js`: API站点管理路由
        - `logs.js`: 日志相关路由
    - `services/`: 业务逻辑层
        - `UserService.js`: 用户服务
        - `ApiSiteService.js`: API站点服务
        - `SiteCheckService.js`: 站点检测服务（支持多种API类型）
        - `ScheduledCheckService.js`: 定时检测服务（基于 node-cron）
        - `LogService.js`: 日志服务
        - `BackupService.js`: 备份服务
    - `utils/`: 工具函数
        - `security.js`: 安全相关函数
- `public/`: 前端静态文件
    - `dashboard.html`: 主要的管理界面
    - `css/admin.css`: 管理界面样式
    - `js/`: 前端JavaScript模块
        - `apiSiteManager.js`: API站点管理功能
        - `logManager.js`: 日志管理功能
        - `scheduledCheckManager.js`: 定时检测管理
- `backups/`: 自动备份文件存储目录
- `shakaHub.db`: SQLite 数据库文件

### 技术栈

- **后端**: Node.js, Express.js
- **数据库**: SQLite (`better-sqlite3`)
- **定时任务**: `node-cron`
- **HTTP客户端**: `axios`
- **安全**:
    - `bcrypt`: 密码哈希
    - `helmet`: 设置安全的 HTTP 头
    - `express-session`: 会话管理
- **前端**: 原生 HTML/CSS/JavaScript（响应式设计）

### 核心业务流程

1. **站点检测流程**: SiteCheckService 支持多种API类型（Veloera、AnyRouter等），通过 axios 进行HTTP请求，支持自定义认证方式
2. **定时任务**: ScheduledCheckService 使用 node-cron 管理定时检测任务，可动态启动/停止
3. **日志系统**: 所有操作都会记录到数据库，支持分页查询和过滤
4. **备份机制**: BackupService 定期备份重要数据，支持手动和自动备份

### 数据库架构

项目使用预编译 SQL 语句提高性能和安全性。主要数据表：
- `users`: 用户账户信息
- `api_sites`: API站点配置信息（URL、认证方式、检测参数等）
- `logs`: 系统操作日志
- 相关索引和触发器用于数据完整性

### 开发原则

项目遵循以下设计原则，在进行代码修改或添加新功能时应予以遵守：
- **KISS (Keep It Simple, Stupid)**
- **YAGNI (You Aren't Gonna Need It)**
- **DRY (Don't Repeat Yourself)**
- **SOLID**

### 扩展性设计

- 服务层设计支持新增API类型的站点检测
- 控制器-服务-模型分层架构便于功能扩展
- 前端模块化JavaScript设计支持新增管理功能
- 数据库设计预留扩展字段支持新功能
