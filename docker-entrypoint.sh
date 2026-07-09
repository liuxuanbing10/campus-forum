#!/bin/sh
# 设置持久化数据目录的符号链接
rm -rf /app/packages/server/data
ln -s /app/data /app/packages/server/data
rm -rf /app/uploads
ln -s /app/data/uploads /app/uploads
# 启动服务器
exec node packages/server/dist/index.js
