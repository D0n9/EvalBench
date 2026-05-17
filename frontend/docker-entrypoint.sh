#!/bin/sh
set -e

# ENABLE_LANDING_PAGE: 是否展示根路径产品首页。true/1/yes/on 为开启，false/0/no/off 为关闭。
# 关闭时访问 / 会重定向到 /login（由前端 router 读取 window.__RUNTIME_CONFIG__）。
RAW="${ENABLE_LANDING_PAGE:-true}"
case "$RAW" in
  true|1|yes|on|TRUE|YES|Yes) VAL=true ;;
  false|0|no|off|FALSE|NO|No) VAL=false ;;
  *) VAL=true ;;
esac

printf 'window.__RUNTIME_CONFIG__ = { enableLandingPage: %s };\n' "$VAL" \
  > /usr/share/nginx/html/runtime-config.js

exec nginx -g "daemon off;"
