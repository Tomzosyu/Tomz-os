# Tomz OS setup guide

## 1. Run it
```
cd tomz-os
python3 -m http.server 8000
```
Open http://localhost:8000, choose **Create guest account**, pick a username and password, and you are in. Next time use **Sign in**; you are asked every time the site is opened. Nothing else is required.

## 2. Deploy (GitHub Pages)
1. Create a repository and upload the contents of `tomz-os/` (so `index.html` is at the top level).
2. Settings → Pages → Source: *Deploy from a branch* → `main` / root.
3. Open `https://USERNAME.github.io/REPO/` once it is published.

## 3. Accounts and the activity log
Guest accounts and the activity log live in your browser's localStorage (`tomz.accounts`, `tomz.log`). Passwords are saved only as a salted hash. Open Settings → Activity log to read or download the log. There is no server and no Google setup.

## 3b. App links
Edit the `APPS` list at the top of `js/app.js` to change a website address or the Android package / iOS scheme used by "Open in your device".

## 4. Dependencies
- qrcode-generator 1.4.4: `https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js` (loaded only when you open the QR tool).
No other libraries, fonts or network requests.

## 5. Back up and restore
Settings → Export data downloads a JSON file. Settings → Import a backup validates it and asks before replacing matching data.
