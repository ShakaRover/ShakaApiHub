# ShakaApiHub 功能规格说明书

## 1. 项目概述

### 1.1 项目目标

本项目旨在构建一个通用的 API 站点管理系统。该系统允许用户集中管理、监控和自动化操作多种不同类型的、需要认证的第三方 API 服务站点。

### 1.2 核心功能

- **多用户支持**: 系统支持多用户，每个用户管理自己的资源。
- **站点管理**: 集中管理不同类型的 API 服务站点，包括其认证信息和配置。
- **自动化监控**: 系统需提供一个后台任务，能以可配置的频率，自动检查所有已启用站点的状态、配额（Quota）等关键指标。
- **自动签到**: 系统需为支持的 API 站点类型提供自动每日签到功能。
- **日志系统**: 系统需记录关键的操作日志和站点健康状态历史，便于审计和问题排查。
- **数据管理**: 系统需提供导入、导出和备份站点配置的功能。

---

## 2. 数据持久化模型

系统需要持久化存储以下数据实体。

### 2.1 `users` (用户表)

存储系统用户信息。

| 字段名 | 类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | Integer | Primary Key, Auto-increment | 用户唯一标识 |
| `username` | String | Unique, Not Null | 用户名 |
| `password_hash` | String | Not Null | 加密后的用户密码哈希 |
| `created_at` | DateTime | Not Null | 记录创建时间 |
| `updated_at` | DateTime | Not Null | 记录最后更新时间 |

### 2.2 `api_sites` (API站点表)

存储用户添加的 API 站点信息，是应用的核心表。

| 字段名 | 类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | Integer | Primary Key, Auto-increment | 站点唯一标识 |
| `api_type` | String | Not Null | API 类型，必须是以下之一: `NewApi`, `Veloera`, `AnyRouter`, `VoApi`, `HusanApi`, `DoneHub` |
| `name` | String | Not Null, Unique per user | 站点名称 |
| `url` | String | Not Null | 站点 URL |
| `auth_method` | String | Not Null | 认证方式，必须是 `sessions` 或 `token` |
| `sessions` | Text | | 存储认证所需的 session/cookie (建议JSON格式) |
| `token` | String | | 存储认证所需的 API Token |
| `user_id` | String | | 关联的站点用户名（某些认证方式下需要） |
| `enabled` | Boolean | Not Null, Default: `true` | 是否启用该站点 |
| `auto_checkin` | Boolean | Not Null, Default: `false` | 是否启用自动签到 |
| `remarks` | Text | | 备注 (最大512字符) |
| `last_check_time` | DateTime | | 上次检查时间 |
| `last_check_status` | String | | 上次检查状态，枚举: `success`, `error`, `pending` |
| `last_check_message`| Text | | 上次检查返回的消息 |
| `created_by` | Integer | Not Null, Foreign Key to `users.id` | 创建该站点的用户 ID |
| `site_quota` | Decimal | | (监控) 站点总配额 |
| `site_used_quota`| Decimal | | (监控) 已用配额 |
| `site_request_count`| Integer | | (监控) 请求次数 |
| `site_user_group`| String | | (监控) 用户在目标站点的用户组 |
| `site_aff_code`| String | | (监控) 邀请码 |
| `site_aff_count`| Integer | | (监控) 邀请数量 |
| `site_aff_quota`| Decimal | | (监控) 待使用收益 |
| `site_aff_history_quota`| Decimal | | (监控) 总收益 |
| `site_username`| String | | (监控) 在目标站点的用户名 |
| `site_last_check_in_time`| DateTime | | (监控) 目标站点返回的上次签到时间 |
| `models_list` | Text | | (监控) 支持的模型列表 (建议JSON格式) |
| `tokens_list` | Text | | (监控) 令牌列表 (建议JSON格式) |
| `created_at` | DateTime | Not Null | 记录创建时间 |
| `updated_at` | DateTime | Not Null | 记录最后更新时间 |

### 2.3 `sessions` (会话表)

用于存储用户登录会话信息，其具体实现与所选的会话管理库相关，但至少应包含会话ID和与用户ID的关联。

### 2.4 其他数据表

