# ShakaApiHub 开发文档

## 1. 项目介绍

### 1.1 项目概述

ShakaApiHub 是一个基于 Node.js + Express + SQLite 的现代化 API 站点管理系统。它旨在为用户提供一个集中化的平台来管理、监控和自动化各种类型的 API 站点。

### 1.2 核心功能

- **用户认证系统**: 提供安全的用户登录、注册和会话管理。
- **API 站点管理**: 支持多种 API 站点类型（如 NewApi, Veloera, AnyRouter 等）的增删改查。
- **自动化监控**: 定时检查所有已启用站点的状态、配额（Quota）和其他关键指标。
- **自动签到**: 为支持的 API 站点类型提供自动每日签到功能。
- **操作日志**: 详细记录系统的关键操作，便于审计和问题排查。
- **数据备份与恢复**: 提供自动和手动的数据库备份功能。

### 1.3 技术栈

- **后端**: Node.js, Express.js
- **数据库**: SQLite3 (使用 `sqlite3` 库)
- **会话存储**: `connect-sqlite3`
- **前端**: 原生 HTML5, CSS3, JavaScript
- **后台任务**: `node-cron`
- **HTTP 请求**: `axios`
- **安全性**: `helmet`, 内置 `crypto` 模块

---

## 2. 业务流程

### 2.1 用户认证流程

1.  **登录**: 用户通过前端页面向 `POST /api/auth/login` 发送 `username` 和 `password`。
2.  **控制器处理**: `AuthController`接收请求，并调用 `UserService` 的 `login` 方法。
3.  **服务层逻辑**: `UserService` 使用 `User` 模型根据 `username` 查找用户。
4.  **密码验证**: 如果用户存在，`User` 模型中的 `validatePassword` 方法会验证提交的密码和存储的哈希值是否匹配。此方法兼容旧的 `bcrypt` 和新的 `PBKDF2` 哈希。
5.  **会话创建**: 验证成功后，在 `req.session` 对象中存入 `userId` 和 `username`。`connect-sqlite3` 中间件会将此会话持久化到数据库的 `sessions` 表中。
6.  **路由保护**: 访问受保护的页面（如 `dashboard.html`）或 API 端点时，`auth` 中间件会检查 `req.session.userId` 是否存在。如果不存在，请求将被重定向到登录页面。

### 2.2 API 站点管理流程 (CRUD)

1.  **请求**: 前端通过调用 `/api/sites` 的相关端点 (e.g., `POST /`, `PUT /:id`) 来执行 CRUD 操作。
2.  **控制器**: `ApiSiteController` 接收 HTTP 请求。
3.  **服务层**: 控制器调用 `ApiSiteService` 中相应的方法，服务层负责处理核心业务逻辑。
4.  **数据验证**: 在创建或更新站点时，`ApiSiteService` 会使用 `ApiTypeValidator` 工具类来验证数据的完整性和一致性。例如，它会检查当 `authMethod` 为 'sessions' 时，`userId` 字段是否提供。
5.  **模型层**: `ApiSiteService` 调用 `ApiSite` 模型的方法来执行最终的数据库操作（增、删、改、查）。

### 2.3 自动监控和签到流程

1.  **服务启动**: 应用启动时（在 `src/app.js` 中），`ScheduledCheckService` 会被实例化并启动。
2.  **定时任务**: `ScheduledCheckService` 内部使用 `node-cron` 库来设置一个定时任务（例如，每隔 N 分钟执行一次）。
3.  **执行检查**: 定时任务触发时，服务会从数据库中获取所有 `enabled=1` 的 API 站点。
4.  **站点检查**: 对于每个站点，它会调用 `SiteCheckService`。该服务使用 `axios` 向站点的 URL 发送 HTTP 请求，以获取最新的状态、配额等信息。
5.  **数据更新**: `SiteCheckService` 将获取到的数据通过 `ApiSite` 模型的 `updateSiteCheckInfo` 方法更新回数据库。
6.  **自动签到**: 如果站点配置了 `autoCheckin=1`，`SiteCheckService` 也会在检查过程中执行自动签到逻辑。

### 2.4 日志记录流程

1.  **日志中间件**: `logMiddleware` 在 `src/app.js` 中被注册，它会拦截所有对 `/api` 路径的请求。
2.  **日志记录**: 中间件将请求的详细信息（如方法、路径、状态码、用户ID等）记录到一个独立的 SQLite 数据库 `log.db` 中。
3.  **日志清理**: `LogCleanupService` 作为一个后台服务运行，它会根据系统设置中配置的日志保留期限，定期删除过期的日志记录。

---

## 3. 数据结构

数据库 schema 定义在 `src/config/database.js` 的 `initializeSchema` 方法中。

### 3.1 `users` 表

存储系统用户信息。

| 字段名 | 类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 用户唯一标识 |
| `username` | TEXT | UNIQUE NOT NULL | 用户名 |
| `password_hash` | TEXT | NOT NULL | 使用 PBKDF2-HMAC-SHA512 加密后的密码哈希 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 最后更新时间 |

### 3.2 `api_sites` 表

存储用户添加的 API 站点信息，是应用的核心表。

