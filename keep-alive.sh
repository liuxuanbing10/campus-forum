#!/bin/bash
# Campus Forum keep-alive script
# Checks if the forum server is running and restarts it if not

cd /root/campus-forum

if ! curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "[$(date)] Server down, restarting..."
  cd /root/campus-forum && NODE_ENV=production node packages/server/dist/index.js &
  echo "[$(date)] Restarted"
else
  echo "[$(date)] Server OK"
fi