系统还需以下数据表：
-   **`password_change_logs`**: 记录用户在第三方站点修改密码的历史。此表通过 `user_id` 与用户关联。
    | 字段名 | 类型 | 约束 | 描述 |
    | :--- | :--- | :--- | :--- |
    | `id` | Integer | Primary Key, Auto-increment | 日志唯一标识 |
    | `site_id` | Integer | Not Null, Foreign Key to `api_sites.id` | 关联的API站点ID |
    | `site_name` | Text | Not Null | 站点名称（冗余，用于快照） |
    | `site_url` | Text | Not Null | 站点URL（冗余，用于快照） |
    | `current_username` | Text | Not Null | 操作时使用的站点用户名 |
    | `new_password` | Text | Not Null | 尝试设置的新密码 |
    | `password_changed` | Boolean | Default: `true` | 密码是否成功修改 |
    | `change_time` | DateTime| Default: `CURRENT_TIMESTAMP` | 密码修改时间 |
    | `user_id` | Integer | Not Null, Foreign Key to `users.id` | 执行此操作的用户ID |
    | `status` | Text | Default: `success` | 操作状态 (`success`, `error`) |
    | `error_message` | Text | | 如果失败，记录错误信息 |
    | `created_at` | DateTime| Default: `CURRENT_TIMESTAMP` | 记录创建时间 |
-   **`scheduled_check_config`**: 存储每个用户的自动化监控任务配置。通过 `user_id` 与用户关联。
    | 字段名 | 类型 | 约束 | 描述 |
    | :--- | :--- | :--- | :--- |
    | `user_id` | Integer | Primary Key, Foreign Key to `users.id` | 关联的用户ID |
    | `interval_minutes` | Integer | Not Null, Default: 15 | 任务执行频率（分钟） |
    | `enabled` | Boolean | Not Null, Default: `true` | 是否为该用户启用定时任务 |
    | `last_run` | DateTime| | 上次运行时间 |
    | `next_run` | DateTime| | 下次计划运行时间 |
    | `created_at` | DateTime| Default: `CURRENT_TIMESTAMP` | 记录创建时间 |
    | `updated_at` | DateTime| Default: `CURRENT_TIMESTAMP` | 记录最后更新时间 |
-   **`backups`**: 记录备份文件的元数据。

### 2.5 日志系统 (`log.db`)

系统将日志记录在一个独立的SQLite数据库文件 `log.db` 中，以分离主数据和日志数据。该数据库包含以下几个表：

#### 2.5.1 `system_logs`
存储系统级别的通用日志，与特定用户无关。

| 字段名 | 类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | Integer | Primary Key, Auto-increment | 日志唯一标识 |
| `type` | Text | Not Null | 日志类型 (e.g., 'log_cleanup') |
| `message` | Text | Not Null | 日志消息 |
| `data` | Text | | 附加的JSON格式数据 |
| `created_at` | DateTime| Default: `CURRENT_TIMESTAMP` | 记录创建时间 |

#### 2.5.2 `user_logs`
记录用户执行的显式操作，通过 `user_id` 与用户关联。

| 字段名 | 类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | Integer | Primary Key, Auto-increment | 日志唯一标识 |
| `user_id` | Integer | | 关联的用户ID |
| `action` | Text | Not Null | 用户操作 (e.g., 'login', 'create_site') |
| `resource_type`| Text | | 操作的资源类型 (e.g., 'site') |
| `resource_id` | Text | | 操作的资源ID |
| `details` | Text | | 附加的JSON格式详情 |
| `ip_address` | Text | | 用户的IP地址 |
| `user_agent` | Text | | 用户的User Agent |
| `created_at` | DateTime| Default: `CURRENT_TIMESTAMP` | 记录创建时间 |

#### 2.5.3 `api_logs`
记录对系统API的请求，通过 `user_id` 与用户关联。

| 字段名 | 类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | Integer | Primary Key, Auto-increment | 日志唯一标识 |
| `user_id` | Integer | | 关联的用户ID |
| `method` | Text | Not Null | HTTP请求方法 (e.g., 'GET', 'POST') |
| `path` | Text | Not Null | 请求路径 |
| `status_code`| Integer | | HTTP响应状态码 |
| `response_time`| Integer | | 响应时间 (ms) |
| `ip_address` | Text | | 用户的IP地址 |
| `user_agent` | Text | | 用户的User Agent |
| `created_at` | DateTime| Default: `CURRENT_TIMESTAMP` | 记录创建时间 |

