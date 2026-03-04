#!/bin/sh
set -e
: "${AGENTCHAT_BASIC_AUTH_USER:?AGENTCHAT_BASIC_AUTH_USER is required}"
: "${AGENTCHAT_BASIC_AUTH_PASS:?AGENTCHAT_BASIC_AUTH_PASS is required}"
htpasswd -bc /etc/nginx/.htpasswd "$AGENTCHAT_BASIC_AUTH_USER" "$AGENTCHAT_BASIC_AUTH_PASS"
exec nginx -g 'daemon off;'
