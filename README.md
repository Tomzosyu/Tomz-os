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
- **Guest accounts:** create a guest account with your own username and password. You are asked to sign in every time you open the site. Accounts and an activity log are saved in this browser.
- **Open apps your way:** tap YouTube (or any of the 12 apps) and choose **Open in browser** (official desktop website, new tab) or **Open in your device** (the installed app, with the website as fallback). Every open is saved in the activity log.

## Folder structure
```
tomz-os/
├── index.html
├── README.md
├── assets/logo.svg
├── css/        styles.css · animations.css · responsive.css
├── js/
│   ├── storage.js             localStorage helper
│   ├── log.js                 activity log saved in the browser
│   ├── auth.js                guest accounts (username + password, asked on every open)
│   ├── navigation.js          hash router, sidebar and bottom nav
│   ├── app.js                 dashboard, app launcher, widgets, notifications
│   ├── tasks.js               task manager
│   ├── tools.js               tools hub and 13 tools (calculator and password generator are separate files)
│   ├── calculator.js          safe expression parser (no eval)
│   ├── password-generator.js  Web Crypto passwords
│   ├── games.js               5 games
│   ├── minigames.js           3 more games (reaction, whack-a-mole, math sprint)
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
Guest accounts work on that address too (on plain `http://` the password is hashed with a built-in fallback instead of Web Crypto). Over HTTPS the stronger PBKDF2 hash is used.

## Deploy
**GitHub Pages:** push the folder to a repository, then Settings → Pages → deploy from the main branch, root folder. Your site will be at `https://USERNAME.github.io/REPO/`. Netlify, Cloudflare Pages and Vercel also work: upload the folder as a static site.

## Guest accounts and the activity log
- **Create a guest account** on the welcome screen with a username (3–24 characters) and a password (4 or more). Next time, use **Sign in**.
- **You are asked every time the site is opened.** The signed-in state is kept only in memory, so a reload or a new visit shows the sign-in screen again.
- **What is saved in the browser:** the username and a salted hash of the password (PBKDF2 over HTTPS/localhost, a built-in SHA-256 fallback on plain http). The plain password is never stored and never written to the log. After 5 wrong tries sign-in pauses for 30 seconds.
- **Activity log:** sign-ups, sign-ins, failed sign-ins, log-outs, account deletions and every app opened (in the browser or on the device) are saved. See and download it in Settings → Activity log (`tomz-os-log-DATE.txt`). It is not included in the JSON backup.
- **Forgot your password?** The sign-in screen has a button that removes all accounts from this device so you can create a new one. Tasks, notes and settings are not deleted. Because everything is stored locally, this is a convenience gate, not server-grade security: someone with access to the browser's developer tools can bypass it.
- Tasks, notes and settings are shared by all accounts on the same browser.

## Opening apps: browser or device
Tapping an app (YouTube, Google, ChatGPT, Claude, Gemini, Grok, Drive, Gmail, GitHub, Spotify, Wikipedia, Calendar), a favorite, a recent app, a shortcut or a search result shows two choices:
- **Open in browser:** opens the official website in a new tab. YouTube and Wikipedia are opened with their "desktop version" address option; other sites use their normal official address, and on a phone you can switch the browser to "Desktop site" if a site still shows its mobile page (a web page cannot force that setting).
- **Open in your device:** Android uses an app link with the website as automatic fallback; iPhone/iPad and computers use the app's URL scheme where one is known (for example `youtube://`, `spotify:`). A web page cannot tell whether an app is installed, so if nothing opens within about 2 seconds Tomz OS says so and offers **Open in browser instead**. Apps without a known link (for example Grok) offer the website.
The app link table is the `APPS` list at the top of `js/app.js` (`android` package name, `ios` scheme, `pc` desktop scheme). Edit it if a link does not work on your device.

## What needs internet
- **Needs internet:** opening the 12 external services and the QR code tool (it loads the `qrcode-generator` 1.4.4 library from cdnjs the first time you use it).
- **No internet needed once the page is open:** tasks, notes, calculator, password generator, timers, games, settings, search, import/export.
- This is not an installable offline app (no service worker yet). Reloading the page offline only works if your browser has it cached.

## External links
Tomz OS no longer tries to show other sites inside itself (most refuse to be framed). External links open with `noopener,noreferrer`.

## Browser support and permissions
Current Chrome, Edge, Firefox and Safari (desktop and mobile). Needs localStorage, the Web Crypto API (password generator and random numbers) and, for sound, the Web Audio API. Clipboard buttons use the Clipboard API and show a message where it is blocked (some browsers require HTTPS). No camera, microphone or location permissions are used.

## Backup and privacy
Settings → Export data saves a JSON backup (accounts and the activity log are not included; download the log separately). Import validates the file and asks before replacing anything. Clearing browser data or using private browsing erases your tasks, so export regularly.

## Troubleshooting
- **"Open in your device" does nothing:** the app may not be installed, or the link for it is not in the `APPS` list. Use "Open in browser instead".
- **Cannot sign in on a different address:** localhost, a LAN IP and your deployed site each have their own saved accounts.
- **Data disappeared:** the browser cleared site data, or you used private mode or a different address (localhost and a LAN IP have separate storage).
- **QR code says it needs internet:** the library could not load; check your connection or any ad/script blocker.
- **Copy buttons say "Copy blocked":** open the site over HTTPS or localhost.
- **Page looks unstyled:** open it through a server (not by double-clicking from a zip preview) and check the `css/` folder came with it.
- **No sound:** check Settings → Sound effects and your device volume.

## Known limitations
- Task calendar/agenda view is not included; sorting by due date covers the same ground.
- A few glow shadows keep a fixed blue tint when you change the accent color.
- Accounts are stored in the browser only (no server), so they do not sync between devices.
- Whether an app is installed cannot be detected by a web page, so the device option relies on a timed fallback.
