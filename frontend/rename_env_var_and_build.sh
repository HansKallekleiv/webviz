#!/bin/sh
export VITE_APPLICATIONINSIGHTS_CONNECTION_STRING=$APPLICATIONINSIGHTS_CONNECTION_STRING

exec "npm ci --include=dev && npm run build && node compress_static.cjs"