#### 2.5.4 `site_check_logs`
记录对第三方站点的自动或手动检查结果。此表通过 `site_id` 间接与用户关联（`site_id` 关联到 `api_sites` 表，其中包含 `created_by` 用户ID），但没有直接的 `user_id` 字段。

| 字段名 | 类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | Integer | Primary Key, Auto-increment | 日志唯一标识 |
| `site_id` | Integer | Not Null | 关联的API站点ID |
| `check_time` | DateTime| Default: `CURRENT_TIMESTAMP` | 检查发生的时间 |
| `status` | Text | Not Null | 检查状态 (`success`, `error`, `timeout`) |
| `message` | Text | | 检查结果的消息 |
| `response_data`| Text | | 检查过程中的响应数据（JSON格式） |
| `created_at` | DateTime| Default: `CURRENT_TIMESTAMP` | 记录创建时间 |

#### 2.5.5 `token_logs`
记录对第三方站点令牌的操作历史，通过 `user_id` 与用户关联。

| 字段名 | 类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | Integer | Primary Key, Auto-increment | 日志唯一标识 |
| `user_id` | Integer | Not Null | 关联的用户ID |
| `site_id` | Integer | Not Null | 关联的API站点ID |
| `token_id`| Text | | 操作的令牌ID |
| `action` | Text | Not Null | 执行的操作 (e.g., 'create_token') |
| `details` | Text | | 附加的JSON格式详情 |
| `status` | Text | | 操作状态 |
| `error_message`| Text | | 错误信息 |
| `ip_address` | Text | | 用户的IP地址 |
| `user_agent` | Text | | 用户的User Agent |
| `created_at` | DateTime| Default: `CURRENT_TIMESTAMP` | 记录创建时间 |

#### 2.5.6 `site_operation_logs`
记录执行站点相关操作（如检查、刷新）的内部详细步骤，通过 `user_id` 与用户关联。

| 字段名 | 类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | Integer | Primary Key, Auto-increment | 日志唯一标识 |
| `user_id` | Integer | Not Null | 关联的用户ID |
| `site_id` | Integer | Not Null | 关联的API站点ID |
| `operation`| Text | Not Null | 操作类型 (e.g., 'site_check') |
| `step` | Text | Not Null | 操作中的具体步骤 |
| `step_order` | Integer | Default: 1 | 步骤顺序 |
| `status` | Text | Default: `success` | 步骤状态 |
| `details` | Text | | 附加的JSON格式详情 |
| `error_message`| Text | | 错误信息 |
| `execution_time`| Integer| | 步骤执行耗时 (ms) |
| `created_at` | DateTime| Default: `CURRENT_TIMESTAMP` | 记录创建时间 |

### 2.6 备份机制 (文件系统)

系统不使用数据库表来存储备份元数据，而是采用基于文件的备份策略。

- **存储位置**: 备份文件存储在项目根目录下的 `backups/` 目录中。
- **文件格式**: 每个备份都是一个独立的 JSON 文件。
- **用户关联**: 每个备份文件都通过其内部元数据中的 `userId` 字段与特定用户关联。这确保了用户只能看到和恢复自己的备份。

一个典型的备份文件 (`api_sites_backup_{timestamp}_{userId}.json`) 结构如下：

```json
{
  "metadata": {
    "version": "1.0",
    "exportTime": "2023-10-28T12:00:00.000Z",
    "userId": 1,
    "backupType": "manual",
    "backupFileName": "api_sites_backup_1698494400000_1.json"
  },
  "sites": [
    {
      "api_type": "NewApi",
      "name": "My First Site",
      "url": "https://example.com",
      "auth_method": "token",
      "token": "your-secret-token",
      "...": "..."
    }
  ]
}
```

---

## 3. API 端点规格

系统需提供一组 HTTP API 来支持前后端分离的架构。所有API都应以 `/api` 为前缀。

