# Push Notification System Setup Guide

This guide explains how to set up and configure the push notification system for the Scout Organizer application using OneSignal.

## Overview

The notification system allows admins to send push notifications to users' devices (phones and PCs) when they post announcements. Users can enable/disable notifications from their profile settings.

## Features

- ✅ Web push notifications for desktop browsers
- ✅ Mobile push notifications support (iOS/Android ready)
- ✅ User consent management
- ✅ Automatic notification delivery when admins post announcements
- ✅ Notification tracking and read status
- ✅ Easy enable/disable from user profile

## Prerequisites

1. OneSignal account (free tier available)
2. OneSignal App ID and API Key
3. For production: SSL certificate (already provided by Ngrok/Render)

## Step 1: Create OneSignal Account

1. Go to [https://onesignal.com](https://onesignal.com)
2. Sign up for a free account
3. Create a new app:
   - Name: "Scout Organizer"
   - Platform: Web Push
   - Site Name: Your app name
   - Site URL: Your production URL (or localhost for development)

## Step 2: Get OneSignal Credentials

1. In your OneSignal dashboard, go to Settings → Keys & IDs
2. Copy the following:
   - **App ID**: Your OneSignal App ID
   - **REST API Key**: Your OneSignal API Key

## Step 3: Configure Environment Variables

### Backend Environment Variables

Add these to your backend environment (`.env` file or deployment settings):

```bash
ONESIGNAL_APP_ID=your_onesignal_app_id_here
ONESIGNAL_API_KEY=your_onesignal_api_key_here
```

### Frontend Environment Variables

Add this to your frontend environment (`.env` file or deployment settings):

```bash
VITE_ONESIGNAL_APP_ID=your_onesignal_app_id_here
```

### For Local Development

Create or update these files:

**Backend `.env`:**
```bash
ONESIGNAL_APP_ID=your_onesignal_app_id_here
ONESIGNAL_API_KEY=your_onesignal_api_key_here
DATABASE_URL=mongodb://localhost:27017/scout-organizer
PORT=5000
NODE_ENV=development
```

**Frontend `.env`:**
```bash
VITE_ONESIGNAL_APP_ID=your_onesignal_app_id_here
VITE_API_URL=http://localhost:5000
VITE_PORT=3000
```

### For Render Deployment

Add these environment variables in your Render dashboard:

**API Service:**
- `ONESIGNAL_APP_ID`: Your OneSignal App ID
- `ONESIGNAL_API_KEY`: Your OneSignal API Key
- `DATABASE_URL`: Your MongoDB connection string

**Web Service:**
- `VITE_ONESIGNAL_APP_ID`: Your OneSignal App ID
- `VITE_API_URL`: Your API service URL

## Step 4: Configure OneSignal Web Push

1. In OneSignal dashboard, go to Settings → Platforms → Web Push
2. Configure:
   - **Site URL**: Your production URL (e.g., https://your-app.onrender.com)
   - **Default Notification Icon**: Upload your app icon
   - **HTTPS**: Ensure your site uses HTTPS (required for web push)

## Step 5: Update Service Worker

OneSignal requires a service worker for web push notifications. The SDK is already included in your `index.html`, but you may need to configure the service worker file in your OneSignal dashboard.

## How It Works

### Backend Integration

1. **Push Notification Service** (`src/lib/pushNotification.ts`):
   - Handles communication with OneSignal API
   - Sends notifications to specific users or groups
   - Supports both player IDs and external user IDs

2. **Registration Endpoints** (`src/routes/pushNotifications.ts`):
   - `POST /api/push/register`: Register user's device for push notifications
   - `DELETE /api/push/unregister`: Unregister user's device

3. **Announcement Integration** (`src/routes/announcements.ts`):
   - Automatically sends push notifications when admins create announcements
   - Targets all users except the announcement author
   - Includes notification data for deep linking

### Frontend Integration

1. **OneSignal Hook** (`src/hooks/useOneSignal.ts`):
   - Initializes OneSignal SDK
   - Requests notification permissions
   - Registers device with backend
   - Handles notification clicks

2. **Profile Settings** (`src/pages/profile.tsx`):
   - Users can enable/disable notifications
   - Shows current permission status
   - Provides easy toggle controls

3. **App Integration** (`src/App.tsx`):
   - Automatically initializes OneSignal for authenticated users
   - Sets external user ID for targeted notifications

## Testing the Notification System

### Local Testing

1. Start your application with the start script:
   ```bash
   ./start-local.sh
   ```

2. Open the application in your browser
3. Log in as a user
4. Go to Profile → Push Notifications
5. Click "Enable" to allow notifications
6. Log in as an admin in another browser
7. Create a new announcement
8. You should receive a push notification

### Production Testing

1. Deploy to Render
2. Ensure environment variables are set
3. Test the same flow as local testing
4. Verify notifications work on mobile devices

## Troubleshooting

### Notifications Not Sending

1. Check that OneSignal credentials are correct
2. Verify environment variables are set
3. Check browser console for errors
4. Ensure user has granted notification permission
5. Verify OneSignal service worker is properly configured

### Permission Denied

1. Users must manually grant permission
2. Check browser settings → Site settings → Notifications
3. Try enabling from profile page again
4. Some browsers block notifications on HTTP (require HTTPS)

### Service Worker Issues

1. Clear browser cache and service workers
2. Check that OneSignal SDK is loaded
3. Verify service worker file is accessible
4. Check browser console for service worker errors

### Database Issues

1. Verify user schema includes OneSignal fields
2. Check that player IDs are being saved
3. Ensure database connection is working
4. Check backend logs for errors

## Mobile App Integration

To add mobile app support:

1. **iOS App**:
   - Add OneSignal iOS SDK to your app
   - Configure push notifications in Xcode
   - Register device with same backend endpoints
   - Use platform: 'ios' when registering

2. **Android App**:
   - Add OneSignal Android SDK to your app
   - Configure Firebase Cloud Messaging
   - Register device with same backend endpoints
   - Use platform: 'android' when registering

The backend is already set up to handle mobile platforms through the registration endpoint.

## Advanced Features

### Custom Notification Sounds

Configure custom sounds in OneSignal dashboard for different notification types.

### Scheduled Notifications

Use OneSignal's scheduling features to send notifications at specific times.

### Segmented Notifications

Create user segments in OneSignal for targeted notifications.

### Analytics

Monitor notification performance in OneSignal dashboard:
- Delivery rates
- Open rates
- Click rates
- Conversion metrics

## Security Considerations

- Never expose OneSignal API Key in frontend code
- Use environment variables for sensitive data
- Implement rate limiting for notification endpoints
- Validate user permissions before sending notifications
- Keep OneSignal SDK updated

## Best Practices

1. **User Consent**: Always ask for permission before sending notifications
2. **Relevant Content**: Send only important announcements
3. **Timing**: Avoid sending notifications during late hours
4. **Frequency**: Don't spam users with too many notifications
5. **Testing**: Test thoroughly before deploying to production
6. **Analytics**: Monitor notification performance regularly

## Support

For issues with:
- **OneSignal Service**: Check [OneSignal Documentation](https://documentation.onesignal.com)
- **Backend Integration**: Check server logs and error messages
- **Frontend Integration**: Check browser console for errors
- **Database Issues**: Check MongoDB connection and data

## Next Steps

After setting up notifications:

1. Test thoroughly with multiple users
2. Monitor notification delivery rates
3. Gather user feedback
4. Optimize notification content and timing
5. Consider adding notification preferences
6. Set up analytics and monitoring

## Environment Variable Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `ONESIGNAL_APP_ID` | OneSignal App ID | Yes | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| `ONESIGNAL_API_KEY` | OneSignal REST API Key | Yes | `NzU1M...` |
| `VITE_ONESIGNAL_APP_ID` | OneSignal App ID (frontend) | Yes | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

## Database Schema Changes

The User schema has been updated to include:
- `oneSignalPlayerId`: String (optional)
- `oneSignalPlatform`: Enum ['web', 'ios', 'android'] (optional)

These fields are automatically managed by the notification system.