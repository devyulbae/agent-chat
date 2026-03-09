#!/bin/sh
set -e

: "${AGENTCHAT_BASIC_AUTH_USER:?AGENTCHAT_BASIC_AUTH_USER is required}"
: "${AGENTCHAT_BASIC_AUTH_PASS:?AGENTCHAT_BASIC_AUTH_PASS is required}"

TLS_DOMAIN="${AGENTCHAT_TLS_DOMAIN:-sybae.duckdns.org}"
CERT_DIR="/etc/nginx/certs"
CERT_FILE="$CERT_DIR/fullchain.pem"
KEY_FILE="$CERT_DIR/privkey.pem"

htpasswd -bc /etc/nginx/.htpasswd "$AGENTCHAT_BASIC_AUTH_USER" "$AGENTCHAT_BASIC_AUTH_PASS"

mkdir -p "$CERT_DIR"
if [ ! -s "$CERT_FILE" ] || [ ! -s "$KEY_FILE" ]; then
  echo "[agent-chat nginx] TLS cert not found. Generating self-signed cert for $TLS_DOMAIN"
  openssl req -x509 -nodes -days 30 -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/CN=$TLS_DOMAIN"
fi

exec nginx -g 'daemon off;'
