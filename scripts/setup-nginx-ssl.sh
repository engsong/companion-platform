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
mkdir -p /var/www/certbot/.well-known/acme-challenge
echo "acme-test-ok" > /var/www/certbot/.well-known/acme-challenge/test.txt
chown -R www-data:www-data /var/www/certbot
chmod -R 755 /var/www/certbot

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📋 [3/5] Deploying Nginx configurations..."
mkdir -p /etc/nginx/conf.d /etc/nginx/sites-available /etc/nginx/sites-enabled

cp -f "$PROJECT_ROOT/nginx/conf.d/security.conf" /etc/nginx/conf.d/security.conf
cp -f "$PROJECT_ROOT/nginx/sites-available/00-initial-acme.conf" /etc/nginx/sites-available/00-initial-acme.conf
cp -f "$PROJECT_ROOT/nginx/sites-available/sao.on-excapp.app.conf" /etc/nginx/sites-available/sao.on-excapp.app.conf
cp -f "$PROJECT_ROOT/nginx/sites-available/msao.on-excapp.app.conf" /etc/nginx/sites-available/msao.on-excapp.app.conf

# Check if certificates already exist
CERT_DIR="/etc/letsencrypt/live/companion"
if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
    echo "🌐 [4/5] Initializing Port 80 ACME Server to obtain Let's Encrypt CA certificate..."
    rm -f /etc/nginx/sites-enabled/default
    rm -f /etc/nginx/sites-enabled/sao.on-excapp.app.conf
    rm -f /etc/nginx/sites-enabled/msao.on-excapp.app.conf
    ln -sf /etc/nginx/sites-available/00-initial-acme.conf /etc/nginx/sites-enabled/00-initial-acme.conf

    echo "Testing Nginx syntax for bootstrap..."
    nginx -t
    systemctl restart nginx || service nginx restart

    echo "🔐 Requesting Official CA Certificates from Let's Encrypt..."
    certbot certonly --webroot -w /var/www/certbot \
        --non-interactive --agree-tos \
        --email admin@on-excapp.app \
        --cert-name companion \
        -d sao.on-excapp.app -d msao.on-excapp.app || echo "⚠️ Certbot challenge in progress..."
fi

# If certificate exists now, activate full HTTPS sites
if [ -f "/etc/letsencrypt/live/companion/fullchain.pem" ]; then
    echo "🔒 [5/5] Activating High-Security HTTPS Configuration..."
    rm -f /etc/nginx/sites-enabled/00-initial-acme.conf
    rm -f /etc/nginx/sites-enabled/default

    ln -sf /etc/nginx/sites-available/sao.on-excapp.app.conf /etc/nginx/sites-enabled/sao.on-excapp.app.conf
    ln -sf /etc/nginx/sites-available/msao.on-excapp.app.conf /etc/nginx/sites-enabled/msao.on-excapp.app.conf

    if nginx -t; then
        systemctl reload nginx || service nginx reload
        echo "=============================================================================="
        echo "✅ SUCCESS! Both domains are running High-Security HTTPS (CA):"
        echo "   📱 Mobile App:  https://sao.on-excapp.app"
        echo "   💻 Admin Web:   https://msao.on-excapp.app"
        echo "   🛡️ Anti-DDoS:   Rate-limiting active (conn_limit + api_limit + auth_limit)"
        echo "   🔒 Protection:  Bad bots & scanners automatically dropped (444)"
        echo "=============================================================================="
    else
        echo "❌ HTTPS test failed. Fallback to Port 80 bootstrap config to keep site available."
        ln -sf /etc/nginx/sites-available/00-initial-acme.conf /etc/nginx/sites-enabled/00-initial-acme.conf
        systemctl restart nginx || service nginx restart
    fi
else
    echo "⚠️ Certificates not yet issued. Keeping Port 80 ACME bootstrap active."
    ln -sf /etc/nginx/sites-available/00-initial-acme.conf /etc/nginx/sites-enabled/00-initial-acme.conf
    systemctl restart nginx || service nginx restart
fi

# Print final diagnostic status
echo "--- Nginx Service Status ---"
systemctl status nginx --no-pager -l || service nginx status || true
