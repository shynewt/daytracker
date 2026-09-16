# Day Counter

Count how many days you spend in each country, per year.

Made for digital nomads and anyone whose tax residency depends on day counts. Maybe you live abroad and need 60 days at home to keep your residency. Maybe you visit another country often and must stay under 183 days to avoid becoming tax resident there. Maybe you just want to respect a visa limit, or you're curious where your year actually went.

It's also a planning tool. You can mark future trips on the calendar and see what they do to your counts before you book anything.

## Privacy

Everything is stored in your browser's localStorage. No account, no server, no analytics, no tracking. If you sync between devices, the data is encrypted on your device and the relay only forwards ciphertext. If you never sync, nothing ever leaves your browser.

## How it works

You paint days on a calendar, one color per country. The app does the counting.

You don't need to log every day by hand. Set "where I am now" once in the header, and the app fills every day from that point until you change it. You only open the app when you travel or when you want to plan.

Per country and per year you can set three rules:

- **Min**: days you must spend there (60 days for tax residency, for example)
- **Goal**: days you want to reach (184 for extra safety margin)
- **Max**: days you must not exceed (183 before becoming tax resident)

The budget panel then tells you the one thing that matters per country: days left to the limit, days to your goal, or that you're free to roam. It counts your planned future days too, and warns you when a plan would push you over a limit.

## Features

- **Calendar**: click two days to select a range, assign it to a country. Three views: grid, compact, rows
- **Where I am now**: set your current country once; days auto-fill until you change it. Trips and plans you recorded by hand always win over the auto-fill
- **Min/goal/max rules** per country per year, shown as markers on a progress bar scaled to your budget
- **Budget panel**: days to goal, days to the limit, the date you'll hit the limit at your current plan, and the date you're free to roam once your plans cover the goal
- **Planning hints**: the day editor shows what a range would do (before and after, over-limit warnings, which days it overwrites) before you apply it
- **Travel record**: trips are derived automatically from contiguous stays. Expand a country to see when you were there and for how long
- **Custom countries**: territories not in the ISO list (Northern Cyprus and friends) with your own emoji and color
- **Import / Export**: encoded string or JSON file, replace or merge
- **Device sync**: QR code, end-to-end encrypted, relay stores nothing
- **Dark mode**, configurable week start (Monday or Sunday)

## Getting Started

### Requirements

- Node.js 18+
- npm

### Run locally

```bash
git clone https://github.com/shynewt/daytracker
cd daytracker
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Deploy

The app builds as a Cloudflare Worker that serves static assets:

```bash
npm run deploy    # npm run build + wrangler deploy
```

If you prefer a plain static host (Netlify, GitHub Pages, nginx), swap `@sveltejs/adapter-cloudflare` for `@sveltejs/adapter-static` in `svelte.config.js` and serve the `build/` folder. There is no backend either way.

---

## Usage

### Countries

Add countries in the left sidebar. Search the ISO list, or type any name to create a custom one with your own emoji. Each country gets a short code, a name, and a color for the calendar. You can edit all three later, and override the flag emoji on ISO countries too.

Rules are edited under each country: Min, Goal, Max. Leave a field empty to unset it.

### Where I am now

Set your current country in the header (the flag chip). The app fills every day from that point to today with that country. When you move, change it and the filling continues from the new country. Trips you recorded by hand are never overwritten by the auto-fill.

### Calendar

Click a day to start a selection, click another day to finish the range. A modal lets you assign the range to a country or clear it, and shows the impact before you apply.

### Budget

The right panel shows one card per country:

- Total days, split into past and planned
- A progress bar scaled to the relevant budget (only if the country has rules)
- A status line: days to the limit, days to goal, or "Goal reached. Free to roam."
- Trips: the travel record for that country

Only actual past days count toward reaching a goal or minimum. Planned days show as "covered by plans", with the date you'll get there if the plan holds.

The bottom of the panel shows tracked days out of 365/366, plus how many past days are still unaccounted for.

### Import / Export

Use **Share / Import** (the share icon in the header) to:

- Copy an encoded string to move data manually
- Download a JSON backup
- Import from a string or JSON file
- Choose **Replace all** (overwrites your data) or **Merge** (combines both, your entries win on conflicts)

---

## Device Sync

Sync lets two devices exchange and merge their data without accounts or a database.

**How it works:**

1. Device A opens **Sync** (the devices icon in the header) → **Show QR**: a QR code and room code appear
2. Device B opens **Sync** → **Scan QR**: scan the code with the camera, or paste the sync data manually
3. Both devices connect to a relay, exchange encrypted state, and merge. Done in seconds

Data is encrypted with **AES-GCM** using a random key that only exists in the QR code. The relay forwards ciphertext and stores nothing.

### Deploying the relay

The relay lives in the `relay/` folder. Two options:

#### Option A: Cloudflare Workers (recommended)

Free plan is supported.

```bash
cd relay
npm install
npx wrangler deploy
```

You'll get a URL like `wss://day-counter-relay.<your-subdomain>.workers.dev`.

Set it as the default (see [Configuration](#configuration)) or paste it in **Settings → Sync relay URL**.

#### Option B: Self-hosted Node.js (no Cloudflare)

Install the `ws` package:

```bash
npm install ws
```

Create `relay-node.mjs`:

```js
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8787;
const rooms = new Map(); // roomId -> Set<WebSocket>

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws, req) => {
  const match = new URL(req.url, 'http://localhost').pathname.match(/^\/room\/([a-zA-Z0-9]+)$/);
  if (!match) { ws.close(); return; }

  const roomId = match[1];
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  const room = rooms.get(roomId);
  room.add(ws);

  ws.on('message', (data) => {
    for (const peer of room) {
      if (peer !== ws && peer.readyState === 1) peer.send(data);
    }
  });

  ws.on('close', () => {
    room.delete(ws);
    if (room.size === 0) rooms.delete(roomId);
    for (const peer of room) {
      if (peer.readyState === 1) peer.send(JSON.stringify({ type: 'peer-disconnected' }));
    }
  });
});

console.log(`Relay running on ws://localhost:${PORT}`);
```

Run it:

```bash
node relay-node.mjs
```

For production, run it behind a reverse proxy with TLS so you get a `wss://` URL.

**Example nginx config:**

```nginx
server {
    listen 443 ssl;
    server_name relay.example.com;

    ssl_certificate     /etc/letsencrypt/live/relay.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/relay.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## Configuration

### Relay URL

Set the default relay URL at build time:

```bash
# .env or .env.local
VITE_RELAY_URL=wss://relay.example.com
```

You can also override it at runtime in **Settings → Sync relay URL**. The runtime value takes precedence.

---

## Data

Data is stored in `localStorage` under the key `daytracker_data`.

The export string is a base64-encoded UTF-8 JSON object (version 2 format, with date ranges instead of individual day entries). The JSON backup uses the internal format (version 1).

**Schema overview:**

```
countries: { [code]: { name, color, emoji? } }
rules:     { [year]: { [code]: { min, target?, max } } }  // 0/366 = unset
entries:   { [YYYY-MM-DD]: { country: code } }
presence:  { country: code, since: YYYY-MM-DD } | null   // "where I am now"
settings:  { weekStartsMonday: boolean }
```

---

## Tech stack

- [SvelteKit](https://kit.svelte.dev) + [Svelte 5](https://svelte.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [@tabler/icons-svelte](https://tabler.io/icons)
- [qrcode](https://github.com/soldair/node-qrcode): QR generation
- [qr-scanner](https://github.com/nimiq/qr-scanner): QR scanning via camera
- Cloudflare Workers + Durable Objects (relay, optional)
