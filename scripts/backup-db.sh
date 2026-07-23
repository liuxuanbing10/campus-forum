#!/bin/bash
# campus-forum 数据库自动备份脚本
# 每天保留最近 7 份 + 每月 1 份永久快照

DB="/opt/campus-forum/data/forum.db"
BACKUP_DIR="/opt/campus-forum/backups"

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/monthly"

DATE=$(date +%Y%m%d)
DAY_OF_MONTH=$(date +%d)

# 日备份
cp "$DB" "$BACKUP_DIR/daily/forum.db.$DATE"

# 清理 7 天前的日备份
find "$BACKUP_DIR/daily" -name "forum.db.*" -mtime +7 -delete

# 每月 1 号做月永久快照
if [ "$DAY_OF_MONTH" = "01" ]; then
    cp "$DB" "$BACKUP_DIR/monthly/forum.db.$DATE"
fi

echo "[$(date)] backup done: forum.db.$DATE"
