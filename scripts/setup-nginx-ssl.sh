#!/usr/bin/env bash
# ==============================================================================
# Automated Nginx & Let's Encrypt SSL CA Setup Script
# Domains:
#   - sao.on-excapp.app   (Mobile App)
#   - msao.on-excapp.app  (Admin Web)
# ==============================================================================

set -euo pipefail

echo "🛡️  [1/6] Installing necessary security packages..."
apt-get update -q
apt-get install -y -q nginx certbot python3-certbot-nginx openssl curl

echo "📁 [2/6] Preparing webroot and DH parameters..."
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot
chmod -R 755 /var/www/certbot

if [ ! -f /etc/nginx/dhparam.pem ]; then
    echo "🔑 Generating 2048-bit Diffie-Hellman parameters (this may take a minute)..."
    openssl dhparam -out /etc/nginx/dhparam.pem 2048
fi

echo "📋 [3/6] Deploying High-Security Nginx Configuration..."
mkdir -p /etc/nginx/conf.d /etc/nginx/sites-available /etc/nginx/sites-enabled

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cp "$PROJECT_ROOT/nginx/conf.d/security.conf" /etc/nginx/conf.d/security.conf
cp "$PROJECT_ROOT/nginx/sites-available/sao.on-excapp.app.conf" /etc/nginx/sites-available/sao.on-excapp.app.conf
cp "$PROJECT_ROOT/nginx/sites-available/msao.on-excapp.app.conf" /etc/nginx/sites-available/msao.on-excapp.app.conf

# Check if real Let's Encrypt certs exist; if not, generate temporary dummy certs to allow initial nginx start
for domain in sao.on-excapp.app msao.on-excapp.app; do
    CERT_DIR="/etc/letsencrypt/live/$domain"
    if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
        echo "⚠️  Temporary self-signed certificate for initial bootstrapping of $domain..."
        mkdir -p "$CERT_DIR"
        openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
            -keyout "$CERT_DIR/privkey.pem" \
            -out "$CERT_DIR/fullchain.pem" \
            -subj "/CN=$domain"
        cp "$CERT_DIR/fullchain.pem" "$CERT_DIR/chain.pem"
    fi
done

# Enable sites
ln -sf /etc/nginx/sites-available/sao.on-excapp.app.conf /etc/nginx/sites-enabled/sao.on-excapp.app.conf
ln -sf /etc/nginx/sites-available/msao.on-excapp.app.conf /etc/nginx/sites-enabled/msao.on-excapp.app.conf
rm -f /etc/nginx/sites-enabled/default

# Test & start/reload Nginx for ACME challenge
nginx -t
systemctl restart nginx

echo "🔐 [4/6] Requesting Official CA Certificates from Let's Encrypt..."
# Request certificates for both domains
for domain in sao.on-excapp.app msao.on-excapp.app; do
    echo "Issuing certificate for $domain..."
    certbot certonly --webroot -w /var/www/certbot \
        --non-interactive --agree-tos \
        --email admin@on-excapp.app \
        -d "$domain" \
        --keep-until-expiring || {
            echo "⚠️  First attempt note: retrying with --force-renewal for $domain..."
            certbot certonly --webroot -w /var/www/certbot \
                --non-interactive --agree-tos \
                --email admin@on-excapp.app \
                -d "$domain" \
                --force-renewal
        }
done

echo "🔄 [5/6] Reloading Nginx with Official CA Certificates..."
nginx -t
systemctl reload nginx

echo "⏱️  [6/6] Enabling Automatic SSL Renewal Timer..."
systemctl enable --now certbot.timer

echo "=============================================================================="
echo "✅ SUCCESS! Both domains are now configured with High-Security HTTPS (CA):"
echo "   📱 Mobile App:  https://sao.on-excapp.app"
echo "   💻 Admin Web:   https://msao.on-excapp.app"
echo "   🛡️ Anti-DDoS:   Rate-limiting active (conn_limit + api_limit + auth_limit)"
echo "   🔒 Protection:  Bad bots & exploit scanners automatically dropped (444)"
echo "   🔄 Auto-Renew:  Certbot systemd timer enabled (60-day auto-renewal)"
echo "=============================================================================="
