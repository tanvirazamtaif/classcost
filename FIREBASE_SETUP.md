# Firebase Setup (Apple + Phone Sign-In)

ClassCost uses Firebase Authentication for **Apple Sign-In** and **Phone OTP**.
Google Sign-In and Email OTP continue to use the existing backend (no Firebase
involvement).

If `VITE_FIREBASE_*` env vars are missing, the Apple and Phone buttons stay
hidden — the rest of the app works fine without Firebase.

---

## 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com/).
2. Click **Add project** → give it a name (e.g. `classcost-prod`).
3. Disable Google Analytics for now (you can enable it later).
4. Once created, click the **Web** icon (`</>`) on the project home page to
   register a web app. Give it a nickname (e.g. `classcost-web`). Skip Firebase
   Hosting.
5. Copy the `firebaseConfig` object that appears — you need those values.

## 2. Add env vars

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Fill in the Firebase values:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=classcost-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=classcost-prod
VITE_FIREBASE_STORAGE_BUCKET=classcost-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

Restart `npm run dev` after editing `.env`.

## 3. Authorize your dev domain

Firebase only accepts auth requests from domains you explicitly allow.

In Firebase Console → **Authentication** → **Settings** → **Authorized domains**:
- `localhost` is added by default.
- Add your production domain (e.g. `classcost.app`) when you deploy.

## 4. Enable Phone sign-in

1. Firebase Console → **Authentication** → **Sign-in method**.
2. Click **Phone** → **Enable** → Save.
3. (Optional but recommended) Under **Phone numbers for testing**, add a fake
   number + code (e.g. `+8801712345678` / `123456`). Lets you test without
   spending SMS quota.

Phone auth uses **invisible reCAPTCHA** automatically. You don't need to do
anything extra; the page already includes the required `<div>`.

### Phone SMS costs

The free Spark plan allows ~10 SMS/day for the first project. Beyond that you
need the Blaze (pay-as-you-go) plan — Firebase charges ~$0.01–$0.06 per SMS
depending on country.

## 5. Enable Apple sign-in

**This step requires a paid Apple Developer account ($99/year).** Without it,
the Apple button will show but clicking it will fail with an "operation not
allowed" error.

### A. Apple Developer side

1. Sign in at [developer.apple.com](https://developer.apple.com/account).
2. **Identifiers** → **+** → **App IDs** → **App** → continue.
   - Bundle ID: `com.classcost.web` (or your domain in reverse)
   - Capabilities: enable **Sign in with Apple**.
3. **Identifiers** → **+** → **Services IDs** → continue.
   - Description: `ClassCost Web Sign-In`
   - Identifier: `com.classcost.web.signin`
   - Enable **Sign in with Apple** → Configure:
     - Primary App ID: pick the App ID from step 2
     - Domains: `<your-firebase-project>.firebaseapp.com`
     - Return URLs: `https://<your-firebase-project>.firebaseapp.com/__/auth/handler`
4. **Keys** → **+** → name it `ClassCost Sign in with Apple` → enable
   **Sign in with Apple** → Configure (pick your App ID) → Save.
   Download the `.p8` file — **you can only download it once**.
   Note the **Key ID** shown.
5. Find your **Team ID** at the top-right of the Apple Developer site.

### B. Firebase side

1. Firebase Console → **Authentication** → **Sign-in method** → **Apple** → Enable.
2. Fill in:
   - **Services ID**: `com.classcost.web.signin` (from A.3)
   - **OAuth code flow configuration**:
     - **Apple team ID**: from A.5
     - **Key ID**: from A.4
     - **Private key**: paste contents of the `.p8` file from A.4
3. Save.

## 6. Test it

```powershell
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You should see:

- **Continue with Apple** button (black)
- **Continue with Phone** button (outline)

below the existing Google button (if Google is configured) and above the email
input.

### Smoke tests

1. **Phone**: click → enter test phone (e.g. `+8801712345678`) → enter test code
   (e.g. `123456`) → should land on the role-selection screen.
2. **Apple**: click → Apple popup opens → sign in → should land on
   role-selection. If you don't have Apple Developer setup, you'll see an
   "operation not allowed" error — that's expected.
3. **Sign out**: from the dashboard header, click your avatar → Sign out. This
   now also signs out of Firebase.

## 7. Production checklist

Before going live:

- [ ] Add your production domain to Firebase **Authorized domains**.
- [ ] Move off the Spark plan if you expect > 10 SMS/day.
- [ ] Set up **App Check** to prevent abuse of the Phone auth endpoint.
- [ ] Server-side: add a backend endpoint that verifies Firebase ID tokens
      using the Firebase Admin SDK and syncs the user into your Postgres `User`
      table. Currently Phone/Apple users live only in localStorage — no server
      sync. (Out of scope for this initial integration.)
- [ ] Decide UX for users who sign in with Apple then later with phone using
      the same email — Firebase considers them separate accounts by default.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Apple/Phone buttons don't show | `VITE_FIREBASE_*` env vars missing — restart dev server after editing `.env` |
| `auth/unauthorized-domain` | Add the domain in Firebase Console → Authentication → Settings → Authorized domains |
| `auth/operation-not-allowed` | The provider isn't enabled in Firebase Console → Sign-in method |
| `auth/invalid-app-credential` (phone) | reCAPTCHA didn't load — usually a CSP or ad-blocker issue |
| `auth/invalid-verification-code` | Wrong OTP, or test number isn't whitelisted |
| `auth/popup-closed-by-user` | User cancelled — handled silently, no toast shown |
| `auth/web-storage-unsupported` | Browser blocks localStorage (private mode, strict cookies) |