### 3.1 认证接口 (`/api/auth`)
-   `POST /login`: 用户登录。
-   `POST /logout`: 用户登出。
-   `GET /profile`: 获取当前用户信息。
-   `POST /update-password`: 更新当前用户密码。
-   `POST /update-username`: 更新当前用户名。

### 3.2 站点管理接口 (`/api/sites`)
-   `GET /`: 获取当前用户的所有 API 站点。
-   `POST /`: 创建一个新的 API 站点。
-   `GET /stats`: 获取站点统计信息（总数、启用数、禁用数）。
-   `GET /:id`: 获取指定 ID 的站点详情。
-   `PUT /:id`: 更新指定 ID 的站点信息。
-   `DELETE /:id`: 删除指定 ID 的站点。
-   `PATCH /:id/toggle`: 切换指定站点的启用/禁用状态。
-   `POST /:id/check`: 手动触发对指定站点的检查。
-   `POST /:id/topup`: 为指定站点使用兑换码。
-   `GET /:id/check-history`: 获取站点的检查历史。
-   `GET /:id/checkin-status`: 获取站点的最新签到状态。

### 3.3 站点用户接口 (`/api/sites/:id/user`)
-   `GET /self`: 获取在目标站点上的用户信息。
-   `PUT /password`: 修改在目标站点上的密码。
-   `GET /password-history`: 获取在目标站点上的密码修改历史。

### 3.4 令牌管理接口 (`/api/sites/:siteId/tokens`)
-   `GET /`: 获取站点的所有令牌。
-   `POST /`: 创建一个新令牌。
-   `DELETE /`: 删除所有令牌。
-   `PUT /status`: 更新令牌的状态（请求体中包含令牌ID和新状态）。
-   `DELETE /:tokenId`: 删除单个令牌。
-   `POST /auto-create`: 自动创建令牌。

### 3.5 系统管理接口 (`/api/system`)
-   `GET /config`: 获取系统配置。
-   `PUT /config`: 更新系统配置。
-   `GET /timezones`: 获取所有支持的时区列表。
-   `PUT /timezone/config`: 更新系统时区设置。
-   `GET /api-types`: 获取所有支持的API类型的详细配置。
-   `POST /validate-api-site`: 验证站点数据而不保存。
-   `GET /status`: 获取系统健康状态。

### 3.6 自动化任务接口 (`/api/scheduled-check`)
-   `GET /config`: 获取后台监控任务的配置。
-   `PUT /config`: 更新后台监控任务的配置。
-   `POST /trigger`: 手动触发一次后台监控任务。
-   `GET /history`: 获取后台监控任务的执行历史。

### 3.7 数据管理接口
-   `GET /api/sites/export`: 导出站点配置。
-   `POST /api/sites/import`: 导入站点配置。
-   `GET /api/backups`: 获取备份列表。
-   `POST /api/backups`: 创建新备份。
-   `POST /api/backups/restore`: 从备份恢复。
-   `DELETE /api/backups/:fileName`: 删除备份文件。

### 3.8 日志接口 (`/api/logs`)
-   `GET /stats`: 获取日志统计。
-   `GET /all`: 获取所有类型的日志（支持分页和过滤）。
-   `POST /clean`: 清理旧日志。

---

## 4. 业务逻辑规格

### 4.1 站点配置验证逻辑
在创建或更新一个 `api_site` 记录时，必须执行以下验证：

1.  **字段存在性与格式**:
    - `name`, `url`, `api_type`, `auth_method` 不能为空。
    - `name` 长度不能超过 100 字符，`remarks` 长度不能超过 512 字符。
    - `url` 必须是有效的 URL 格式。
2.  **类型与方法有效性**:
    - `api_type` 必须是 `NewApi`, `Veloera`, `AnyRouter`, `VoApi`, `HusanApi`, `DoneHub` 之一。
    - `auth_method` 必须是 `sessions` 或 `token`。
3.  **兼容性与依赖关系**:
    - `AnyRouter` 类型的 `auth_method` 只能是 `sessions`。
    - 当 `auth_method` 为 `sessions` 时, `sessions` 字段不能为空。
    - 当 `auth_method` 为 `token` 时, `token` 字段不能为空。
    - 以下组合必须提供 `user_id` 字段：
        - `AnyRouter` + `sessions`
        - `NewApi` + `token`
        - `Veloera` + `token`
        - `VoApi` + `token`
        - `HusanApi` + `token`
    - `DoneHub` 类型在任何认证方式下都不需要 `user_id`。

