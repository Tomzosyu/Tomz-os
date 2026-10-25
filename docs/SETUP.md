# Tomz OS setup guide

## 1. Run it
```
cd tomz-os
python3 -m http.server 8000
```
Open http://localhost:8000 and choose **Guest Mode**. Nothing else is required.

## 2. Deploy (GitHub Pages)
1. Create a repository and upload the contents of `tomz-os/` (so `index.html` is at the top level).
2. Settings → Pages → Source: *Deploy from a branch* → `main` / root.
3. Open `https://USERNAME.github.io/REPO/` once it is published.

## 3. Optional: Google sign-in
1. Go to https://console.cloud.google.com and create or select a project.
2. APIs & Services → OAuth consent screen: choose *External*, fill in the app name and your email, add yourself as a test user while in testing.
3. APIs & Services → Credentials → Create credentials → **OAuth client ID** → *Web application*.
4. Under **Authorized JavaScript origins** add every address you will use, exactly as shown in the browser, for example:
   - `http://localhost:8000`
   - `https://USERNAME.github.io`
   (Origins have no path or trailing slash. No redirect URI is needed for this button.)
5. Copy the **Client ID** (it ends in `.apps.googleusercontent.com`). Do **not** use or share the client secret; this app never needs it.
6. Open `js/auth.js` and set `var CLIENT_ID = 'YOUR_ID.apps.googleusercontent.com';`
7. Reload, click **Continue with Google**, and sign in on Google's own window. Tomz OS never sees your password.

### What Google login does here
It shows your Google name and photo in the sidebar. It is front-end only: the sign-in response is read in the browser and is not verified by a server, so treat it as personalization, not security. Your data stays in this browser's localStorage whether you sign in or not.

### If you want real account sync later
Add a small backend that receives the Google ID token, verifies it with Google's public keys, and stores each user's data. The client secret (if you ever use one) belongs only on that server.

## 4. Dependencies
- Google Identity Services: `https://accounts.google.com/gsi/client` (loaded only when you press the Google button).
- qrcode-generator 1.4.4: `https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js` (loaded only when you open the QR tool).
No other libraries, fonts or network requests.

## 5. Back up and restore
Settings → Export data downloads a JSON file. Settings → Import a backup validates it and asks before replacing matching data.
