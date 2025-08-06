#!/bin/bash

# 测试 Docker 构建脚本
# 用于本地验证 GitHub Actions 构建流程

set -e

echo "🧪 开始测试 Docker 构建流程..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker 未运行，请启动 Docker${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker 环境检查通过${NC}"

# 构建镜像
echo -e "${YELLOW}🔨 开始构建 Docker 镜像...${NC}"
docker build -t shaka-api-hub:test .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker 镜像构建成功${NC}"
else
    echo -e "${RED}❌ Docker 镜像构建失败${NC}"
    exit 1
fi

# 测试镜像
echo -e "${YELLOW}🧪 开始测试 Docker 镜像...${NC}"

# 启动容器
docker run -d --name shaka-test -p 3001:3000 shaka-api-hub:test

# 等待容器启动
echo "⏳ 等待容器启动..."
sleep 10

# 检查容器状态
if ! docker ps | grep shaka-test > /dev/null; then
    echo -e "${RED}❌ 容器启动失败${NC}"
    docker logs shaka-test
    docker rm -f shaka-test 2>/dev/null || true
    exit 1
fi

# 健康检查
echo "🔍 执行健康检查..."
if curl -f http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 健康检查通过${NC}"
else
    echo -e "${RED}❌ 健康检查失败${NC}"
    docker logs shaka-test
    docker stop shaka-test
    docker rm shaka-test
    exit 1
fi

# 清理
echo "🧹 清理测试环境..."
docker stop shaka-test
docker rm shaka-test

echo -e "${GREEN}🎉 Docker 构建测试完成！${NC}"
echo -e "${GREEN}✅ 镜像可以正常构建和运行${NC}"

# 显示镜像信息
echo -e "${YELLOW}📊 镜像信息:${NC}"
docker images shaka-api-hub:test --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

echo ""
echo -e "${GREEN}🚀 可以安全地推送到 GitHub 触发自动构建！${NC}"