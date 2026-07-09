FROM node:22-slim
# 安装 better-sqlite3 编译所需的工具
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# 复制 package 文件和配置
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY plugins/ ./plugins/
# 安装依赖并构建
RUN npm install
RUN npm run build
# 创建数据目录和上传目录
RUN mkdir -p /app/data /app/data/uploads
# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/forum.db
ENV UPLOADS_DIR=/app/data/uploads
EXPOSE 3001
# 启动脚本
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh
CMD ["/app/docker-entrypoint.sh"]
