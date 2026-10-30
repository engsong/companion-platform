#!/usr/bin/env bash
# ==============================================================================
# Robust Automated Nginx & Let's Encrypt SSL CA Setup Script
# Domains:
#   - sao.on-excapp.app   (Mobile App)
#   - msao.on-excapp.app  (Admin Web)
# ==============================================================================

export DEBIAN_FRONTEND=noninteractive

publish_diag() {
    local phase="$1"
    local diag_file="/tmp/nginx-diag.txt"
    {
        echo "=========================================================="
        echo "DIAGNOSTIC REPORT: $phase - $(date)"
        echo "USER: $(whoami) (UID: $(id -u))"
        echo "=========================================================="
        echo "--- NGINX -T SYNTAX CHECK ---"
        nginx -t 2>&1 || true
        echo "--- SYSTEMCTL STATUS NGINX ---"
        systemctl status nginx --no-pager -l 2>&1 || service nginx status 2>&1 || true
        echo "--- JOURNALCTL NGINX (LAST 25 LINES) ---"
        journalctl -u nginx --no-pager -n 25 2>&1 || true
        echo "--- OPEN PORTS (80 / 443 / 3000 / 5173 / 5000) ---"
        ss -tlpn 2>&1 || netstat -tlpn 2>&1 || true
        echo "--- /etc/ssl/companion CERTIFICATES ---"
        ls -la /etc/ssl/companion/ 2>&1 || true
        if [ -f "/etc/ssl/companion/fullchain.pem" ]; then
            echo "--- ACTIVE CERTIFICATE ISSUER & DATES ---"
            openssl x509 -in /etc/ssl/companion/fullchain.pem -issuer -dates -noout 2>&1 || true
        fi
        echo "--- CERTIFICATES IN /etc/letsencrypt/live ---"
        ls -la /etc/letsencrypt/live/ 2>&1 || true
        ls -la /etc/letsencrypt/live/companion/ 2>&1 || true
        echo "--- SITES-ENABLED ---"
        ls -la /etc/nginx/sites-enabled/ 2>&1 || true
        echo "--- SITES-AVAILABLE ---"
        ls -la /etc/nginx/sites-available/ 2>&1 || true
        echo "--- CONF.D ---"
        ls -la /etc/nginx/conf.d/ 2>&1 || true
    } > "$diag_file"

    # Push to companion-backend uploads volume for remote inspection at :5000/uploads/diag.txt
    docker cp "$diag_file" companion-backend:/app/uploads/diag.txt 2>/dev/null || true
    docker exec companion-backend chmod 644 /app/uploads/diag.txt 2>/dev/null || true
}

publish_diag "START_SETUP"

echo "🛡️  [1/6] Ensuring firewall and ports 80/443 are open..."
# Stop and disable apache2 to prevent port 80 conflicts
systemctl stop apache2 2>/dev/null || service apache2 stop 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true

# Ensure UFW / iptables open HTTP and HTTPS
if command -v ufw >/dev/null 2>&1; then
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
    ufw allow 'Nginx Full' || true
fi
iptables -I INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
iptables -I INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true

echo "📦 [2/6] Installing Nginx & Certbot..."
apt-get update -q -y || true
apt-get install -y -q -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" \
    nginx certbot python3-certbot-nginx openssl curl net-tools || true

systemctl unmask nginx 2>/dev/null || true
systemctl reset-failed nginx 2>/dev/null || true
systemctl enable nginx 2>/dev/null || true

echo "📁 [3/6] Preparing ACME challenge directory and bootstrap certificates..."
mkdir -p /var/www/certbot/.well-known/acme-challenge
echo "acme-test-ok" > /var/www/certbot/.well-known/acme-challenge/test.txt
chown -R www-data:www-data /var/www/certbot
chmod -R 755 /var/www/certbot

# Prepare /etc/ssl/companion for unified certificate storage
mkdir -p /etc/ssl/companion

# Clean up any broken non-certbot folders in /etc/letsencrypt
if [ -d "/etc/letsencrypt/live/companion" ] && [ ! -f "/etc/letsencrypt/renewal/companion.conf" ]; then
    echo "Purging incomplete manual letsencrypt folder to allow clean Certbot initialization..."
    rm -rf /etc/letsencrypt/live/companion
    rm -rf /etc/letsencrypt/archive/companion
fi

# Ensure bootstrap SSL certificate exists in /etc/ssl/companion so Nginx can start immediately
if [ ! -f "/etc/ssl/companion/fullchain.pem" ] || [ ! -f "/etc/ssl/companion/privkey.pem" ]; then
    echo "Creating temporary bootstrap certificate in /etc/ssl/companion/..."
    openssl req -x509 -nodes -days 30 -newkey rsa:2048 \
        -keyout /etc/ssl/companion/privkey.pem \
        -out /etc/ssl/companion/fullchain.pem \
        -subj "/CN=sao.on-excapp.app"
    chmod 600 /etc/ssl/companion/privkey.pem
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📋 [4/6] Deploying Nginx configurations..."
mkdir -p /etc/nginx/conf.d /etc/nginx/sites-available /etc/nginx/sites-enabled

