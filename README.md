# Day Counter

Track how many days you spend in each country per year. Useful for tax residency, visa limits, or just curiosity.

All data is stored locally in your browser: no account, no server, no tracking.

## Features

- **Calendar view**: click or drag to select date ranges, assign them to a country
- **Color-coded days**: each country gets a custom color shown on the calendar
- **Where I am now**: set your current country once; days auto-fill from that point until you change it. No daily check-in needed
- **Min/goal/max rules**: per country per year. A required minimum (e.g. 60 days for tax residency), a goal you want to reach (e.g. 184 for extra safety), and a hard max you must not exceed (e.g. 183 days)
- **Budget sidebar**: days to goal, days left to limit, the date a limit will be hit, and warnings when plans push you over
- **Planning hints**: the day editor shows the projected impact of a range (before → after, over-limit warnings, overwrites) before you apply it
- **Travel record**: trips are derived automatically from contiguous stays. Expand any country to see when you were there and for how long
- **Simulated projections**: stats include upcoming (future) entries so you can plan ahead
- **Import / Export**: copy an encoded string or download a JSON file to back up or transfer your data
- **Device sync**: sync data between devices via QR code with end-to-end encrypted transport (relay stores nothing)
- **Dark mode**: toggle between light and dark themes
- **Configurable week start**: Monday or Sunday
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

### Build for production

```bash
npm run build
```

Output goes to `build/`. It's a fully static site: deploy anywhere that serves static files: Cloudflare Pages, Netlify, GitHub Pages, nginx, etc.

---

## Usage

### Countries

Add countries in the left sidebar. Each country gets:
- A short code (2–4 characters, e.g. `US`, `DE`, `SGP`)
- A display name
- A color for the calendar

You can set **min/goal/max day rules** per country per year:
- **Min**: days you must spend there (e.g. 60 for tax residency)
- **Goal**: days you want to reach (e.g. 184 for extra safety)
- **Max**: days you must not exceed (e.g. 183 before becoming tax resident)

Each appears as a marker on the progress bar in the budget panel, with live "days to go / days left" lines that account for planned future days.

### Where I am now

Set your current country in the header (the flag chip). The app fills every day from that point to today with that country automatically. You only open the app when something changes. Recorded trips and plans always take precedence over the auto-fill.
### Calendar

Click a day to start a selection, then click another day to select a range. A modal appears to assign the range to a country (or clear it).

### Budget

The right sidebar shows, for each country:
- **Total days**: past + planned, with the split shown below
- **Max**: days to the limit, plus the date you'll hit it at the current plan; red when over
- **Goal**: days to goal, or "Goal reached. Free to roam." (only actual past days count; plans show as "covered by plans")
- **Min**: days still required
- **Trips**: expandable travel record with every contiguous stay, its dates and duration

The bottom of the panel shows total tracked days out of 365/366, plus how many past days are still unaccounted for.

### Import / Export

Use **Share / Import** (the share icon in the header) to:
- Copy an encoded string to transfer data manually
- Download a JSON backup
- Import from a string or JSON file
- Choose **Replace all** (overwrites your data) or **Merge** (combines both, your entries win on conflicts)

---

## Device Sync

Sync lets two devices exchange and merge their data without accounts or a database.

**How it works:**

1. Device A opens **Sync** (the devices icon in the header) → **Show QR**: a QR code and room code appear
2. Device B opens **Sync** → **Scan QR**: scan the code with the camera, or paste the sync data manually
3. Both devices connect to a relay, exchange encrypted state, and merge: done in seconds

Data is encrypted with **AES-GCM** using a random key embedded in the QR code. The relay only forwards ciphertext and stores nothing.

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

Users can also override this at runtime in **Settings → Sync relay URL**. The runtime value takes precedence.

---

## Data

Data is stored in `localStorage` under the key `daytracker_data`.

The export string is a base64-encoded compact JSON object (version 2 format, with date ranges instead of individual day entries). The JSON backup uses the internal format (version 1).

**Schema overview:**

```
countries: { [code]: { name, color } }
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
- [html5-qrcode](https://github.com/mebjas/html5-qrcode): QR scanning via camera
- Cloudflare Workers + Durable Objects (relay, optional)