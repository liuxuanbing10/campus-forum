FROM node:22-slim
WORKDIR /app

# 复制 package 文件和配置
COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY plugins/ ./plugins/

# 安装依赖
RUN npm install

# 构建后端 + 前端
RUN npm run build:server && npm run build:client

# 环境变量
ENV NODE_ENV=production
ENV PORT=8080
ENV SERVE_STATIC=true
EXPOSE 8080

CMD ["node", "packages/server/dist/index.js"]
