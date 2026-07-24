# Upcoming Migration: Supabase Realtime Signaling

We have decided to migrate away from `ntfy.sh` (due to aggressive rate limits and connection instability) and implement **Supabase Realtime** for cloud signaling and state relay. This will be built as a true WebSocket connection to ensure robust, instant offline synchronization.

## Why Supabase?
- Generous free tier (2,000,000 messages/month, 200 concurrent connections).
- Zero backend code required (we use the `@supabase/supabase-js` client).
- "Broadcast" channels allow ephemeral WebSocket message passing without saving to a database.
- Completely eliminates HTTP polling loops and `429 Too Many Requests` bans.

## TODO Steps (For Tomorrow)

### 1. Account & Project Setup (User Action)
- [ ] Create a free account at [supabase.com](https://supabase.com/).
- [ ] Create a new Project.
- [ ] Obtain the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the project settings.

### 2. Dependency Installation
- [ ] Run `npm install @supabase/supabase-js` in the project root.

### 3. Client Initialization
- [ ] Create `src/utils/supabaseClient.js`.
- [ ] Initialize the Supabase client using the provided URL and Anon Key.
- [ ] Add a UI element (e.g., in a hidden settings menu) to securely input and store these API keys in `localStorage` so they don't have to be hardcoded in the public repository.

### 4. Refactoring `App.jsx`
- [ ] Remove all `ntfy.sh`, `ntfy.net`, and `corsproxy.io` fetch polling logic.
- [ ] Replace `pushToHttpsCloud` with `channel.send({ type: 'broadcast', event: 'SYNC_STATE', payload: encryptedData })`.
- [ ] Replace `startHttpsCloudListening` with `channel.on('broadcast', { event: 'SYNC_STATE' }, callback).subscribe()`.
- [ ] Ensure AES-256 E2EE encryption remains intact *before* the payload is sent through Supabase.

### 5. Testing & Deployment
- [ ] Verify that Guest and Host can connect via WebRTC seamlessly.
- [ ] Verify that if WebRTC fails, the Supabase WebSocket fallback correctly syncs state instantly.
- [ ] Rebuild and deploy to GitHub Pages (`npm run deploy`).
