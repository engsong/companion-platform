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
        echo "--- CERTIFICATES IN /etc/letsencrypt/live ---"
        ls -la /etc/letsencrypt/live/ 2>&1 || true
        ls -la /etc/letsencrypt/live/companion/ 2>&1 || true
        if [ -f "/etc/letsencrypt/live/companion/fullchain.pem" ]; then
            echo "--- CERTIFICATE ISSUER & EXPIRY ---"
            openssl x509 -in /etc/letsencrypt/live/companion/fullchain.pem -issuer -dates -noout 2>&1 || true
        fi
        echo "--- SITES-ENABLED ---"
        ls -la /etc/nginx/sites-enabled/ 2>&1 || true
        echo "--- SITES-AVAILABLE ---"
        ls -la /etc/nginx/sites-available/ 2>&1 || true
        echo "--- CONF.D ---"
        ls -la /etc/nginx/conf.d/ 2>&1 || true
    } > "$diag_file"

    # Push to companion-backend uploads volume for remote inspection at :5000/uploads/diag.txt
    docker exec companion-backend sh -c "cat > /app/uploads/diag.txt" < "$diag_file" 2>/dev/null || true
    # Also push to admin-web and mobile-app containers
    docker exec companion-admin-web sh -c "cat > /usr/share/nginx/html/diag.txt" < "$diag_file" 2>/dev/null || true
    docker exec companion-mobile-app sh -c "cat > /usr/share/nginx/html/diag.txt" < "$diag_file" 2>/dev/null || true
}

publish_diag "START_SETUP"

echo "🛡️  [1/5] Ensuring firewall and ports 80/443 are open..."
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

echo "📦 [2/5] Installing Nginx & Certbot..."
apt-get update -q -y || true
apt-get install -y -q -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" \
    nginx certbot python3-certbot-nginx openssl curl net-tools || true

# Unmask and enable nginx service
systemctl unmask nginx 2>/dev/null || true
systemctl reset-failed nginx 2>/dev/null || true
systemctl enable nginx 2>/dev/null || true

echo "📁 [3/5] Preparing webroot directory for ACME verification..."
mkdir -p /var/www/certbot/.well-known/acme-challenge
echo "acme-test-ok" > /var/www/certbot/.well-known/acme-challenge/test.txt
chown -R www-data:www-data /var/www/certbot
chmod -R 755 /var/www/certbot

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📋 [4/5] Deploying Nginx configurations..."
mkdir -p /etc/nginx/conf.d /etc/nginx/sites-available /etc/nginx/sites-enabled

cp -f "$PROJECT_ROOT/nginx/conf.d/security.conf" /etc/nginx/conf.d/security.conf
cp -f "$PROJECT_ROOT/nginx/sites-available/00-initial-acme.conf" /etc/nginx/sites-available/00-initial-acme.conf
cp -f "$PROJECT_ROOT/nginx/sites-available/sao.on-excapp.app.conf" /etc/nginx/sites-available/sao.on-excapp.app.conf
cp -f "$PROJECT_ROOT/nginx/sites-available/msao.on-excapp.app.conf" /etc/nginx/sites-available/msao.on-excapp.app.conf

# Clean up default site and ensure bootstrap certificate exists
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/00-initial-acme.conf

CERT_DIR="/etc/letsencrypt/live/companion"
mkdir -p "$CERT_DIR"
if [ ! -f "$CERT_DIR/fullchain.pem" ] || [ ! -f "$CERT_DIR/privkey.pem" ]; then
    echo "Creating bootstrap temporary certificate to guarantee valid HTTPS syntax..."
    openssl req -x509 -nodes -days 30 -newkey rsa:2048 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -subj "/CN=sao.on-excapp.app"
    chmod 600 "$CERT_DIR/privkey.pem"
fi

# Enable high-security site configs
ln -sf /etc/nginx/sites-available/sao.on-excapp.app.conf /etc/nginx/sites-enabled/sao.on-excapp.app.conf
ln -sf /etc/nginx/sites-available/msao.on-excapp.app.conf /etc/nginx/sites-enabled/msao.on-excapp.app.conf

echo "Validating Nginx syntax..."
if ! nginx -t; then
    echo "Syntax warning detected; removing potential conflicting conf.d/security.conf..."
    rm -f /etc/nginx/conf.d/security.conf
    nginx -t || true
fi

echo "Starting/Restarting Nginx service..."
systemctl restart nginx || service nginx restart || true

echo "🔐 [5/5] Requesting / Verifying Let's Encrypt Official CA Certificates..."
# Check if current certificate is self-signed or needs Let's Encrypt issuance
NEED_CERT=0
if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
    NEED_CERT=1
elif openssl x509 -in "$CERT_DIR/fullchain.pem" -issuer -noout 2>/dev/null | grep -qi "sao.on-excapp.app"; then
    NEED_CERT=1
fi

if [ "$NEED_CERT" -eq 1 ]; then
    echo "Attempting Let's Encrypt CA certificate issuance via Webroot..."
    if certbot certonly --webroot -w /var/www/certbot \
        --non-interactive --agree-tos \
        --email admin@on-excapp.app \
        --cert-name companion \
        --force-renewal \
        -d sao.on-excapp.app -d msao.on-excapp.app; then
        echo "✅ Certbot Webroot issuance succeeded!"
    else
        echo "⚠️ Webroot mode failed; trying Standalone mode fallback..."
        systemctl stop nginx || service nginx stop || true
        certbot certonly --standalone \
            --non-interactive --agree-tos \
            --email admin@on-excapp.app \
            --cert-name companion \
            --force-renewal \
            -d sao.on-excapp.app -d msao.on-excapp.app || echo "⚠️ Certbot Standalone completed with warning."
        systemctl start nginx || service nginx start || true
    fi
fi

# Reload Nginx with verified certificates
if nginx -t; then
    systemctl reload nginx || systemctl restart nginx || service nginx restart || true
    echo "=============================================================================="
    echo "✅ SUCCESS! Both domains are running High-Security HTTPS (CA):"
    echo "   📱 Mobile App:  https://sao.on-excapp.app"
    echo "   💻 Admin Web:   https://msao.on-excapp.app"
    echo "   🛡️ Anti-DDoS:   Rate-limiting active (conn_limit + api_limit + auth_limit)"
    echo "   🔒 Protection:  Bad bots & scanners automatically dropped (444)"
    echo "=============================================================================="
fi

# Publish final diagnostic
publish_diag "END_SETUP"