### 4.2 自动化站点监控逻辑
系统必须提供一个可配置的后台任务，用于定期检查所有 `enabled=true` 的站点。

1.  **任务调度**:
    - 任务的执行频率（如每15分钟）必须是可配置的。
    - 系统必须确保同一时间只有一个检查任务在运行，以防止任务重叠。
2.  **执行流程**:
    - 获取所有 `enabled=true` 的 `api_sites` 记录。
    - **依次**（非并行）处理每个站点，建议在站点之间加入短暂延迟（如1秒），以避免请求过于集中。
    - 对每个站点执行“单站点检查”流程。
    - 记录本次任务的摘要（总数、成功数、失败数）。
3.  **单站点检查流程**:
    - **获取认证凭据**: 必须能正确处理目标站点的认证，获取有效的会话凭据。
    - **执行自动签到**: 如果站点配置允许，则根据其 `api_type` 向目标站点发送签到请求。
    - **获取远程信息**: 向目标站点请求用户信息、模型列表、令牌列表等。
    - **处理并保存结果**:
        - 将获取到的远程信息更新到本地数据库对应的 `api_sites` 记录中。
        - **注意**: `quota` 值需要进行单位换算，规格为将接口返回的原始值除以 500,000。
        - 更新 `last_check_time` 和 `last_check_status` 字段。
    - **错误处理**: 流程中的任何一步失败，都必须终止对该站点的检查，并将 `last_check_status` 记为 `error`，同时记录错误信息。
    - **具体实现细节**: 请参考第5章“外部API接口规格”。

---

## 5. 外部 API 接口规格

本系统需要与多种类型的第三方 API 站点进行交互。本章节定义了本系统与这些外部站点通信时所遵循的接口“合约”。任何要被本系统管理的第三方站点，都必须符合以下规格。

### 5.1 通用认证要求

本系统在向外部 API 发送请求时，会根据 `api_sites` 表中记录的 `auth_method` 和 `api_type` 来构建认证头。

#### 5.1.1 `token` 认证方式

-   **HTTP Header**: `Authorization: Bearer {api_sites.token}`

#### 5.1.2 `sessions` 认证方式

`sessions` 字段的内容会被首先尝试解析为 JSON。
-   **如果解析成功**:
    -   如果 JSON 中存在 `token` 键，则其值会被用于 `Authorization: Bearer {token}` 头。
    -   如果 JSON 中存在 `cookie` 键，则其值会被用于 `Cookie` 头。
-   **如果解析失败**:
    -   整个 `sessions` 字符串会被直接作为 `Cookie` 头的值。

#### 5.1.3 特定类型的用户识别头

除了上述认证头，系统还会根据 `api_type` 添加一个额外的 HTTP Header 来传递用户身份，前提是 `api_sites.user_id` 字段存在。

-   **`NewApi` 或 `AnyRouter`**: `new-api-user: {api_sites.user_id}`
-   **`Veloera`**: `veloera-user: {api_sites.user_id}`
-   **`VoApi`**: `voapi-user: {api_sites.user_id}`
-   **`HusanApi`**: `Husan-Api-User: {api_sites.user_id}`
-   **`DoneHub`**: 不添加此额外头。

#### 5.1.4 动态 Cookie 处理 (Set-Cookie)

系统的 Cookie 处理机制是基于单次操作的，而非全局持久化。具体逻辑如下：

-   **获取初始 Cookies**: 在执行一个完整的操作（如“站点检查”）之前，系统会首先尝试向目标站点的 `/logo.png` 发送请求。如果该请求失败或未返回有效响应，系统则会回退到向站点的根路径 (`/`) 发送请求。此请求的主要目的是为了获取初始的 `Set-Cookie` 响应头。
-   **合并 Cookies**: 从上述请求中获取到的动态 cookies 会与在 `sessions` 字段中静态配置的 cookies 进行合并。
-   **优先级**: 合并时，动态获取的 cookie 优先级高于 `sessions` 中配置的同名 cookie。
-   **单次使用**: 合并后的最终 cookie 集合将被用于该次操作中的**所有** API 请求（如获取用户信息、签到、获取模型列表等）。
-   **不更新**: 在该操作过程中，从各个 API（如 `/api/user/self`）的响应中收到的任何新的 `Set-Cookie` 头都将被**忽略**，不会用于该操作后续的 API 请求。也就是说，Cookie 状态在一次完整操作的内部是不更新的。

