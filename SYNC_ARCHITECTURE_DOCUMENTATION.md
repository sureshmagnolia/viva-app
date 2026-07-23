# Project Viva Marks Consolidator - Dual-Engine Sync Architecture

## Overview
This application implements a hybrid real-time synchronization engine designed to connect multiple devices (Examiner 1, Examiner 2, Host, Guests) across any network topology (Local LAN, Hotspots, CGNAT Mobile 4G/5G, Firewalled Campus/Corporate WiFi).

---

## Architecture Components

### 1. WebRTC P2P DataChannel (Primary Engine)
- **Library**: `PeerJS` v1.5+
- **ICE Servers**:
  - Google Public STUN (`stun:stun.l.google.com:19302`)
  - Metered OpenRelay TURN over Port 443 (`turn:openrelay.metered.ca:443`)
- **Latency**: ~5ms to 50ms (Direct peer-to-peer data channel).
- **Fallback Trigger**: If ICE candidate discovery times out or fails (due to strict NAT/CGNAT/Router firewalls), the system automatically activates the HTTPS Cloud Relay Engine.

### 2. Zero-Preflight HTTPS Multi-Cloud Relay (Secondary/Fallback Engine)
- **Endpoints**:
  - `https://ntfy.sh/viva_room_{ROOM_CODE}` (Raw text endpoint, 0ms non-blocking polling)
  - `https://keyvalue.immanuel.co/api/KeyVal/...` (URL-encoded REST key-value store)
- **Large Payload Offloading**:
  - IIS & HTTP URLs cap query strings at ~4,000 characters.
  - If the base64-encoded state payload exceeds 1,000 characters (large student rosters), the state is automatically offloaded to unlimited pastebins (`pastes.dev` or `bytebin.lucko.me`), and only a tiny pointer key (e.g. `pastes_xyz123`) is transmitted via the cloud relays.
- **Zero CORS Preflights**: All cloud requests are executed without custom headers (`application/json`) to ensure simple HTTP requests that bypass CORS OPTIONS preflight checks across all desktop and mobile browsers.
- **Polling Loop**: Non-blocking `setInterval` at 1.5s interval with instant `0ms` execution on initialization.

### 3. Smart Cache-Busting & Version Locking
- **Build Version Header**: Displays `APP_VERSION` prominently in the navigation bar.
- **Force Update Mechanism**: The `⚡ Force Load Latest Version` button unregisters active ServiceWorkers and appends `?v={TIMESTAMP}` query parameters to defeat aggressive mobile browser caching (Safari/Chrome).

---

## State Synchronization Flow
1. **Host Action**: Click "Create Sync Room". Room code generated (e.g., `KQSATR`). Peer ID registered as `viva-KQSATR`. Host pushes initial state to Cloud Relay.
2. **Guest Action**: Enter code `KQSATR`. Guest initializes PeerJS connection to `viva-KQSATR` and simultaneously activates the Cloud Relay listener (`startHttpsCloudListening`).
3. **Data Packet Schema**:
   ```json
   {
     "type": "GLOBAL_SYNC_STATE",
     "projectDetails": { "centre": "", "date": "", "courseCode": "" },
     "projectStudents": [...],
     "compDetails": { "centre": "", "date": "", "courseCode": "" },
     "compStudents": [...],
     "timestamp": 1721726000000
   }
   ```
4. **Echo / Loop Prevention**: Both Host and Guest maintain `lastHttpsTsRef` and `lastPasteKeyRef`. State updates with timestamp `<= lastHttpsTsRef` are silently ignored to prevent feedback loops.

---

## Commit History & Revisions
- `v1.7.0`: Introduced Dual-Cloud Failover Engine (`ntfy.sh` + `keyvalue`).
- `v1.8.0` - `v1.8.2`: Added Guest Cloud Pings and initial sync state handling.
- `v1.9.0` - `v1.9.1`: Added Server-Sent Events (SSE) listener and Cloud Sync Lock.
- `v2.0.0`: Expanded to Triple Multi-Cloud Engine.
- `v2.0.1`: Stripped custom CORS headers and implemented non-blocking raw text polling for 100% cross-browser & mobile compatibility.
