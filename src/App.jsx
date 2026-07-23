import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import ProjectVivaApp from './ProjectVivaApp';
import ComprehensiveVivaApp from './ComprehensiveVivaApp';
import SyncTab from './components/SyncTab';
import './index.css';

// Build version for cache verification
const APP_VERSION = "v1.8.0 (Connection State Fixes)";

// PeerJS signaling & WebRTC configuration with static IP & domain STUN/TURN relays
const PEER_OPTIONS = {
  debug: 2,
  config: {
    iceServers: [
      { urls: 'stun:142.250.159.127:19302' },
      { urls: 'stun:74.125.200.127:19302' },
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelay',
        credential: 'openrelay'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelay',
        credential: 'openrelay'
      }
    ],
    sdpSemantics: 'unified-plan',
    iceCandidatePoolSize: 10
  }
};

// URL-safe Base64 Encoders for Cloud Key-Value API
function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function App() {
  const queryParams = new URLSearchParams(window.location.search);
  const printMode = queryParams.get('print');
  const printApp = queryParams.get('app');

  // Load active tab
  const [currentAppTab, setCurrentAppTab] = useState(() => {
    return localStorage.getItem('viva_marks_current_app') || 'project';
  });

  const handleTabSwitch = (tab) => {
    setCurrentAppTab(tab);
    localStorage.setItem('viva_marks_current_app', tab);
  };

  // -------------------------------------------------------------
  // MASTER APP STATES & LOCALSTORAGE SYNC
  // -------------------------------------------------------------
  const [projectDetails, setProjectDetails] = useState(() => {
    const saved = localStorage.getItem('viva_marks_details');
    return saved ? JSON.parse(saved) : { centre: '', date: '', courseCode: '' };
  });

  const [projectStudents, setProjectStudents] = useState(() => {
    const saved = localStorage.getItem('viva_marks_students');
    return saved ? JSON.parse(saved) : [];
  });

  const [compDetails, setCompDetails] = useState(() => {
    const saved = localStorage.getItem('comp_viva_details');
    return saved ? JSON.parse(saved) : { centre: '', date: '', courseCode: 'Viva Voce / BOT4V01' };
  });

  const [compStudents, setCompStudents] = useState(() => {
    const saved = localStorage.getItem('comp_viva_students');
    return saved ? JSON.parse(saved) : [];
  });

  // Auto-save master states to localStorage
  useEffect(() => {
    localStorage.setItem('viva_marks_details', JSON.stringify(projectDetails));
    localStorage.setItem('viva_marks_students', JSON.stringify(projectStudents));
  }, [projectDetails, projectStudents]);

  useEffect(() => {
    localStorage.setItem('comp_viva_details', JSON.stringify(compDetails));
    localStorage.setItem('comp_viva_students', JSON.stringify(compStudents));
  }, [compDetails, compStudents]);

  // -------------------------------------------------------------
  // SAME-DEVICE MULTI-TAB BROADCAST CHANNEL
  // -------------------------------------------------------------
  const bcRef = useRef(null);

  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('vivamarks_tab_sync');
      bcRef.current = bc;

      bc.onmessage = (event) => {
        if (event.data && event.data.type === 'GLOBAL_SYNC_STATE') {
          isInternalHistoryChangeRef.current = true;
          try {
            if (event.data.projectDetails) setProjectDetails(event.data.projectDetails);
            if (event.data.projectStudents) setProjectStudents(event.data.projectStudents);
            if (event.data.compDetails) setCompDetails(event.data.compDetails);
            if (event.data.compStudents) setCompStudents(event.data.compStudents);
          } finally {
            setTimeout(() => { isInternalHistoryChangeRef.current = false; }, 100);
          }
        }
      };

      return () => {
        bc.close();
      };
    }
  }, []);

  // -------------------------------------------------------------
  // UNDO & REDO ENGINE
  // -------------------------------------------------------------
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isInternalHistoryChangeRef = useRef(false);

  // Record initial snapshot once mounted
  useEffect(() => {
    if (history.length === 0) {
      const initialSnapshot = {
        pd: JSON.parse(JSON.stringify(projectDetails)),
        ps: JSON.parse(JSON.stringify(projectStudents)),
        cd: JSON.parse(JSON.stringify(compDetails)),
        cs: JSON.parse(JSON.stringify(compStudents))
      };
      setHistory([initialSnapshot]);
      setHistoryIndex(0);
    }
  }, []);

  // Track changes into history
  useEffect(() => {
    if (isInternalHistoryChangeRef.current) return;

    const currentSnapshot = {
      pd: JSON.parse(JSON.stringify(projectDetails)),
      ps: JSON.parse(JSON.stringify(projectStudents)),
      cd: JSON.parse(JSON.stringify(compDetails)),
      cs: JSON.parse(JSON.stringify(compStudents))
    };

    setHistory(prevHistory => {
      const currentSlice = prevHistory.slice(0, historyIndex + 1);
      const lastSnap = currentSlice[currentSlice.length - 1];
      if (lastSnap && JSON.stringify(lastSnap) === JSON.stringify(currentSnapshot)) {
        return prevHistory;
      }
      const updated = [...currentSlice, currentSnapshot];
      if (updated.length > 30) updated.shift();
      return updated;
    });

    setHistoryIndex(prev => Math.min(prev + 1, 29));
  }, [projectDetails, projectStudents, compDetails, compStudents, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = () => {
    if (canUndo) {
      isInternalHistoryChangeRef.current = true;
      const targetSnapshot = history[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);

      setProjectDetails(targetSnapshot.pd);
      setProjectStudents(targetSnapshot.ps);
      setCompDetails(targetSnapshot.cd);
      setCompStudents(targetSnapshot.cs);

      broadcastGlobalState(targetSnapshot.pd, targetSnapshot.ps, targetSnapshot.cd, targetSnapshot.cs);

      setTimeout(() => { isInternalHistoryChangeRef.current = false; }, 100);
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      isInternalHistoryChangeRef.current = true;
      const targetSnapshot = history[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);

      setProjectDetails(targetSnapshot.pd);
      setProjectStudents(targetSnapshot.ps);
      setCompDetails(targetSnapshot.cd);
      setCompStudents(targetSnapshot.cs);

      broadcastGlobalState(targetSnapshot.pd, targetSnapshot.ps, targetSnapshot.cd, targetSnapshot.cs);

      setTimeout(() => { isInternalHistoryChangeRef.current = false; }, 100);
    }
  };

  // Keyboard shortcuts listener for Ctrl+Z and Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (modifier && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, canUndo, canRedo]);

  // -------------------------------------------------------------
  // DUAL-ENGINE SYNC: WEBRTC P2P + HYBRID CLOUD RELAY ENGINE
  // -------------------------------------------------------------
  const [roomCode, setRoomCode] = useState('');
  const [peerStatus, setPeerStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [statusMsg, setStatusMsg] = useState('');
  const [p2pLogs, setP2pLogs] = useState([]);
  const [syncMode, setSyncMode] = useState('p2p'); // 'p2p' | 'https'

  const activeRoomCodeRef = useRef('');
  const lastHttpsTsRef = useRef(0);
  const lastPasteKeyRef = useRef('');
  const cloudPollingIntervalRef = useRef(null);
  const hasSentCloudPingRef = useRef(false);

  const addP2pLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${msg}`;
    console.log(`[SYNC DIAGNOSTIC] ${entry}`);
    setP2pLogs(prev => [entry, ...prev.slice(0, 49)]);
  };

  const clearP2pLogs = () => {
    setP2pLogs([]);
  };

  const peerRef = useRef(null);
  const isHostRef = useRef(false);
  const hostConnectionsRef = useRef(new Map());
  const guestConnectionRef = useRef(null);

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const disconnectPeer = () => {
    addP2pLog('Disconnecting Sync Session...');
    if (cloudPollingIntervalRef.current) {
      clearInterval(cloudPollingIntervalRef.current);
      cloudPollingIntervalRef.current = null;
    }
    if (guestConnectionRef.current) {
      guestConnectionRef.current.close();
      guestConnectionRef.current = null;
    }
    hostConnectionsRef.current.forEach(conn => conn.close());
    hostConnectionsRef.current.clear();

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    setPeerStatus('disconnected');
    setRoomCode('');
    setStatusMsg('');
    isHostRef.current = false;
    activeRoomCodeRef.current = '';
    lastHttpsTsRef.current = 0;
    lastPasteKeyRef.current = '';
  };

  // HTTPS Hybrid Cloud Relay API (keyvalue.immanuel.co + pastes.dev unlimited payload size + ntfy.sh failover)
  const pushToHttpsCloud = async (pd, ps, cd, cs, codeOverride, incomingTs) => {
    const targetCode = codeOverride || activeRoomCodeRef.current || roomCode;
    if (!targetCode) return;

    const ts = incomingTs || Date.now();
    const payload = {
      type: 'GLOBAL_SYNC_STATE',
      projectDetails: pd,
      projectStudents: ps,
      compDetails: cd,
      compStudents: cs,
      timestamp: ts
    };
    const payloadStr = JSON.stringify(payload);
    const b64Payload = toBase64Url(payloadStr);

    let published = false;
    let pointerKey = b64Payload;

    // 0. Cloud Storage Offloading for large payloads (pastes.dev or bytebin fallback)
    // IIS limits URLs to ~4000 chars. If payload > 1000 chars, offload to unlimited pastebins
    if (b64Payload.length > 1000) {
      try {
        const pRes = await fetch('https://api.pastes.dev/post', { method: 'POST', body: payloadStr });
        if (pRes.ok) {
          const pData = await pRes.json();
          pointerKey = 'pastes_' + pData.key;
          addP2pLog(`HTTPS Cloud: Offloaded large payload to pastes.dev`);
        } else throw new Error();
      } catch (err) {
        try {
          const pRes2 = await fetch('https://bytebin.lucko.me/post', { 
            method: 'POST', 
            body: payloadStr, 
            headers: { 'Content-Type': 'application/json' } 
          });
          if (pRes2.ok) {
            const pData2 = await pRes2.json();
            pointerKey = 'bytebin_' + pData2.key;
            addP2pLog(`HTTPS Cloud: Offloaded large payload to bytebin`);
          } else {
            throw new Error('bytebin error');
          }
        } catch (err2) {
          addP2pLog(`HTTPS Cloud: All pastebins failed. Trying raw Base64...`);
        }
      }
    }

    // 1. Primary Cloud Relay: keyvalue.immanuel.co (Pointer or Base64)
    try {
      const res1 = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/vivaapp123/viva_room_${targetCode}/${pointerKey}`, {
        method: 'POST'
      });
      if (res1.ok) {
        published = true;
        lastHttpsTsRef.current = payload.timestamp;
        lastPasteKeyRef.current = pointerKey;
        addP2pLog(`HTTPS Cloud (keyvalue): Published state update for Room ${targetCode}`);
      }
    } catch (_err1) {
      // primary keyvalue failed
    }

    // 2. Secondary Cloud Relay: ntfy.sh
    if (!published) {
      try {
        const ntfyPayload = JSON.stringify({ ptr: pointerKey });
        const res2 = await fetch(`https://ntfy.sh/viva_room_${targetCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: ntfyPayload
        });
        if (res2.ok) {
          published = true;
          lastHttpsTsRef.current = payload.timestamp;
          addP2pLog(`HTTPS Cloud (ntfy): Published pointer state update for Room ${targetCode}`);
        }
      } catch (_err2) {
        // ntfy blocked
      }
    }

    if (!published) {
      addP2pLog(`HTTPS Cloud Push Warning: Cloud relays unreachable.`);
    }
  };

  const startHttpsCloudListening = (codeOverride) => {
    const targetCode = codeOverride || activeRoomCodeRef.current || roomCode;
    if (!targetCode) return;

    if (cloudPollingIntervalRef.current) clearInterval(cloudPollingIntervalRef.current);
    addP2pLog(`HTTPS Cloud: Activating Hybrid Cloud Relay listener for Room ${targetCode}...`);

    cloudPollingIntervalRef.current = setInterval(async () => {
      let data = null;
      let fetchedPointerKey = null;

      // 1. Try keyvalue.immanuel.co (Base64 or Pointer)
      try {
        const res1 = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/vivaapp123/viva_room_${targetCode}`);
        if (res1.ok) {
          const rawVal = await res1.text();
          if (rawVal && rawVal !== 'null' && rawVal !== '""') {
            const pointerKey = rawVal.replace(/^"|"$/g, '');
            fetchedPointerKey = pointerKey;
            
            // Only parse if pointer has changed
            if (pointerKey && pointerKey !== lastPasteKeyRef.current) {
              // Update lastPasteKeyRef immediately so we never infinite-loop on the same pointer if it's stale
              lastPasteKeyRef.current = pointerKey; 

              if (pointerKey.startsWith('pastes_')) {
                const pRes = await fetch(`https://api.pastes.dev/${pointerKey.split('_')[1]}`);
                if (pRes.ok) data = await pRes.json();
              } else if (pointerKey.startsWith('bytebin_')) {
                const pRes = await fetch(`https://bytebin.lucko.me/${pointerKey.split('_')[1]}`);
                if (pRes.ok) data = await pRes.json();
              } else {
                // Long key means raw Base64 string directly in keyvalue
                const decodedStr = fromBase64Url(pointerKey);
                data = JSON.parse(decodedStr);
              }
            }
          }
        }
      } catch (_err1) {
        // fallback to ntfy
      }

      // 2. Fallback to ntfy.sh (try if keyvalue failed entirely OR if no data was retrieved)
      if (!data) {
        try {
          const res2 = await fetch(`https://ntfy.sh/viva_room_${targetCode}/json?poll=1`);
          if (res2.ok) {
            const text = await res2.text();
            const lines = text.trim().split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
              if (!lines[i].trim()) continue;
              try {
                const msg = JSON.parse(lines[i]);
                if (msg.event === 'message' && msg.message) {
                  const ntfyData = JSON.parse(msg.message);
                  
                  if (ntfyData.ptr) {
                    const pKey = ntfyData.ptr;
                    fetchedPointerKey = pKey;
                    if (pKey && pKey !== lastPasteKeyRef.current) {
                      lastPasteKeyRef.current = pKey;
                      if (pKey.startsWith('pastes_')) {
                        const pRes = await fetch(`https://api.pastes.dev/${pKey.split('_')[1]}`);
                        if (pRes.ok) data = await pRes.json();
                      } else if (pKey.startsWith('bytebin_')) {
                        const pRes = await fetch(`https://bytebin.lucko.me/${pKey.split('_')[1]}`);
                        if (pRes.ok) data = await pRes.json();
                      } else {
                        data = JSON.parse(fromBase64Url(pKey));
                      }
                    }
                  } else {
                    data = ntfyData; // Legacy raw payload support
                  }
                  break;
                }
              } catch (_e) {}
            }
          }
        } catch (_err2) {
          // both failed
        }
      }

      if (data && data.timestamp) {
        if (data.timestamp > lastHttpsTsRef.current) {
          lastHttpsTsRef.current = data.timestamp;
          // fetchedPointerKey logic removed because we now update it eagerly before parsing
          
          isInternalHistoryChangeRef.current = true;
          try {
            if (data.projectDetails) setProjectDetails(data.projectDetails);
            if (data.projectStudents) setProjectStudents(data.projectStudents);
            if (data.compDetails) setCompDetails(data.compDetails);
            if (data.compStudents) setCompStudents(data.compStudents);

            setStatusMsg(`Synced update received via Cloud Relay at ${new Date().toLocaleTimeString()}`);
            addP2pLog(`HTTPS Cloud: Synced state update received for Room ${targetCode}`);

            // CRITICAL SYNC FIX: If HOST receives an update via Cloud, relay it to P2P guests!
            if (isHostRef.current) {
              hostConnectionsRef.current.forEach(conn => {
                if (conn.open) conn.send(data);
              });
            }
            
            setPeerStatus('connected');
            setSyncMode(prev => (prev === 'p2p' ? 'hybrid' : 'https'));
          } finally {
            setTimeout(() => { isInternalHistoryChangeRef.current = false; }, 100);
          }
        } else if (!isHostRef.current) {
          // If we are a guest and we fetched the cloud state (even if no edits happened yet),
          // we are successfully connected to the cloud room.
          setPeerStatus(prev => {
            if (prev === 'disconnected' || prev === 'connecting') {
              if (!hasSentCloudPingRef.current) {
                hasSentCloudPingRef.current = true;
                // Ping the cloud so the Host knows we arrived!
                setTimeout(() => {
                  pushToHttpsCloud(data.projectDetails, data.projectStudents, data.compDetails, data.compStudents, targetCode, Date.now());
                }, 100);
              }
              return 'connected';
            }
            return prev;
          });
          setSyncMode(prev => (prev === 'p2p' ? 'p2p' : 'https'));
        }
      }
    }, 1200);
  };

  const attachWebRtcListeners = (conn, label) => {
    if (!conn) return;
    addP2pLog(`${label}: Registered DataConnection for peer: ${conn.peer}`);

    if (conn.peerConnection) {
      const pc = conn.peerConnection;
      addP2pLog(`${label}: Initial ICE State = ${pc.iceConnectionState}, Signaling = ${pc.signalingState}`);

      pc.oniceconnectionstatechange = () => {
        addP2pLog(`${label}: ICE Connection State changed -> ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          addP2pLog(`${label}: WebRTC blocked by router firewall. Activating Cloud Relay fallback...`);
          startHttpsCloudListening(activeRoomCodeRef.current);
        }
      };

      pc.onicecandidateerror = (e) => {
        addP2pLog(`${label}: ICE Candidate Error -> ${e.errorText || e.errorCode || 'unspecified'}`);
      };

      pc.onsignalingstatechange = () => {
        addP2pLog(`${label}: Signaling State changed -> ${pc.signalingState}`);
      };
    }
  };

  const initHostPeer = () => {
    disconnectPeer();
    clearP2pLogs();

    const code = generateRoomCode();
    setRoomCode(code);
    activeRoomCodeRef.current = code;
    setPeerStatus('connecting');
    setStatusMsg(`Room active (${code}). Waiting for guest partner to join...`);
    isHostRef.current = true;
    hasSentCloudPingRef.current = false;
    setSyncMode('p2p');

    const hostPeerId = `viva-${code}`;
    addP2pLog(`Host: Initializing PeerJS with Host ID = ${hostPeerId}`);
    addP2pLog(`Host: App Version = ${APP_VERSION}`);

    const peer = new Peer(hostPeerId, PEER_OPTIONS);
    peerRef.current = peer;

    peer.on('open', (id) => {
      addP2pLog(`Host: Connected to signaling server! Registered ID = ${id}`);
      setPeerStatus('connecting');
      setStatusMsg(`Room ready! Tell partner to enter code: ${code}`);

      // Publish initial state to Cloud Relay
      pushToHttpsCloud(projectDetails, projectStudents, compDetails, compStudents, code);
      // Start fallback listener
      startHttpsCloudListening(code);
    });

    peer.on('connection', (conn) => {
      addP2pLog(`Host: Incoming connection attempt from guest peer: ${conn.peer}`);
      setupHostConnection(conn);
    });

    peer.on('error', (err) => {
      addP2pLog(`Host: P2P Error (${err.type}): ${err.message}. Enabling Cloud Relay...`);
      console.error('PeerJS Host Error:', err);
      startHttpsCloudListening(code);
    });
  };

  const setupHostConnection = (conn) => {
    attachWebRtcListeners(conn, 'Host');

    const handleConnected = () => {
      hostConnectionsRef.current.set(conn.peer, conn);
      const totalDevices = hostConnectionsRef.current.size + 1;
      addP2pLog(`Host: DataChannel OPEN with guest ${conn.peer}! Total devices: ${totalDevices}`);
      setPeerStatus('connected');
      setSyncMode('p2p');
      setStatusMsg(`Connected! ${totalDevices} devices synced in Room ${roomCode || activeRoomCodeRef.current}`);

      sendStateToConn(conn, projectDetails, projectStudents, compDetails, compStudents);
    };

    if (conn.open) {
      handleConnected();
    } else {
      conn.on('open', handleConnected);
    }

    conn.on('data', (data) => {
      if (data && data.type === 'GLOBAL_SYNC_STATE') {
        addP2pLog(`Host: Received state packet from ${conn.peer}. Relaying to guests and Cloud...`);
        isInternalHistoryChangeRef.current = true;
        try {
          if (data.timestamp && data.timestamp > lastHttpsTsRef.current) {
            lastHttpsTsRef.current = data.timestamp;
          }
          if (data.projectDetails) setProjectDetails(data.projectDetails);
          if (data.projectStudents) setProjectStudents(data.projectStudents);
          if (data.compDetails) setCompDetails(data.compDetails);
          if (data.compStudents) setCompStudents(data.compStudents);

          // Relay to ALL OTHER connected guest devices in the room over WebRTC!
          hostConnectionsRef.current.forEach((otherConn, peerId) => {
            if (peerId !== conn.peer && otherConn.open) {
              otherConn.send(data);
            }
          });
          
          // CRITICAL SYNC FIX: Host MUST push incoming P2P updates to the Cloud for Cloud-only guests!
          pushToHttpsCloud(
            data.projectDetails, 
            data.projectStudents, 
            data.compDetails, 
            data.compStudents, 
            roomCode || activeRoomCodeRef.current,
            data.timestamp
          );

          const totalDevices = hostConnectionsRef.current.size + 1;
          setPeerStatus('connected');
          setStatusMsg(`Synced update (${totalDevices} devices) at ${new Date().toLocaleTimeString()}`);
        } catch (e) {
          console.error('Failed to parse incoming P2P packet', e);
        } finally {
          setTimeout(() => { isInternalHistoryChangeRef.current = false; }, 100);
        }
      }
    });

    conn.on('close', () => {
      addP2pLog(`Host: Connection closed with guest ${conn.peer}`);
      hostConnectionsRef.current.delete(conn.peer);
      const totalDevices = hostConnectionsRef.current.size + 1;
      if (hostConnectionsRef.current.size === 0) {
        setStatusMsg(`Room active (${roomCode || activeRoomCodeRef.current}). Waiting for devices...`);
      } else {
        setStatusMsg(`Device disconnected. ${totalDevices} devices active.`);
      }
    });

    conn.on('error', (err) => {
      addP2pLog(`Host: DataConnection Error with ${conn.peer}: ${err.message}`);
    });
  };

  const joinPeerRoom = (codeToJoin) => {
    const cleanCode = codeToJoin.trim().toUpperCase();
    if (!cleanCode || cleanCode.length !== 6) {
      alert('Please enter a valid 6-character Room Code.');
      return;
    }

    disconnectPeer();
    clearP2pLogs();
    isHostRef.current = false;
    hasSentCloudPingRef.current = false;

    setPeerStatus('connecting');
    setStatusMsg(`Connecting to Room ${cleanCode}...`);
    setRoomCode(cleanCode);
    activeRoomCodeRef.current = cleanCode;

    addP2pLog(`Guest: Initializing PeerJS client to join room: ${cleanCode}`);
    addP2pLog(`Guest: App Version = ${APP_VERSION}`);

    const peer = new Peer(PEER_OPTIONS);
    peerRef.current = peer;

    // Start Cloud Relay listener immediately as fallback in case WebRTC fails
    startHttpsCloudListening(cleanCode);

    peer.on('open', (myId) => {
      const hostPeerId = `viva-${cleanCode}`;
      addP2pLog(`Guest: Registered with signaling server! My ID = ${myId}`);
      addP2pLog(`Guest: Initiating connection to host peer = ${hostPeerId}...`);

      const conn = peer.connect(hostPeerId);
      guestConnectionRef.current = conn;
      setupGuestConnection(conn);
    });

    peer.on('error', (err) => {
      addP2pLog(`Guest: WebRTC Error (${err.type}): ${err.message}. Using Cloud Relay fallback!`);
    });
  };

  const setupGuestConnection = (conn) => {
    attachWebRtcListeners(conn, 'Guest');

    const handleConnected = () => {
      addP2pLog(`Guest: DataChannel OPEN with host ${conn.peer}! WebRTC P2P Active.`);
      setPeerStatus('connected');
      setSyncMode('p2p');
      setStatusMsg(`Connected to Room ${roomCode || activeRoomCodeRef.current}! Multi-device background sync active.`);
    };

    if (conn.open) {
      handleConnected();
    } else {
      conn.on('open', handleConnected);
    }

    conn.on('data', (data) => {
      if (data && data.type === 'GLOBAL_SYNC_STATE') {
        addP2pLog(`Guest: Received state update from host.`);
        isInternalHistoryChangeRef.current = true;
        try {
          if (data.timestamp && data.timestamp > lastHttpsTsRef.current) {
            lastHttpsTsRef.current = data.timestamp;
          }
          if (data.projectDetails) setProjectDetails(data.projectDetails);
          if (data.projectStudents) setProjectStudents(data.projectStudents);
          if (data.compDetails) setCompDetails(data.compDetails);
          if (data.compStudents) setCompStudents(data.compStudents);

          setPeerStatus('connected');
          setStatusMsg(`Synced update received at ${new Date().toLocaleTimeString()}`);
        } catch (e) {
          console.error('Failed to parse incoming P2P packet', e);
        } finally {
          setTimeout(() => { isInternalHistoryChangeRef.current = false; }, 100);
        }
      }
    });

    conn.on('close', () => {
      addP2pLog(`Guest: Connection closed by host.`);
      disconnectPeer(); // Full teardown to kill zombie cloud polling
      setStatusMsg('Disconnected. Host ended the session.');
    });

    conn.on('error', (err) => {
      addP2pLog(`Guest: Connection Error: ${err.message}`);
    });
  };

  const sendStateToConn = (conn, pd, ps, cd, cs) => {
    if (conn && conn.open) {
      const ts = Date.now();
      // Update our own tracker so we don't echo our own initial sync back
      if (ts > lastHttpsTsRef.current) lastHttpsTsRef.current = ts;
      conn.send({
        type: 'GLOBAL_SYNC_STATE',
        projectDetails: pd,
        projectStudents: ps,
        compDetails: cd,
        compStudents: cs,
        timestamp: ts
      });
    }
  };

  const broadcastGlobalState = (pd, ps, cd, cs) => {
    if (isInternalHistoryChangeRef.current) return;

    const payload = {
      type: 'GLOBAL_SYNC_STATE',
      projectDetails: pd,
      projectStudents: ps,
      compDetails: cd,
      compStudents: cs,
      timestamp: Date.now()
    };
    
    // Update local tracker so the sender ignores this exact payload if it echoes back via Cloud
    lastHttpsTsRef.current = payload.timestamp;

    // 1. Broadcast to same-device local tabs (0ms latency)
    if (bcRef.current) {
      bcRef.current.postMessage(payload);
    }

    // 2. Broadcast to P2P network peers
    if (isHostRef.current) {
      hostConnectionsRef.current.forEach(conn => {
        if (conn.open) conn.send(payload);
      });
      // Also push to HTTPS Cloud Relay
      pushToHttpsCloud(pd, ps, cd, cs);
    } else if (guestConnectionRef.current && guestConnectionRef.current.open) {
      guestConnectionRef.current.send(payload);
    } else if (activeRoomCodeRef.current || roomCode) {
      // Guest pushes to HTTPS Cloud Relay if WebRTC is blocked
      pushToHttpsCloud(pd, ps, cd, cs);
    }
  };

  // Broadcast state changes whenever local states change while connected
  // Using a ref-check instead of relying solely on the 100ms timeout to prevent race-condition echoes
  useEffect(() => {
    if (isInternalHistoryChangeRef.current) return;
    broadcastGlobalState(projectDetails, projectStudents, compDetails, compStudents);
  }, [projectDetails, projectStudents, compDetails, compStudents]);

  const handleResetDataWrapper = (appSource) => {
    if (appSource === 'project') {
      const defaultDetails = { centre: '', date: '', courseCode: '' };
      const defaultStudents = [];
      setProjectDetails(defaultDetails);
      setProjectStudents(defaultStudents);
      broadcastGlobalState(defaultDetails, defaultStudents, compDetails, compStudents);
    } else if (appSource === 'comp') {
      const defaultDetails = { centre: '', date: '', courseCode: 'Viva Voce / BOT4V01' };
      const defaultStudents = [];
      setCompDetails(defaultDetails);
      setCompStudents(defaultStudents);
      broadcastGlobalState(projectDetails, projectStudents, defaultDetails, defaultStudents);
    }
  };

  // -------------------------------------------------------------
  // PRINT MODE DELEGATION
  // -------------------------------------------------------------
  if (printMode === 'marklist' && printApp !== 'comp') {
    return (
      <ProjectVivaApp 
        details={projectDetails} setDetails={setProjectDetails}
        students={projectStudents} setStudents={setProjectStudents}
        canUndo={canUndo} canRedo={canRedo} onUndo={handleUndo} onRedo={handleRedo}
        onResetData={() => handleResetDataWrapper('project')}
      />
    );
  }
  if (printMode === 'marklist' && printApp === 'comp') {
    return (
      <ComprehensiveVivaApp 
        details={compDetails} setDetails={setCompDetails}
        students={compStudents} setStudents={setCompStudents}
        canUndo={canUndo} canRedo={canRedo} onUndo={handleUndo} onRedo={handleRedo}
        onResetData={() => handleResetDataWrapper('comp')}
      />
    );
  }

  return (
    <div className="master-container">
      <nav className="master-nav">
        <button 
          className={`master-tab ${currentAppTab === 'project' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('project')}
        >
          1. Project Viva Marks Consolidator
        </button>
        <button 
          className={`master-tab ${currentAppTab === 'comp' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('comp')}
        >
          2. Comprehensive Viva Marks Consolidator
        </button>
        <button 
          className={`master-tab ${currentAppTab === 'sync' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('sync')}
          style={{ position: 'relative' }}
        >
          3. Live Multi-Device Sync 📡
          {peerStatus === 'connected' && (
            <span style={{ marginLeft: '6px', background: syncMode === 'p2p' ? '#22c55e' : '#eab308', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px' }}>
              {syncMode === 'p2p' ? `Room ${roomCode}` : `Cloud ${roomCode}`}
            </span>
          )}
        </button>
      </nav>

      <div style={{ padding: '4px 16px', background: 'rgba(0,0,0,0.3)', color: '#64748b', fontSize: '0.75rem', textAlign: 'right' }}>
        App Build Version: <strong style={{ color: '#38bdf8' }}>{APP_VERSION}</strong>
      </div>

      <div className="master-content">
        {currentAppTab === 'project' && (
          <ProjectVivaApp 
            details={projectDetails} setDetails={setProjectDetails}
            students={projectStudents} setStudents={setProjectStudents}
            canUndo={canUndo} canRedo={canRedo} onUndo={handleUndo} onRedo={handleRedo}
            onResetData={() => handleResetDataWrapper('project')}
          />
        )}
        {currentAppTab === 'comp' && (
          <ComprehensiveVivaApp 
            details={compDetails} setDetails={setCompDetails}
            students={compStudents} setStudents={setCompStudents}
            canUndo={canUndo} canRedo={canRedo} onUndo={handleUndo} onRedo={handleRedo}
            onResetData={() => handleResetDataWrapper('comp')}
          />
        )}
        {currentAppTab === 'sync' && (
          <SyncTab 
            peerStatus={peerStatus}
            statusMsg={statusMsg}
            roomCode={roomCode || activeRoomCodeRef.current}
            isHost={isHostRef.current}
            initHostPeer={initHostPeer}
            joinPeerRoom={joinPeerRoom}
            disconnectPeer={disconnectPeer}
            p2pLogs={p2pLogs}
            clearP2pLogs={clearP2pLogs}
            projectDetails={projectDetails} setProjectDetails={setProjectDetails}
            projectStudents={projectStudents} setProjectStudents={setProjectStudents}
            compDetails={compDetails} setCompDetails={setCompDetails}
            compStudents={compStudents} setCompStudents={setCompStudents}
          />
        )}
      </div>
    </div>
  );
}

export default App;
