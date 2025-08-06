# Session 存储修复文档

## 问题描述

在 Docker 环境中运行时，用户登录成功后立即失效，并且启动时出现警告：

```
Warning: connect.session() MemoryStore is not designed for a production environment, 
as it will leak memory, and will not scale past a single process.
```

## 问题原因

1. **内存存储不稳定**: Express Session 默认使用内存存储，在生产环境中不稳定
2. **进程重启丢失**: 内存中的 session 数据在进程重启时会丢失
3. **多进程不兼容**: 内存存储无法在多个进程间共享
4. **内存泄漏风险**: 长时间运行会导致内存泄漏

## 解决方案

### 1. 使用 SQLite 持久化存储

安装 `connect-sqlite3` 作为 session 存储适配器：

```bash
npm install connect-sqlite3
```

### 2. 为什么选择 connect-sqlite3

- **专门设计**: 专为 Express Session 设计的存储适配器
- **基于 sqlite3**: 底层使用我们已有的 `sqlite3` 驱动
- **持久化**: Session 数据存储在磁盘上，重启不丢失
- **自动清理**: 自动清理过期的 session
- **生产就绪**: 适合生产环境使用

### 3. 配置更新

#### src/config/session.js

```javascript
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const crypto = require('crypto');
const path = require('path');

// 确定数据目录
const dataDir = process.env.NODE_ENV === 'production' && process.env.DOCKER_ENV 
    ? '/app/data' 
    : path.join(__dirname, '../..');

// 创建 session 存储实例
const sessionStore = new SQLiteStore({
    db: 'sessions.db',
    dir: dataDir,
    table: 'sessions',
    cleanupInterval: 300000, // 5分钟清理一次
    ttl: 24 * 60 * 60 * 1000 // 24小时过期
});

const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'shaka-hub-default-secret-key-for-development',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        secure: false, // 开发环境设为 false
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24小时
        sameSite: 'lax'
    },
    name: 'shakaHub.sid',
    rolling: process.env.NODE_ENV === 'production'
};
```

## 配置说明

### 存储配置

- **db**: 数据库文件名 (`sessions.db`)
- **dir**: 数据库文件目录 (Docker 中为 `/app/data`)
- **table**: 表名 (`sessions`)
- **cleanupInterval**: 清理过期 session 的间隔 (5分钟)
- **ttl**: Session 过期时间 (24小时)

### Cookie 配置

- **secure**: HTTPS 环境设为 true，开发环境设为 false
- **httpOnly**: 防止 XSS 攻击
- **maxAge**: Cookie 过期时间
- **sameSite**: 跨站请求策略

### Session 配置

- **secret**: 签名密钥，生产环境应使用环境变量
- **resave**: 不强制保存未修改的 session
- **saveUninitialized**: 不保存未初始化的 session
- **rolling**: 生产环境启用滚动 session

## 文件结构

修复后会创建以下文件：

```
/app/data/
├── shakaHub.db          # 主数据库
├── sessions.db          # Session 数据库
└── sessions.db-wal      # WAL 日志文件
```

## 验证修复

### 1. 检查警告消失

启动应用后不再出现 MemoryStore 警告。

### 2. 测试 Session 持久性

```bash
# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt

# 验证 session
curl -X GET http://localhost:3000/api/auth/profile \
  -b cookies.txt
```

### 3. 检查数据库文件

```bash
ls -la /app/data/sessions.db*
```

## 生产环境配置

### 环境变量

```bash
# Docker 环境
DOCKER_ENV=true
NODE_ENV=production
SESSION_SECRET=your-secure-random-secret-key
HTTPS=true  # 如果使用 HTTPS
```

### Docker Compose

```yaml
services:
  shaka-hub:
    environment:
      - DOCKER_ENV=true
      - NODE_ENV=production
      - SESSION_SECRET=${SESSION_SECRET}
    volumes:
      - ./data:/app/data  # 持久化数据目录
```

## 性能优化

### 1. 清理策略

- 自动清理过期 session (5分钟间隔)
- 可调整 `cleanupInterval` 参数

### 2. 数据库优化

- 使用 WAL 模式提高并发性能
- 自动创建索引优化查询

### 3. 内存使用

- 不再有内存泄漏风险
- Session 数据存储在磁盘上

## 故障排除

### 1. Session 立即失效

检查 cookie 配置：
- `secure` 设置是否正确
- `sameSite` 策略是否合适

### 2. 数据库权限问题

确保数据目录有写权限：
```bash
chmod 755 /app/data
```

### 3. 多容器环境

如果使用多个容器实例，考虑：
- 共享存储卷
- 使用外部 session 存储 (Redis)

## 总结

通过使用 `connect-sqlite3` 替代默认的内存存储：

✅ 解决了 Docker 环境中的 session 失效问题
✅ 消除了生产环境警告
✅ 提供了持久化的 session 存储
✅ 支持自动清理和性能优化
✅ 保持了与现有 sqlite3 依赖的兼容性

这个解决方案既解决了当前问题，又为未来的扩展提供了良好的基础。