### 5.2 通用端点规格

以下端点是所有或大多数 `api_type` 都需要支持的通用接口。

#### 5.2.1 获取用户信息

-   **端点**: `GET /api/user/self`
-   **成功响应 (2xx)**:
    ```json
    {
      "success": true,
      "message": "success",
      "data": {
        "quota": 5000000,
        "used_quota": 10000,
        "request_count": 120,
        "group": "default",
        "aff_code": "abcdef",
        "aff_count": 10,
        "aff_quota": 500000,
        "aff_history_quota": 1000000,
        "username": "testuser",
        "last_check_in_time": "2023-10-27T10:00:00Z"
      }
    }
    ```
-   **失败响应 (4xx/5xx)**:
    ```json
    {
      "success": false,
      "message": "认证失败"
    }
    ```

#### 5.2.2 获取模型列表

-   **端点**: `GET /api/user/models`
-   **成功响应 (2xx)**:
    ```json
    {
      "success": true,
      "message": "success",
      "data": [ "gpt-4", "gpt-3.5-turbo" ]
    }
    ```

#### 5.2.3 获取令牌列表

-   **端点**: `GET /api/token/`
-   **成功响应 (2xx)**: 响应体必须包含一个令牌数组。系统会按顺序尝试从以下四个位置解析该数组：
    1.  `data.data.records`
    2.  `data.data.items`
    3.  `data.data.data`
    4.  `data.data`
-   **令牌对象结构**: 数组中的每个令牌对象应包含 `id`, `name`, `key`, `status`, `remain_quota`, `created_time`, `expired_time` 等字段。

#### 5.2.4 使用兑换码

-   **端点**: `POST /api/user/topup`
-   **描述**: 使用兑换码为用户在目标站点的账户增加额度或权益。
-   **请求体**:
    ```json
    {
      "key": "your-redemption-code"
    }
    ```
-   **成功响应 (2xx)**:
    ```json
    {
      "success": true,
      "message": "兑换成功"
    }
    ```
-   **失败响应 (4xx/5xx)**:
    ```json
    {
      "success": false,
      "message": "兑换码无效或已使用"
    }
    ```

#### 5.2.5 修改密码

-   **端点**: `PUT /api/user/self`
-   **描述**: 更新用户在目标站点上的信息，主要用于修改密码。此操作包含一个特殊的重试逻辑：
    1.  **首次尝试**: 系统会发送包含所有当前用户信息的请求体，但只更新 `password` 字段。
    2.  **二次尝试 (如果需要)**: 如果首次尝试因特定的用户名错误（例如，响应消息包含 `'User.Username'`）而失败，系统会再次发送请求。在这次请求中，它可能会将 `username` 字段修改为一个新的值（例如 `'user'`），并同时设置新密码。

    因此，一个兼容的外部API需要能够处理这种情况：既要能接受仅密码的更新，也要能处理密码和用户名同时被更新的请求。
-   **请求体**:
    ```json
    {
      "username": "current_username", // 在二次尝试中可能会被修改
      "password": "new_password_here",
      // ... 其他所有从 GET /api/user/self 获取的用户字段
    }
    ```
-   **成功响应 (2xx)**:
    ```json
    {
      "success": true,
      "message": "用户信息更新成功"
    }
    ```
-   **失败响应 (4xx/5xx)**:
    ```json
    {
      "success": false,
      "message": "密码格式错误"
    }
    ```

#### 5.2.6 创建令牌

-   **端点**: `POST /api/token/`
-   **描述**: 在目标站点上创建一个新的API令牌。
-   **请求体**:
    ```json
    {
      "name": "MyNewToken",
      "group": "default",
      "remain_quota": 500000,
      "expired_time": -1,
      "unlimited_quota": true,
      "model_limits_enabled": false,
      "model_limits": "",
      "allow_ips": ""
    }
    ```
