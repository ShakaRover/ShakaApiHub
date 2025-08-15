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
-   **`password_change_logs`**: 记录用户在第三方站点修改密码的历史。
-   **`scheduled_check_config`**: 存储自动化监控任务的配置，如执行频率。
-   **`log`**: 存储各类系统和操作日志。
-   **`backups`**: 记录备份文件的元数据。

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

### 6.2 其他页面
系统还应提供以下页面：
-   **登录页**: 用于用户认证。
-   **用户设置页**: 用于修改当前用户的用户名和密码。
-   **数据管理页**: 用于导入/导出站点配置，以及管理数据备份。
-   **系统管理页**: 用于配置系统级参数，如时区、日志清理策略等。
-   **日志查看页**: 用于查看和筛选各类系统日志。
