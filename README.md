# TOMZ OS

A personal, browser-based "operating system" for phones, tablets and computers: dashboard, app launcher, task manager, 15 tools, 8 games and settings. Built with plain HTML, CSS and JavaScript. No framework, no build step, no server code.

Everything you create (tasks, notes, habits, scores, settings) is stored in your own browser's localStorage. Nothing is sent to a server.

## Features
- **Dashboard:** live clock, greeting, app launcher (12 services), favorites, recently opened apps, task progress, shortcuts, notifications panel, customizable widgets.
- **Tasks:** add, edit, delete, complete; priority, due date and time, category, tags; search, filters (All, Today, Upcoming, Completed, Overdue), sorting, progress and daily summary.
- **Tools:** calculator, password generator, stopwatch, countdown, Pomodoro, notes, word counter, QR code, unit converter, random number, coin flip, dice, color picker, text case converter, habit tracker.
- **Games:** Tic-Tac-Toe (two players or vs computer), Rock Paper Scissors, Number Guessing, Memory Match, Snake, Reaction test, Whack-a-mole, Math sprint.
- **Search:** `Ctrl/Cmd + K` searches sections, apps, tools, games, tasks and notes.
- **Settings:** accent color, glow intensity, compact layout, animations, clock format, sound, widget order, JSON export/import, clear data.
- **Login:** Guest Mode (no setup) or Google sign-in (optional, needs your own Client ID).

## Folder structure
```
tomz-os/
├── index.html
├── README.md
├── assets/logo.svg
├── css/        styles.css · animations.css · responsive.css
├── js/
│   ├── storage.js             localStorage helper
│   ├── auth.js                Guest + Google Identity Services
│   ├── navigation.js          hash router, sidebar and bottom nav
│   ├── app.js                 dashboard, app launcher, widgets, notifications
│   ├── tasks.js               task manager
│   ├── tools.js               tools hub and 13 tools
│   ├── calculator.js          safe expression parser (no eval)
│   ├── password-generator.js  Web Crypto passwords
│   ├── games.js               8 games
│   ├── search.js              global search (Ctrl/Cmd + K)
│   └── settings.js            settings, import/export
└── docs/SETUP.md
```
Script load order matters (see the bottom of `index.html`).

## Run locally
Browsers restrict some features on `file://` pages, so use a small local server:
```
cd tomz-os
python3 -m http.server 8000
```
Open http://localhost:8000. (Or `npx serve`, or the VS Code "Live Server" extension.)

## Open it on an Android phone
1. Put the phone and computer on the same Wi-Fi.
2. Start the server as above, find the computer's local IP (for example 192.168.1.20).
3. In the phone's browser open `http://192.168.1.20:8000`.
Google sign-in will not work on that address (Google only allows `localhost` or HTTPS origins), but Guest Mode works. For the full experience, deploy it (below) and open the HTTPS address.

## Deploy
**GitHub Pages:** push the folder to a repository, then Settings → Pages → deploy from the main branch, root folder. Your site will be at `https://USERNAME.github.io/REPO/`. Netlify, Cloudflare Pages and Vercel also work: upload the folder as a static site.

## Google login
See `docs/SETUP.md`. In short: create an OAuth Web Client in Google Cloud, add your site as an Authorized JavaScript origin, and paste the **Client ID** (never the secret) into `CLIENT_ID` in `js/auth.js`. Without it, the Google button explains that setup is missing and Guest Mode still works.
This is a front-end-only app: the Google profile is read in the browser and is not verified by a server. It personalizes the display; it does not protect or sync your data. Cross-device sync would need a backend that verifies Google ID tokens.

## What needs internet
- **Needs internet:** loading the Google sign-in library, opening the 12 external services, and the QR code tool (it loads the `qrcode-generator` 1.4.4 library from cdnjs the first time you use it).
- **No internet needed once the page is open:** tasks, notes, calculator, password generator, timers, games, settings, search, import/export.
- This is not an installable offline app (no service worker yet). Reloading the page offline only works if your browser has it cached.

## Embedded apps and iframe limits
Tomz OS tries to show an app inside its own window only where that is technically possible. Most major services (Google, YouTube, ChatGPT, Claude, GitHub, Gmail, Spotify and others) tell browsers not to display them inside other sites, and a page cannot detect that reliably. So only Wikipedia is attempted in an embedded frame (with a note to use "Open in New Tab" if it stays blank). The rest show a clear fallback panel with Open in New Tab and Return to Tomz OS. No proxy or workaround is used.
External links open with `noopener,noreferrer`.

## Browser support and permissions
Current Chrome, Edge, Firefox and Safari (desktop and mobile). Needs localStorage, the Web Crypto API (password generator and random numbers) and, for sound, the Web Audio API. Clipboard buttons use the Clipboard API and show a message where it is blocked (some browsers require HTTPS). No camera, microphone or location permissions are used.

## Backup and privacy
Settings → Export data saves a JSON backup (your Google login is not included). Import validates the file and asks before replacing anything. Clearing browser data or using private browsing erases your tasks, so export regularly.

## Troubleshooting
- **Google button says "not configured":** add a Client ID in `js/auth.js` and the exact site address as an Authorized JavaScript origin.
- **Google sign-in fails with "origin_mismatch":** the address in the browser does not exactly match an authorized origin (including http/https and port).
- **Data disappeared:** the browser cleared site data, or you used private mode or a different address (localhost and a LAN IP have separate storage).
- **QR code says it needs internet:** the library could not load; check your connection or any ad/script blocker.
- **Copy buttons say "Copy blocked":** open the site over HTTPS or localhost.
- **Page looks unstyled:** open it through a server (not by double-clicking from a zip preview) and check the `css/` folder came with it.
- **No sound:** check Settings → Sound effects and your device volume.

## Known limitations
- Task calendar/agenda view is not included; sorting by due date covers the same ground.
- A few glow shadows keep a fixed blue tint when you change the accent color.
- The Google profile is unverified client-side data (see above).