-   **成功响应 (2xx)**:
    ```json
    {
      "success": true,
      "message": "令牌创建成功"
    }
    ```
-   **失败响应 (4xx/5xx)**:
    ```json
    {
      "success": false,
      "message": "令牌名称已存在"
    }
    ```

#### 5.2.7 更新令牌状态

-   **端点**: `PUT /api/token/?status_only=true`
-   **描述**: 启用或禁用一个已存在的API令牌。
-   **请求体**:
    ```json
    {
      "id": "token-id-to-update",
      "status": 1
    }
    ```
    - `status`: `1` 表示启用, `2` 表示禁用。
-   **成功响应 (2xx)**:
    ```json
    {
      "success": true,
      "message": "令牌状态更新成功"
    }
    ```
-   **失败响应 (4xx/5xx)**:
    ```json
    {
      "success": false,
      "message": "令牌不存在"
    }
    ```

#### 5.2.8 删除令牌

-   **端点**: `DELETE /api/token/{tokenId}/`
-   **描述**: 删除一个指定的API令牌。令牌的ID需要在URL中提供。
-   **请求体**: 无。
-   **成功响应 (2xx)**:
    ```json
    {
      "success": true,
      "message": "令牌删除成功"
    }
    ```
-   **失败响应 (4xx/5xx)**:
    ```json
    {
      "success": false,
      "message": "令牌不存在"
    }
    ```

### 5.3 特定类型的端点规格

#### 5.3.1 自动签到

此功能仅对 `auto_checkin=true` 的站点有效。

-   **`Veloera` 和 `HusanApi`**:
    -   **端点**: `POST /api/user/check_in`
-   **`AnyRouter`**:
    -   **端点**: `POST /api/user/sign_in`
-   **`VoApi`**:
    -   **端点**: `POST /api/user/clock_in`

-   **请求体**: 所有签到请求的请求体均为空 JSON 对象 `{}`。
-   **响应格式**:
    -   **成功签到**: `{"success": true, "message": "签到成功获得1000点积分"}` (message 中不能包含 "已经签到")
    -   **重复签到**: `{"success": true, "message": "您今天已经签到过了"}`
    -   **签到失败**: `{"success": false, "message": "签到失败"}`

---

## 6. 用户界面规格

### 6.1 API 站点列表页面
系统必须提供一个主界面用于展示和管理 API 站点列表。

-   **列表显示**:
    - 必须以表格形式展示站点列表。
    - 表格应至少包含列：API类型、名称、状态（启用/禁用）、余额、签到状态、上次检查时间、操作。
    - 必须提供一个可展开的详情区域，展示该站点的所有监控数据（如用户组、模型列表、令牌列表等）。
-   **数据操作**:
    - **搜索**: 必须提供一个文本框，能对名称、URL、备注、模型列表等多个字段进行搜索。
    - **过滤**: 必须提供下拉菜单，能按 API 类型、启用状态、签到状态、检查状态进行筛选。
    - **单点操作**: 每一行记录都必须有关联的操作按钮，至少包括：编辑、删除、手动检查、启用/禁用。
    - **批量操作**: 必须提供页面级别的操作按钮，至少包括：添加新站点、批量检查所有站点、配置自动检查任务。
-   **模态框交互**:
    - 添加和编辑站点功能必须通过模态框（弹窗）完成。
    - 删除操作必须有二次确认的对话框。

### 6.2 添加/编辑API站点界面

添加和编辑API站点的功能通过一个统一的模态框（弹窗）界面完成。该界面是动态的，其显示的字段会根据“API类型”和“授权方式”的选择而改变。

#### 6.2.1 界面概览

-   **模式**:
    -   **添加模式**: 当用户点击“添加API站点”时进入此模式。表单为空白状态，并额外提供一个“搜索已知站点”的功能，帮助用户快速从预设列表中填充信息。
    -   **编辑模式**: 当用户点击某个站点的“编辑”按钮时进入此模式。表单会预先填充该站点的现有数据。