| 字段名 | 类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 站点唯一标识 |
| `api_type` | TEXT | NOT NULL, CHECK(...) | API 类型 (e.g., 'NewApi', 'Veloera') |
| `name` | TEXT | NOT NULL | 站点名称 |
| `url` | TEXT | NOT NULL | 站点 URL |
| `auth_method` | TEXT | NOT NULL, CHECK(...) | 认证方式 ('sessions' 或 'token') |
| `sessions` | TEXT | | 存储认证所需的 session/cookie (JSON 字符串) |
| `token` | TEXT | | 存储认证所需的 API Token |
| `user_id` | TEXT | | 关联的站点用户名（用于 'sessions' 认证） |
| `enabled` | INTEGER | DEFAULT 1, CHECK(0,1) | 是否启用该站点 (1: 是, 0: 否) |
| `auto_checkin` | INTEGER | DEFAULT 0, CHECK(0,1) | 是否启用自动签到 (1: 是, 0: 否) |
| `last_checkin` | DATETIME | | 上次手动签到时间 |
| `remarks` | TEXT | | 备注 (最大512字符) |
| `site_quota` | REAL | DEFAULT 0 | (监控) 站点总配额 |
| `site_used_quota`| REAL | DEFAULT 0 | (监控) 已用配额 |
| ... | ... | | 其他众多用于监控和统计的字段 |
| `created_by` | INTEGER | NOT NULL, FOREIGN KEY | 创建该站点的用户 ID |

### 3.3 `password_change_logs` 表

记录站点密码修改的历史。

| 字段名 | 类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 日志唯一标识 |
| `site_id` | INTEGER | NOT NULL, FOREIGN KEY | 关联的 `api_sites` 表 ID |
| `site_name` | TEXT | NOT NULL | 站点名称 |
| `new_password` | TEXT | NOT NULL | 修改后的新密码 |
| `status` | TEXT | DEFAULT 'success' | 修改状态 ('success' 或 'error') |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY | 执行操作的用户 ID |
| ... | ... | | 其他日志相关字段 |

### 3.4 Session 数据

用户登录后，以下信息被存储在 `req.session` 中，并由 `connect-sqlite3` 持久化。

- `req.session.userId`: 当前登录用户的 ID。
- `req.session.username`: 当前登录用户的用户名。

---

## 4. 开发注意事项

### 4.1 数据库交互模式

本项目**没有使用 ORM** (如 Sequelize 或 TypeORM)。所有的数据库操作都通过 `src/config/database.js` 中预先准备的 SQL 语句执行。

- **模型层 (`/models`)**: 模型类（如 `User.js`）从 `databaseConfig` 获取语句对象，并调用相应的方法，例如 `this.statements.findUserById.get(id)`。
- **SQL 语句**: 所有 SQL 查询都集中在 `database.js` 的 `prepareStatements` 方法中，这使得 SQL 的管理和优化更加集中。

### 4.2 密码管理与迁移

- **加密算法**: 新密码使用 `crypto.pbkdf2` (PBKDF2-HMAC-SHA512) 进行哈希。
- **历史兼容**: 系统之前使用 `bcrypt`。为了平滑迁移，`User.js` 中的 `validatePassword` 方法能够同时处理两种哈希格式。当用户使用旧密码登录成功后，应考虑将其哈希更新为新格式。

### 4.3 后台服务

应用启动时会初始化几个单例的后台服务：

- `ScheduledCheckService`: 负责定时监控。
- `BackupService`: 负责定时备份。
- `LogCleanupService`: 负责定时清理日志。

这些服务是常驻后台的，其逻辑和生命周期管理都在 `src/app.js` 中。

### 4.4 核心验证逻辑

`src/utils/ApiTypeValidator.js` 是一个非常关键的工具类。它负责在创建和更新 `ApiSite` 时进行复杂的、依赖于 `apiType` 和 `authMethod` 的数据验证。任何涉及站点信息修改的功能开发，都必须了解并可能需要扩展这个验证器。

---

## 5. 有利于 AI 理解的事项

为了让 AI 工具（如代码助手、自动化测试工具等）能更好地理解和操作本项目，以下几点至关重要：

- **项目架构**: 采用 **MVC + 服务层** 的分层设计模式。
  - **`src/controllers`**: 只负责处理 HTTP 请求和响应，是程序的“交通警察”。
  - **`src/services`**: 包含所有核心业务逻辑，是程序的“大脑”。
  - **`src/models`**: 负责与数据库进行交互，是程序的“手脚”。
- **应用入口**: `src/app.js` 是整个应用的启动文件。它负责加载配置、注册中间件、定义路由和启动后台服务。
- **关键依赖**:
  - `express`: 用于构建 Web 服务器和路由。
  - `sqlite3`: 用于直接与 SQLite 数据库交互。
  - `node-cron`: 用于调度后台定时任务（监控、备份等）。
  - `axios`: 用于向外部 API 站点发送 HTTP 请求以进行监控。
- **核心业务逻辑位置**:
  - 用户相关的业务逻辑在 `src/services/UserService.js`。
  - API 站点相关的核心逻辑在 `src/services/ApiSiteService.js` 和 `src/services/SiteCheckService.js`。
- **数据定义**: 所有数据表的 schema 定义和 SQL 查询都可以在 `src/config/database.js` 一个文件中找到。这是理解数据模型的唯一真实来源。
