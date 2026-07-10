FROM node:22-slim
WORKDIR /app
# 复制 package 文件和配置
COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY plugins/ ./plugins/
# 安装依赖并构建后端
RUN npm install
RUN npm run build:server
# 设置环境变量（API-only 模式，使用 Turso 远程数据库）
ENV NODE_ENV=production
ENV PORT=3001
ENV SERVE_STATIC=false
EXPOSE 3001
# 启动命令
CMD ["node", "packages/server/dist/index.js"]
