# ShakaApiHub

[![CI/CD Pipeline](https://github.com/ShakaRover/ShakaApiHub/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/ShakaRover/ShakaApiHub/actions/workflows/ci-cd.yml)
[![Docker Hub](https://github.com/ShakaRover/ShakaApiHub/actions/workflows/docker-hub.yml/badge.svg)](https://github.com/ShakaRover/ShakaApiHub/actions/workflows/docker-hub.yml)
[![Release](https://github.com/ShakaRover/ShakaApiHub/actions/workflows/release.yml/badge.svg)](https://github.com/ShakaRover/ShakaApiHub/actions/workflows/release.yml)

基于Node.js + Express + SQLite的现代化API站点管理系统，具备完整的用户认证、站点监控和自动化功能。

## 🚀 Docker 快速部署

### Docker Hub
```bash
# 最新版本
docker pull shakarover/shaka-api-hub:latest

# 特定版本
docker pull shakarover/shaka-api-hub:v1.0.0
```

### 一键启动
```bash
# 使用 docker-compose
curl -O https://raw.githubusercontent.com/ShakaRover/ShakaApiHub/main/docker-compose.yml
docker-compose up -d

# 或使用 docker run
docker run -d \
  --name shaka-api-hub \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  shakarover/shaka-api-hub:latest
```

## ✨ 功能特性

### 🔐 用户认证系统
- ✅ 安全的用户登录认证
- ✅ 密码加密存储（PBKDF2-HMAC-SHA512）
- ✅ 用户名和密码修改
- ✅ SQLite 持久化 Session 存储
- ✅ 会话管理和安全防护

### 🌐 API 站点管理
- ✅ 支持 NewApi、Veloera、AnyRouter 类型
- ✅ 多种授权方式（Sessions、Token）
- ✅ 站点状态监控和检测
- ✅ 自动签到功能
- ✅ 批量导入导出配置

### 📊 监控与日志
- ✅ 实时站点状态监控
- ✅ 详细的操作日志记录
- ✅ 定时检测和报告
- ✅ 数据备份和恢复

### 🎨 用户界面
- ✅ 现代化响应式设计
- ✅ PC 和移动端完美适配
- ✅ 直观的管理界面
- ✅ 实时状态更新

### 🐳 容器化部署
- ✅ Docker 容器化支持
- ✅ 多架构镜像（AMD64/ARM64）
- ✅ 自动化 CI/CD 流水线
- ✅ 一键部署和扩展

## 🛠 技术栈

- **后端**: Node.js, Express.js
- **数据库**: SQLite3 + connect-sqlite3
- **安全**: 内置 crypto 模块, helmet, express-session
- **前端**: 原生 HTML5/CSS3/JavaScript
- **容器**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **架构**: MVC 模式，遵循 SOLID 原则

## 🚀 部署方式

### 方式一：Docker Compose（推荐）
```bash
# 下载配置文件
curl -O https://raw.githubusercontent.com/ShakaRover/ShakaApiHub/main/docker-compose.yml

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 方式二：Docker 运行
```bash
# 创建数据目录
mkdir -p ./data

# 运行容器
docker run -d \
  --name shaka-api-hub \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e NODE_ENV=production \
  -e DOCKER_ENV=true \
  shakarover/shaka-api-hub:latest
```

### 方式三：源码部署
```bash
# 1. 克隆仓库
git clone https://github.com/ShakaRover/ShakaApiHub.git
cd ShakaApiHub

# 2. 安装依赖
npm install

# 3. 配置环境变量（可选）
cp .env.example .env
# 编辑 .env 文件设置自定义配置

# 4. 启动应用
# 开发模式
npm run dev

# 生产模式
npm start
```

### 访问应用
打开浏览器访问: http://localhost:3000

## 🔑 默认账户

- **用户名**: admin
- **密码**: admin123

⚠️ **重要**: 首次登录后请立即修改默认密码！

## 🔄 自动化部署

本项目配置了完整的 CI/CD 流水线：

### 触发条件
- **推送到 main 分支**: 自动构建并发布 latest 镜像
- **创建版本标签**: 自动发布带版本号的镜像和 GitHub Release
- **Pull Request**: 自动运行测试和安全扫描

### 镜像仓库
- **Docker Hub**: `shakarover/shaka-api-hub`

### 版本发布
```bash
# 创建版本标签触发自动发布
git tag v1.0.0
git push origin v1.0.0

# 或使用 GitHub CLI
gh release create v1.0.0 --title "Release v1.0.0" --notes "Release notes"
```

详细配置请参考：[GitHub Actions 文档](docs/GITHUB_ACTIONS.md)

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