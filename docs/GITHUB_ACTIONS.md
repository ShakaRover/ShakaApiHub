# GitHub Actions 自动化部署文档

## 概述

本项目配置了完整的 CI/CD 流水线，支持自动构建、测试和发布 Docker 镜像到多个容器注册表。

## 工作流说明

### 1. CI/CD Pipeline (`ci-cd.yml`)

**触发条件**: 推送到 `main`/`develop` 分支或创建 PR

**流程**:
1. **测试阶段**: 在 Node.js 20.x 上运行测试
2. **构建测试**: 构建 Docker 镜像并进行基本功能测试
3. **安全扫描**: 使用 Trivy 扫描镜像漏洞
4. **部署**: 推送到 GitHub Container Registry (仅 main 分支)

### 2. Docker 发布 (`docker-publish.yml`)

**触发条件**: 推送到 `main` 分支、标签推送或 PR

**功能**:
- 构建多架构镜像 (amd64, arm64)
- 发布到 GitHub Container Registry
- 自动生成镜像标签和元数据
- 构建缓存优化

### 3. Docker Hub 发布 (`docker-hub.yml`)

**触发条件**: 推送到 `main` 分支、标签推送或发布

**功能**:
- 发布到 Docker Hub
- 自动更新仓库描述
- 多架构支持

### 4. 版本发布 (`release.yml`)

**触发条件**: 推送版本标签 (如 `v1.0.0`)

**功能**:
- 自动创建 GitHub Release
- 生成变更日志
- 构建并发布带版本标签的镜像
- 同时发布到 GHCR 和 Docker Hub

### 5. 镜像清理 (`cleanup.yml`)

**触发条件**: 每周日定时执行或手动触发

**功能**:
- 清理旧的容器镜像
- 保留最近的版本
- 节省存储空间

## 配置要求

### GitHub Secrets

需要在 GitHub 仓库设置中配置以下 Secrets：

#### Docker Hub (可选)
```
DOCKERHUB_USERNAME: 你的 Docker Hub 用户名
DOCKERHUB_TOKEN: Docker Hub 访问令牌
```

#### 其他 Secrets
- `GITHUB_TOKEN`: 自动提供，无需手动配置

### 获取 Docker Hub Token

1. 登录 [Docker Hub](https://hub.docker.com/)
2. 进入 Account Settings > Security
3. 点击 "New Access Token"
4. 输入描述并选择权限
5. 复制生成的 token

## 使用指南

### 1. 开发流程

```bash
# 开发分支推送 - 触发测试
git push origin develop

# 主分支推送 - 触发完整 CI/CD
git push origin main

# 创建 PR - 触发测试和构建验证
gh pr create --title "Feature: xxx" --body "Description"
```

### 2. 版本发布

```bash
# 创建版本标签
git tag v1.0.0
git push origin v1.0.0

# 或使用 GitHub CLI
gh release create v1.0.0 --title "Release v1.0.0" --notes "Release notes"
```

### 3. 手动触发

在 GitHub Actions 页面可以手动触发以下工作流：
- 镜像清理 (cleanup.yml)
- 任何带有 `workflow_dispatch` 的工作流

## 镜像标签策略

### 自动标签

| 触发条件 | 生成标签 | 示例 |
|---------|---------|------|
| 推送到 main | `latest`, `main` | `latest` |
| 推送到 develop | `develop` | `develop` |
| 版本标签 | `v1.0.0`, `v1.0`, `v1`, `latest` | `v1.0.0` |
| PR | `pr-123` | `pr-123` |
| 提交 SHA | `main-abc1234` | `main-abc1234` |

### 使用镜像

```bash
# 最新版本
docker pull ghcr.io/username/shaka-api-hub:latest

# 特定版本
docker pull ghcr.io/username/shaka-api-hub:v1.0.0

# 开发版本
docker pull ghcr.io/username/shaka-api-hub:develop
```

## 多平台支持

所有镜像都支持以下架构：
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64/AArch64)

Docker 会自动选择适合你系统的架构。

## 安全特性

### 1. 漏洞扫描

使用 Trivy 扫描器检测：
- 操作系统漏洞
- 依赖包漏洞
- 配置问题

### 2. 构建证明

为每个镜像生成构建证明，确保：
- 构建来源可追溯
- 构建过程透明
- 供应链安全

### 3. 权限最小化

- 使用最小权限原则
- 只在必要时推送镜像
- 自动清理敏感信息

## 故障排除

### 1. 构建失败

检查以下常见问题：
- Dockerfile 语法错误
- 依赖安装失败
- 测试用例失败

### 2. 推送失败

可能的原因：
- Docker Hub 凭据错误
- 网络连接问题
- 权限不足

### 3. 标签问题

确保：
- 版本标签格式正确 (v1.0.0)
- 分支名称符合预期
- 没有重复的标签

## 监控和通知

### GitHub Actions 状态

在仓库主页可以看到：
- 工作流状态徽章
- 最近的运行结果
- 失败通知

### 自定义通知

可以添加以下通知方式：
- Slack 通知
- 邮件通知
- Discord 通知
- 企业微信通知

## 优化建议

### 1. 构建缓存

- 使用 GitHub Actions 缓存
- 优化 Dockerfile 层级
- 合理安排构建顺序

### 2. 并行构建

- 多架构并行构建
- 测试并行执行
- 独立的工作流任务

### 3. 资源管理

- 定期清理旧镜像
- 监控存储使用量
- 优化构建时间

## 扩展配置

### 添加新的注册表

```yaml
- name: Login to Custom Registry
  uses: docker/login-action@v3
  with:
    registry: your-registry.com
    username: ${{ secrets.CUSTOM_USERNAME }}
    password: ${{ secrets.CUSTOM_PASSWORD }}
```

### 添加测试步骤

```yaml
- name: Run integration tests
  run: |
    docker-compose -f docker-compose.test.yml up --abort-on-container-exit
    docker-compose -f docker-compose.test.yml down
```

### 自定义部署环境

```yaml
- name: Deploy to staging
  if: github.ref == 'refs/heads/develop'
  run: |
    # 部署到测试环境的脚本
```

## 总结

通过这套完整的 CI/CD 配置，项目实现了：

✅ **自动化构建**: 代码推送自动触发构建
✅ **多平台支持**: 支持 x86_64 和 ARM64 架构
✅ **多注册表发布**: 同时发布到 GHCR 和 Docker Hub
✅ **安全扫描**: 自动检测安全漏洞
✅ **版本管理**: 自动化版本发布和标签管理
✅ **资源优化**: 自动清理和缓存优化

这为项目的持续集成和部署提供了强大的基础设施支持。