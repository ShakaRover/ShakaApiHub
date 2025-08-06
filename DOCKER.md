# Docker 部署指南

## 快速开始

### 1. 构建并运行容器

```bash
# 构建镜像
docker build -t shaka-hub .

# 运行容器
docker run -d \
  --name shaka-hub \
  -p 3000:3000 \
  -v ./app/data:/app/data \
  -v ./app/backups:/app/backups \
  -v ./app/logs:/app/logs \
  shaka-hub
```

### 2. 使用Docker Compose（推荐）

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f shaka-hub

# 停止服务
docker-compose down
```