-   **核心交互**:
    -   用户首先选择 **API类型**。
    -   然后选择 **授权方式**。
    -   系统会根据这两个核心选项，动态显示或隐藏其他相关字段（如 `Sessions`、`Token`、`User ID`、`启用自动签到`）。
    -   表单在客户端和服务器端都会进行验证，确保数据的完整性和一致性。

#### 6.2.2 字段详解

下表详细说明了模态框中的每一个字段。

| 字段名称 | 字段标识符 | 描述 | 规则与依赖 |
| :--- | :--- | :--- | :--- |
| **搜索已知站点** | `knownSiteSearch` | （仅添加模式）一个搜索框，用于从预定义的站点列表中查找并快速填充`API类型`、`站点名称`和`API地址`。 | - **可见性**: 仅在“添加模式”下显示。<br>- **交互**: 选择一个已知站点后，会自动填充对应字段。 |
| **API类型** | `apiSiteType` | （**必填**）下拉选择框，用于指定目标站点的平台类型。这是决定表单结构的核心字段之一。 | - **可选值**: `NewApi`, `Veloera`, `AnyRouter`, `VoApi`, `HusanApi`, `DoneHub`。 |
| **站点名称** | `apiSiteName` | （**必填**）为该站点设置一个自定义的、便于识别的名称。 | - **验证**: 不能为空，最大长度100个字符。 |
| **API地址** | `apiSiteUrl` | （**必填**）目标站点的完整根URL地址。 | - **验证**: 必须是有效的URL格式（如 `https://api.example.com`）。<br>- **交互**: 如果输入的URL与某个已知站点的URL匹配，且该站点有关联的邀请链接，旁边会显示一个“注册”按钮。 |
| **授权方式** | `apiSiteAuthMethod` | （**必填**）下拉选择框，用于指定认证方式。这是决定表单结构的另一个核心字段。 | - **可选值**: `sessions`, `token`。<br>- **依赖**: `AnyRouter`类型的站点，此选项会自动设为 `sessions` 且不可更改。 |
| **Sessions** | `apiSiteSessions` | （条件必填）一个文本域，用于输入 `sessions` 或 `cookie` 认证信息。 | - **可见性**: 当“授权方式”选择为 `sessions` 时显示。<br>- **验证**: 当此字段可见时，不能为空。 |
| **Token** | `apiSiteToken` | （条件必填）一个输入框，用于输入 `Bearer Token`。 | - **可见性**: 当“授权方式”选择为 `token` 时显示。<br>- **验证**: 当此字段可见时，不能为空。 |
| **User ID** | `apiSiteUserId` | （条件必填）一个输入框，用于输入与凭证关联的用户ID或用户名。 | - **可见性与依赖**: <br>  - 当 `API类型` 为 `AnyRouter` 时（此时授权方式必为`sessions`），此字段**显示**且**必填**。<br>  - 当 `授权方式` 为 `token` 且 `API类型` 不是 `DoneHub` 时，此字段**显示**且**必填**。<br>  - 在其他情况下此字段隐藏。 |
| **备注** | `apiSiteRemarks` | （可选）一个文本域，用于添加关于该站点的任何附加说明。 | - **验证**: 最大长度512个字符。 |
| **启用此API站点** | `apiSiteEnabled` | 一个复选框，用于控制是否启用该站点。禁用的站点将不会被自动监控任务检查。 | - **默认值**: 添加新站点时，默认为勾选（启用）状态。 |
| **启用自动签到** | `apiSiteAutoCheckin` | 一个复选框，用于控制是否为该站点启用每日自动签到功能。 | - **可见性与依赖**: <br>  - 当 `API类型` 为 `AnyRouter` 或 `Veloera` 时，此字段**显示**并**默认勾选**。<br>  - 对于其他所有类型，此字段隐藏。 |

### 6.3 其他页面
系统还应提供以下页面：
-   **登录页**: 用于用户认证。
-   **用户设置页**: 用于修改当前用户的用户名和密码。
-   **数据管理页**: 用于导入/导出站点配置，以及管理数据备份。
-   **系统管理页**: 用于配置系统级参数，如时区、日志清理策略等。
-   **日志查看页**: 用于查看和筛选各类系统日志。
