# StatusRPG

Track your real-life buffs and debuffs. Share your status with your guild.

## Quick start

### 1. Set up Supabase (5 minutes)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New project" — give it a name like `statusrpg`
3. Once created, go to **SQL Editor** → **New query**
4. Paste the entire contents of `supabase-schema.sql` and click **Run**
5. Go to **Settings** → **API** and copy:
   - **Project URL**
   - **anon / public** key

### 2. Configure the app

```bash
cp .env.example .env.local
```

Open `.env.local` and paste your Supabase values:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
```

### 3. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

On mobile: your phone must be on the same WiFi as your computer. 
Run `npm run dev -- --host` and visit the IP address shown in the terminal.

## Build for production

```bash
npm run build
```

Deploy the `dist` folder to [Vercel](https://vercel.com) — just drag and drop, or connect your GitHub repo.

## What's built so far

- ✅ Magic link authentication (no password)
- ✅ Status screen with stat bars (Energy, Focus, Mood, Charisma, Strength, Recovery)
- ✅ Active buffs and debuffs with timers
- ✅ Log event screen with 12 event types
- ✅ Full buff/debuff engine with carry-over to next day
- ✅ Timeline of logged events
- ✅ Profile with username
- 🔜 Guild system with real-time feed and chat
- 🔜 Shareable status cards
- 🔜 Push notifications
- 🔜 Insights and weekly stats
