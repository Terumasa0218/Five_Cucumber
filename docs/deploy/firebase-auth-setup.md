# Firebase Authentication Setup

The current MVP does not use an email-link login page. Browser clients use Firebase client configuration for anonymous authentication, and friend-room API routes verify Firebase ID tokens on the server when server synchronization is enabled.

## Firebase Console

1. Open Firebase Console.
2. Select the project used by the deployed app.
3. Open Authentication > Sign-in method.
4. Enable Anonymous sign-in.
5. Add these authorized domains under Authentication > Settings:
   - `localhost`
   - the production Vercel domain
   - any preview or custom domains used for testing

## Client Environment Variables

Set these for local and deployed environments:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Server Environment Variables

Friend-room server sync requires Firebase Admin credentials so API routes can verify client tokens:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

The runtime also accepts these aliases for compatibility with older deployments:

```env
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_SDK_JSON={"project_id":"...","client_email":"...","private_key":"..."}
```

## Smoke Check

1. Open `/home`.
2. Set a nickname through `/setup` if needed.
3. Open `/friend/create`.
4. Create a room.
5. Confirm the server-backed flow succeeds when shared-store variables are present.

If Firebase Admin credentials or shared-store variables are missing, the UI should show a backend requirement message instead of starting a broken multi-device match.
