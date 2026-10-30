#!/usr/bin/env bash
# ==============================================================================
# Robust Automated Nginx & Let's Encrypt SSL CA Setup Script
# Domains:
#   - sao.on-excapp.app   (Mobile App)
#   - msao.on-excapp.app  (Admin Web)
# ==============================================================================

export DEBIAN_FRONTEND=noninteractive

echo "🛡️  [1/5] Ensuring Nginx & Certbot packages are installed..."
apt-get update -q -y || true
apt-get install -y -q -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" \
    nginx certbot python3-certbot-nginx openssl curl || true

echo "📁 [2/5] Preparing webroot directory for ACME verification..."
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot
chmod -R 755 /var/www/certbot

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📋 [3/5] Deploying High-Security Nginx Configuration..."
mkdir -p /etc/nginx/conf.d /etc/nginx/sites-available /etc/nginx/sites-enabled

cp -f "$PROJECT_ROOT/nginx/conf.d/security.conf" /etc/nginx/conf.d/security.conf
cp -f "$PROJECT_ROOT/nginx/sites-available/00-initial-acme.conf" /etc/nginx/sites-available/00-initial-acme.conf
cp -f "$PROJECT_ROOT/nginx/sites-available/sao.on-excapp.app.conf" /etc/nginx/sites-available/sao.on-excapp.app.conf
cp -f "$PROJECT_ROOT/nginx/sites-available/msao.on-excapp.app.conf" /etc/nginx/sites-available/msao.on-excapp.app.conf

# Check if valid SSL certificate already exists
CERT_EXISTS=false
if [ -f "/etc/letsencrypt/live/companion/fullchain.pem" ]; then
    CERT_EXISTS=true
elif [ -f "/etc/letsencrypt/live/sao.on-excapp.app/fullchain.pem" ]; then
    mkdir -p /etc/letsencrypt/live/companion
    ln -sf /etc/letsencrypt/live/sao.on-excapp.app/* /etc/letsencrypt/live/companion/
    CERT_EXISTS=true
fi

if [ "$CERT_EXISTS" = false ]; then
    echo "🌐 [4/5] Enabling Port 80 ACME Bootstrap server..."
    # Disable default site & production SSL sites temporarily
    rm -f /etc/nginx/sites-enabled/default
    rm -f /etc/nginx/sites-enabled/sao.on-excapp.app.conf
    rm -f /etc/nginx/sites-enabled/msao.on-excapp.app.conf
    ln -sf /etc/nginx/sites-available/00-initial-acme.conf /etc/nginx/sites-enabled/00-initial-acme.conf

    nginx -t
    systemctl reload nginx || systemctl restart nginx

    echo "🔐 Requesting Official Let's Encrypt CA Certificates..."
    certbot certonly --webroot -w /var/www/certbot \
        --non-interactive --agree-tos \
        --email admin@on-excapp.app \
        --cert-name companion \
        -d sao.on-excapp.app -d msao.on-excapp.app || echo "⚠️ Certbot request encountered an issue. Will check certificate status below."

    if [ -f "/etc/letsencrypt/live/companion/fullchain.pem" ]; then
        CERT_EXISTS=true
    fi
fi

if [ "$CERT_EXISTS" = true ]; then
    echo "🔒 [5/5] Activating High-Security HTTPS Configuration..."
    rm -f /etc/nginx/sites-enabled/00-initial-acme.conf
    rm -f /etc/nginx/sites-enabled/default

    ln -sf /etc/nginx/sites-available/sao.on-excapp.app.conf /etc/nginx/sites-enabled/sao.on-excapp.app.conf
    ln -sf /etc/nginx/sites-available/msao.on-excapp.app.conf /etc/nginx/sites-enabled/msao.on-excapp.app.conf

    if nginx -t; then
        systemctl reload nginx || systemctl restart nginx
        echo "=============================================================================="
        echo "✅ SUCCESS! Both domains are running High-Security HTTPS (CA):"
        echo "   📱 Mobile App:  https://sao.on-excapp.app"
        echo "   💻 Admin Web:   https://msao.on-excapp.app"
        echo "   🛡️ Anti-DDoS:   Rate-limiting active (conn_limit + api_limit + auth_limit)"
        echo "   🔒 Protection:  Bad bots & scanners automatically dropped (444)"
        echo "=============================================================================="
    else
        echo "❌ Nginx test failed. Falling back to Port 80 bootstrap config to keep service alive."
        ln -sf /etc/nginx/sites-available/00-initial-acme.conf /etc/nginx/sites-enabled/00-initial-acme.conf
        systemctl reload nginx || systemctl restart nginx
    fi
else
    echo "⚠️ Certificates are not yet generated. Keeping Port 80 bootstrap active."
    ln -sf /etc/nginx/sites-available/00-initial-acme.conf /etc/nginx/sites-enabled/00-initial-acme.conf
    systemctl reload nginx || systemctl restart nginx
fi

# Enable auto-renewal timer if available
systemctl enable certbot.timer 2>/dev/null || true
systemctl start certbot.timer 2>/dev/null || true
