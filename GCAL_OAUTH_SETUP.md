# Google Calendar Sync Setup (OAuth)

To enable writing events directly to your Google Calendar via the API (which is free), you need to set up OAuth credentials in the Google Cloud Console. This gives your application permission to act on your behalf.

## 1. Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project drop-down and select **New Project**.
3. Name it "Music Planner Sync" and click **Create**.

## 2. Enable the Google Calendar API
1. In the sidebar, go to **APIs & Services** > **Library**.
2. Search for "Google Calendar API" and click **Enable**.

## 3. Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select **External** and click **Create**.
3. Fill in the required fields (App name: Music Planner, User support email, Developer contact email).
4. Click **Save and Continue**.
5. Click **Add or Remove Scopes** and add `https://www.googleapis.com/auth/calendar.events`.
6. Add your personal Google email as a **Test user** so you can log in while the app is in "Testing" mode.

## 4. Create Credentials
1. Go to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Select **Web application** as the application type.
4. Add your domain to **Authorized redirect URIs**. (e.g., `http://localhost:3000/api/auth/callback/google` for local testing).
5. Click **Create**.
6. Copy the **Client ID** and **Client Secret**.

## 5. Environment Variables
Add these to your Next.js environment (e.g., in `.env.local` or Vercel):
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXTAUTH_SECRET=a_random_string_here # Used if implementing NextAuth.js
```

## Next Steps for Development
Once credentials are set up, you will need to:
1. Install an auth library like `next-auth` to handle the OAuth login flow.
2. Store the user's `access_token` and `refresh_token` securely.
3. Update `src/app/api/calendar/sync/route.ts` to use `googleapis` and push/update events matching `status = 'approved'`.
