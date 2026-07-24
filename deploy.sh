#!/bin/bash
# campus-forum 一键部署脚本
# 使用方法：复制整段命令到阿里云 Workbench 执行
# 只需执行一次，以后 push 到 main 分支会自动通过 GitHub Actions 部署

cd /opt/campus-forum && \
git config --global --add safe.directory /opt/campus-forum && \
git pull origin main && \
npm install && \
npm run build:server && \
npm run build:client && \
(npm install -g pm2 2>/dev/null; pm2 restart campus-forum || pm2 start packages/server/dist/index.js --name campus-forum) && \
echo "=== 部署完成 ===" && \
pm2 list
