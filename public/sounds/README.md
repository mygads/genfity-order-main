# Sound Files for Order Notifications

## Required Files

This directory should contain the following sound files:

- `new-order.mp3` - Played when a new order arrives
- `order-ready.mp3` - Played when an order is marked as READY
- `payment.mp3` - Played when payment is completed

## File Specifications

- **Format**: MP3
- **Duration**: 1-3 seconds recommended
- **Volume**: Pre-normalized to avoid loud sounds
- **Sample Rate**: 44.1 kHz
- **Bitrate**: 128-192 kbps

## Free Sound Resources

You can get free notification sounds from:
- https://notificationsounds.com/
- https://freesound.org/
- https://mixkit.co/free-sound-effects/notification/

## Usage

These sounds are played via the `soundNotification.ts` utility when:
1. New order detected in auto-refresh
2. Order status changed to READY
3. Payment recorded successfully

Users can enable/disable sounds in their preferences.
