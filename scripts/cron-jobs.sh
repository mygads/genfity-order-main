#!/bin/bash
# Genfity Cron Jobs Script
# This script calls the cron API endpoints

CRON_SECRET="lIx6mo3LkWHynUXhtRC2ETF8qM4vA9wi"
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

# Subscription cleanup (payment requests, logs, history)
subscription_cleanup() {
    log "Running subscription cleanup..."
    curl -s -X POST "$BASE_URL/api/cron/subscription-cleanup" \
        -H "Authorization: Bearer $CRON_SECRET" \
        -H "Content-Type: application/json"
    echo
}

# Notification retry - process failed notifications with exponential backoff
notification_retry() {
    log "Running notification retry..."
    curl -s -X POST "$BASE_URL/api/cron/notification-retry" \
        -H "Authorization: Bearer $CRON_SECRET" \
        -H "Content-Type: application/json"
    echo
}

# Push subscription cleanup (inactive subscriptions older than N days)
push_subscription_cleanup() {
    log "Running push subscription cleanup..."
    curl -s -X POST "$BASE_URL/api/cron/push-subscription-cleanup" \
        -H "Authorization: Bearer $CRON_SECRET" \
        -H "Content-Type: application/json"
    echo
}

# Run based on argument
case "$1" in
    stock-reset) stock_reset ;;
    subscriptions) subscriptions ;;
    cleanup) cleanup ;;
    subscription-cleanup) subscription_cleanup ;;
    notification-retry) notification_retry ;;
    push-subscription-cleanup) push_subscription_cleanup ;;
    all)
        stock_reset
        subscriptions
        cleanup
        subscription_cleanup
        notification_retry
        push_subscription_cleanup
        ;;
    *)
        echo "Usage: $0 {stock-reset|subscriptions|cleanup|subscription-cleanup|notification-retry|push-subscription-cleanup|all}"
        exit 1
        ;;
esac
