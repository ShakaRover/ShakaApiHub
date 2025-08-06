# 使用官方Node.js node:lts-slim 镜像作为基础镜像
FROM node:lts-slim

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制应用代码
COPY src/ ./src/
COPY public/ ./public/

# 创建必要的目录
RUN mkdir -p /app/data /app/backups /app/logs

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV DOCKER_ENV=true

# 暴露端口
EXPOSE 3000

# 创建非root用户
RUN addgroup --gid 1001 --system nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

# 设置数据目录权限
RUN chown -R nextjs:nodejs /app
USER nextjs

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# 启动应用
CMD ["npm", "start"]