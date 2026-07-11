#!/bin/bash
# campus-forum 一键部署脚本（裸机 Node.js）
# 用法: bash deploy.sh your-domain.com
set -e

DOMAIN=${1:?用法: bash deploy.sh your-domain.com}
APP_DIR="/opt/campus-forum"
NODE_MIN=20

echo "=== campus-forum 部署 ==="
echo "域名: $DOMAIN"
echo "目录: $APP_DIR"

# 1. 系统依赖
echo "[1/7] 安装系统依赖..."
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx curl > /dev/null

# 2. Node.js (如未安装)
if ! command -v node &> /dev/null || [ $(node -v | cut -d. -f1 | tr -d v) -lt $NODE_MIN ]; then
  echo "[2/7] 安装 Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null
  apt-get install -y -qq nodejs > /dev/null
else
  echo "[2/7] Node.js $(node -v) 已安装"
fi

# 3. 克隆代码
echo "[3/7] 获取代码..."
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git pull
else
  git clone https://github.com/liuxuanbing10/campus-forum.git "$APP_DIR"
  cd "$APP_DIR"
fi

# 4. 安装依赖 + 构建
echo "[4/7] 构建项目..."
npm install
npm run build:prod

# 5. 环境变量
echo "[5/7] 配置环境变量..."
if [ ! -f .env ]; then
  SESSION_SECRET=$(openssl rand -hex 32)
  cat > .env <<EOF
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
DATABASE_PATH=./data/forum.db
SESSION_SECRET=$SESSION_SECRET
CLIENT_URL=https://$DOMAIN
EOF
  mkdir -p data
  echo "  已生成 .env（SESSION_SECRET 已自动创建）"
else
  echo "  .env 已存在，跳过"
fi

# 6. systemd 服务
echo "[6/7] 配置系统服务..."
cat > /etc/systemd/system/campus-forum.service <<EOF
[Unit]
Description=Campus Forum Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=$(which node) packages/server/dist/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable campus-forum
systemctl restart campus-forum
echo "  服务已启动"

# 7. Nginx + HTTPS
echo "[7/7] 配置 Nginx + HTTPS..."
cat > /etc/nginx/sites-available/campus-forum <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

ln -sf /etc/nginx/sites-available/campus-forum /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 先用 HTTP 获取证书
# ponytail: certbot 需要先有 HTTP 可达，临时去掉 SSL 配置
cat > /etc/nginx/sites-available/campus-forum <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

nginx -t && systemctl reload nginx

certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN"

echo ""
echo "=== 部署完成 ==="
echo "访问: https://$DOMAIN"
echo "管理: systemctl {start|stop|restart|status} campus-forum"
echo "日志: journalctl -u campus-forum -f"