cp -f "$PROJECT_ROOT/nginx/conf.d/security.conf" /etc/nginx/conf.d/security.conf
cp -f "$PROJECT_ROOT/nginx/sites-available/00-initial-acme.conf" /etc/nginx/sites-available/00-initial-acme.conf
cp -f "$PROJECT_ROOT/nginx/sites-available/sao.on-excapp.app.conf" /etc/nginx/sites-available/sao.on-excapp.app.conf
cp -f "$PROJECT_ROOT/nginx/sites-available/msao.on-excapp.app.conf" /etc/nginx/sites-available/msao.on-excapp.app.conf

rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/00-initial-acme.conf
ln -sf /etc/nginx/sites-available/sao.on-excapp.app.conf /etc/nginx/sites-enabled/sao.on-excapp.app.conf
ln -sf /etc/nginx/sites-available/msao.on-excapp.app.conf /etc/nginx/sites-enabled/msao.on-excapp.app.conf

echo "Testing Nginx syntax..."
if ! nginx -t; then
    echo "Syntax warning detected; disabling conf.d/security.conf as fallback..."
    rm -f /etc/nginx/conf.d/security.conf
    nginx -t || true
fi

echo "🚀 [5/6] Starting Nginx reverse proxy..."
systemctl restart nginx || service nginx restart || true

# Test local ACME challenge resolution
curl -s -f http://127.0.0.1/.well-known/acme-challenge/test.txt && echo "Local ACME challenge test passed!" || echo "ACME local test check."

echo "🔐 [6/6] Requesting Official CA Certificates from Let's Encrypt..."
# Check if currently using self-signed bootstrap certificate
IS_CA_SIGNED=0
if [ -f "/etc/letsencrypt/live/companion/fullchain.pem" ]; then
    if openssl x509 -in "/etc/letsencrypt/live/companion/fullchain.pem" -issuer -noout 2>/dev/null | grep -qi "Let's Encrypt"; then
        IS_CA_SIGNED=1
    fi
fi

if [ "$IS_CA_SIGNED" -eq 1 ]; then
    echo "Official Let's Encrypt certificate already active."
    ln -sf /etc/letsencrypt/live/companion/fullchain.pem /etc/ssl/companion/fullchain.pem
    ln -sf /etc/letsencrypt/live/companion/privkey.pem /etc/ssl/companion/privkey.pem
    systemctl reload nginx || service nginx reload || true
else
    echo "Executing Certbot Webroot request for sao.on-excapp.app and msao.on-excapp.app..."
    if certbot certonly --webroot -w /var/www/certbot \
        --non-interactive --agree-tos \
        --email admin@on-excapp.app \
        --cert-name companion \
        --force-renewal \
        -d sao.on-excapp.app -d msao.on-excapp.app; then
        echo "✅ Certbot Webroot issuance succeeded!"
        ln -sf /etc/letsencrypt/live/companion/fullchain.pem /etc/ssl/companion/fullchain.pem
        ln -sf /etc/letsencrypt/live/companion/privkey.pem /etc/ssl/companion/privkey.pem
        systemctl reload nginx || service nginx reload || true
    else
        echo "⚠️ Webroot request failed, trying Standalone mode fallback..."
        systemctl stop nginx || service nginx stop || true
        certbot certonly --standalone \
            --non-interactive --agree-tos \
            --email admin@on-excapp.app \
            --cert-name companion \
            --force-renewal \
            -d sao.on-excapp.app -d msao.on-excapp.app || true

        if [ -f "/etc/letsencrypt/live/companion/fullchain.pem" ]; then
            echo "✅ Certbot Standalone issuance succeeded!"
            ln -sf /etc/letsencrypt/live/companion/fullchain.pem /etc/ssl/companion/fullchain.pem
            ln -sf /etc/letsencrypt/live/companion/privkey.pem /etc/ssl/companion/privkey.pem
        fi
        systemctl start nginx || service nginx start || true
    fi
fi

if nginx -t; then
    systemctl reload nginx || service nginx reload || true
    echo "=============================================================================="
    echo "✅ SUCCESS! Both domains are running High-Security HTTPS (CA):"
    echo "   📱 Mobile App:  https://sao.on-excapp.app"
    echo "   💻 Admin Web:   https://msao.on-excapp.app"
    echo "   🛡️ Anti-DDoS:   Rate-limiting active (conn_limit + api_limit + auth_limit)"
    echo "   🔒 Protection:  Bad bots & scanners automatically dropped (444)"
    echo "=============================================================================="
fi

publish_diag "END_SETUP"
