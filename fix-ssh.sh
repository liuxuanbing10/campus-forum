#!/bin/bash
# SSH 保活 + 修复脚本
# 在 Workbench 执行一次，设置 crontab 每5分钟检查
# 使用方法：复制到 Workbench 执行

# 确保 sshd 运行
systemctl is-active sshd || systemctl restart sshd

# 添加 crontab 保活
(crontab -l 2>/dev/null; echo "*/5 * * * * systemctl is-active sshd || systemctl restart sshd") | sort -u | crontab -

echo "SSH 保活已设置"
crontab -l
