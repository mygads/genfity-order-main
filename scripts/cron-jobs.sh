#!/bin/bash
# Genfity Cron Jobs Script
# This script calls the cron API endpoints

CRON_SECRET="9NgZz3qabTWx0j8mOrdkXVBiFJEKSReQ"
BASE_URL="http://localhost"  # Via nginx on port 80

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Stock Reset - runs at midnight
stock_reset() {
    log "Running stock reset..."
    curl -s -X POST "$BASE_URL/api/cron/stock-reset" \
        -H "Authorization: Bearer $CRON_SECRET" \
        -H "Content-Type: application/json"
    echo
}

# Subscription check
subscriptions() {
    log "Running subscription check..."
    curl -s -X POST "$BASE_URL/api/cron/subscriptions" \
        -H "Authorization: Bearer $CRON_SECRET" \
        -H "Content-Type: application/json"
    echo
}

# Cleanup expired data
cleanup() {
    log "Running cleanup..."
    curl -s -X POST "$BASE_URL/api/cron/cleanup" \
        -H "Authorization: Bearer $CRON_SECRET" \
        -H "Content-Type: application/json"
    echo
}

# Run based on argument
case "$1" in
    stock-reset) stock_reset ;;
    subscriptions) subscriptions ;;
    cleanup) cleanup ;;
    all)
        stock_reset
        subscriptions
        cleanup
        ;;
    *)
        echo "Usage: $0 {stock-reset|subscriptions|cleanup|all}"
        exit 1
        ;;
esac
