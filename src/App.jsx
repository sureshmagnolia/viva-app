import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { Share2 } from 'lucide-react';
import ProjectVivaApp from './ProjectVivaApp';
import ComprehensiveVivaApp from './ComprehensiveVivaApp';
import SyncTab from './components/SyncTab';
import { saveToIndexedDB, getFromIndexedDB } from './utils/indexedDB';
import { mergeStudentData } from './utils/mergeUtils';
import './index.css';

// Build version for cache verification
const APP_VERSION = "v2.0.1 (Zero-Preflight Fast Cloud Sync & IndexedDB Persistence)";

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

const createPeerInstance = (...args) => {
  const PeerConstructor = (typeof Peer === 'function' ? Peer : (Peer && (Peer.Peer || Peer.default))) || Peer;
  return new PeerConstructor(...args);
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

  // Device Role & Device Name for Multi-Device Conflict Prevention
  const [deviceRole, setDeviceRoleState] = useState(() => {
    return localStorage.getItem('viva_marks_device_role') || 'ex1';
  });

  const setDeviceRole = (role) => {
    setDeviceRoleState(role);
    localStorage.setItem('viva_marks_device_role', role);
  };

  const [deviceName, setDeviceNameState] = useState(() => {
    const saved = localStorage.getItem('viva_marks_device_name');
    if (saved) return saved;
    const gen = 'PC-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    localStorage.setItem('viva_marks_device_name', gen);
    return gen;
  });

  const setDeviceName = (name) => {
    setDeviceNameState(name);
    localStorage.setItem('viva_marks_device_name', name);
  };

  const [connectedPeers, setConnectedPeers] = useState({});

  const handleTabSwitch = (tab) => {
    setCurrentAppTab(tab);
    localStorage.setItem('viva_marks_current_app', tab);
  };

  // -------------------------------------------------------------
  // MASTER APP STATES & LOCALSTORAGE + INDEXEDDB SYNC
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

  // On initial mount, fallback to IndexedDB if localStorage was cleared
  useEffect(() => {
    const initFromIndexedDB = async () => {
      try {
        if (!localStorage.getItem('viva_marks_details')) {
          const idbPd = await getFromIndexedDB('viva_marks_details');
          if (idbPd) setProjectDetails(idbPd);
        }
        if (!localStorage.getItem('viva_marks_students')) {
          const idbPs = await getFromIndexedDB('viva_marks_students');
          if (idbPs) setProjectStudents(idbPs);
        }
        if (!localStorage.getItem('comp_viva_details')) {
          const idbCd = await getFromIndexedDB('comp_viva_details');
          if (idbCd) setCompDetails(idbCd);
        }
        if (!localStorage.getItem('comp_viva_students')) {
          const idbCs = await getFromIndexedDB('comp_viva_students');
          if (idbCs) setCompStudents(idbCs);
        }
      } catch (err) {
        console.warn('IndexedDB hydration fallback warning:', err);
      }
    };
    initFromIndexedDB();
  }, []);

  // Auto-save master states to localStorage and IndexedDB
  useEffect(() => {
    localStorage.setItem('viva_marks_details', JSON.stringify(projectDetails));
    localStorage.setItem('viva_marks_students', JSON.stringify(projectStudents));
    saveToIndexedDB('viva_marks_details', projectDetails);
    saveToIndexedDB('viva_marks_students', projectStudents);
  }, [projectDetails, projectStudents]);

  useEffect(() => {
    localStorage.setItem('comp_viva_details', JSON.stringify(compDetails));
    localStorage.setItem('comp_viva_students', JSON.stringify(compStudents));
    saveToIndexedDB('comp_viva_details', compDetails);
    saveToIndexedDB('comp_viva_students', compStudents);
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
  const [connectionLostReason, setConnectionLostReason] = useState(null);

  const activeRoomCodeRef = useRef('');
  const lastHttpsTsRef = useRef(0);
  const lastPasteKeyRef = useRef('');
  const cloudPollingIntervalRef = useRef(null);
  const hasSentCloudPingRef = useRef(false);
  const hasReceivedCloudStateRef = useRef(false);
  const lastHostSeenRef = useRef(Date.now());
  const isDisconnectingRef = useRef(false);

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
  const hasPromptedRoleConflictRef = useRef(false);

  const checkAndPromptRoleConflict = (incomingRole, senderName = 'The Host', activePeersMap = {}) => {
    if (isHostRef.current || hasPromptedRoleConflictRef.current) return;

    // Collect all taken roles in the room
    const takenRoles = new Set();
    if (incomingRole) takenRoles.add(incomingRole);
    if (activePeersMap && typeof activePeersMap === 'object') {
      Object.values(activePeersMap).forEach(p => {
        if (p && p.role) takenRoles.add(p.role);
      });
    }

    if (takenRoles.has(deviceRole)) {
      hasPromptedRoleConflictRef.current = true;

      // Determine alternative role: ex1 -> ex2, ex2 -> ex1
      const suggestedRole = deviceRole === 'ex1' ? 'ex2' : 'ex1';
      const currentRoleLabel = deviceRole === 'ex1' ? 'Examiner 1' : 'Examiner 2';
      const suggestedRoleLabel = suggestedRole === 'ex1' ? 'Examiner 1' : 'Examiner 2';

      setTimeout(() => {
        const accept = window.confirm(
          `🤝 Joined Room Successfully!\n\n` +
          `Notice: ${senderName || 'Another device'} in this room is already set as "${currentRoleLabel}".\n\n` +
          `Would you like to set your device's role to "${suggestedRoleLabel}" to avoid mark entry conflicts?`
        );
        if (accept) {
          setDeviceRole(suggestedRole);
          addP2pLog(`Guest: Device role set to ${suggestedRoleLabel} upon joining room.`);
        }
      }, 100);
    }
  };

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
    isDisconnectingRef.current = true;

    if (cloudPollingIntervalRef.current) {
      clearInterval(cloudPollingIntervalRef.current);
      cloudPollingIntervalRef.current = null;
    }
    if (guestConnectionRef.current) {
      try { guestConnectionRef.current.close(); } catch (_) {}
      guestConnectionRef.current = null;
    }
    hostConnectionsRef.current.forEach(conn => {
      try { conn.close(); } catch (_) {}
    });
    hostConnectionsRef.current.clear();

    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch (_) {}
      peerRef.current = null;
    }

    setPeerStatus('disconnected');
    setRoomCode('');
    setStatusMsg('Offline Mode: Your grade entries are saved in IndexedDB.');
    isHostRef.current = false;
    activeRoomCodeRef.current = '';
    lastHttpsTsRef.current = 0;
    lastPasteKeyRef.current = '';
    hasReceivedCloudStateRef.current = false;
  };

  // Heartbeat Sender & Liveness Presence Monitor
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      if (peerStatus === 'connected' || peerStatus === 'connecting') {
        const payload = {
          type: 'PEER_HEARTBEAT',
          senderRole: deviceRole,
          senderName: deviceName,
          senderActiveTab: currentAppTab,
          timestamp: Date.now()
        };

        if (isHostRef.current) {
          hostConnectionsRef.current.forEach(conn => {
            if (conn.open) conn.send(payload);
          });
        } else if (guestConnectionRef.current && guestConnectionRef.current.open) {
          guestConnectionRef.current.send(payload);
        }
      }
    }, 3500);

    const livenessCheckInterval = setInterval(() => {
      const now = Date.now();

      // Prune inactive roster entries (>8s)
      setConnectedPeers(prev => {
        let updated = false;
        const next = { ...prev };
        Object.entries(next).forEach(([key, peer]) => {
          if (now - (peer.lastSeen || 0) > 8000) {
            delete next[key];
            updated = true;
          }
        });
        return updated ? next : prev;
      });

      // Guest heartbeat timeout check: If connected to Host but no signal for > 9.5s
      if (!isHostRef.current && (peerStatus === 'connected' || peerStatus === 'connecting')) {
        if (now - lastHostSeenRef.current > 9500) {
          addP2pLog('Guest: Host heartbeat timeout (>9.5s). Connection lost!');
          disconnectPeer();
          setConnectionLostReason('Host heartbeat timeout (Host lost connection, closed tab, or refreshed).');
        }
      }
    }, 2500);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(livenessCheckInterval);
    };
  }, [peerStatus, deviceRole, deviceName, currentAppTab]);

  // Notify connected peers when user leaves or refreshes the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      const payload = {
        type: 'PEER_DISCONNECT',
        senderRole: deviceRole,
        senderName: deviceName,
        isHost: isHostRef.current,
        timestamp: Date.now()
      };

      if (isHostRef.current) {
        hostConnectionsRef.current.forEach(conn => {
          if (conn.open) conn.send(payload);
        });
      } else if (guestConnectionRef.current && guestConnectionRef.current.open) {
        guestConnectionRef.current.send(payload);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [deviceRole, deviceName]);

  // Zero-Preflight Fast HTTPS Cloud Relay (ntfy.sh raw + keyvalue.immanuel.co)
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
      senderRole: deviceRole,
      senderName: deviceName,
      senderActiveTab: currentAppTab,
      timestamp: ts
    };
    const payloadStr = JSON.stringify(payload);
    const b64Payload = toBase64Url(payloadStr);

    let published = false;
    let pointerKey = b64Payload;

    // 0. Cloud Storage Offloading for large payloads (pastes.dev or bytebin fallback)
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
            body: payloadStr
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

    // Provider 1: ntfy.sh (Raw Body -> No CORS Preflight!)
    try {
      const res1 = await fetch(`https://ntfy.sh/viva_room_${targetCode}`, {
        method: 'POST',
        body: pointerKey
      });
      if (res1.ok) published = true;
    } catch (_e1) {}

    // Provider 2: keyvalue.immanuel.co (URL-based API -> No CORS Preflight!)
    try {
      const res2 = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/vivaapp123/viva_room_${targetCode}/${pointerKey}`, {
        method: 'POST'
      });
      if (res2.ok) published = true;
    } catch (_e2) {}

    if (published) {
      lastHttpsTsRef.current = payload.timestamp;
      lastPasteKeyRef.current = pointerKey;
      addP2pLog(`HTTPS Cloud: Published state update for Room ${targetCode}`);
    } else {
      addP2pLog(`HTTPS Cloud Push Warning: All cloud relays unreachable.`);
    }
  };

  const startHttpsCloudListening = (codeOverride) => {
    const targetCode = codeOverride || activeRoomCodeRef.current || roomCode;
    if (!targetCode || isDisconnectingRef.current) return;

    if (cloudPollingIntervalRef.current) return;

    addP2pLog(`HTTPS Cloud: Activating Non-Blocking Cloud Relay Listener for Room ${targetCode}...`);

    const pollCloud = async () => {
      if (isDisconnectingRef.current || !activeRoomCodeRef.current) return;

      let data = null;
      let fetchedPointerKey = null;

      // 1. Fetch from ntfy.sh raw (Immediate non-blocking return)
      try {
        const res1 = await fetch(`https://ntfy.sh/viva_room_${targetCode}/raw?poll=1`);
        if (res1.ok) {
          const text = await res1.text();
          const lines = text.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          if (lastLine && lastLine.trim()) {
            fetchedPointerKey = lastLine.trim();
          }
        }
      } catch (_err1) {}

      if (isDisconnectingRef.current || !activeRoomCodeRef.current) return;

      // 2. Fallback to keyvalue.immanuel.co
      if (!fetchedPointerKey) {
        try {
          const res2 = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/vivaapp123/viva_room_${targetCode}`);
          if (res2.ok) {
            const rawVal = await res2.text();
            if (rawVal && rawVal !== 'null' && rawVal !== '""') {
              fetchedPointerKey = rawVal.replace(/^"|"$/g, '');
            }
          }
        } catch (_err2) {}
      }

      if (isDisconnectingRef.current || !activeRoomCodeRef.current) return;

      // Process fetched pointer key
      if (fetchedPointerKey && fetchedPointerKey !== lastPasteKeyRef.current) {
        lastPasteKeyRef.current = fetchedPointerKey;
        try {
          if (fetchedPointerKey.startsWith('pastes_')) {
            const pRes = await fetch(`https://api.pastes.dev/${fetchedPointerKey.split('_')[1]}`);
            if (pRes.ok) data = await pRes.json();
          } else if (fetchedPointerKey.startsWith('bytebin_')) {
            const pRes = await fetch(`https://bytebin.lucko.me/${fetchedPointerKey.split('_')[1]}`);
            if (pRes.ok) data = await pRes.json();
          } else {
            data = JSON.parse(fromBase64Url(fetchedPointerKey));
          }
        } catch (_parseErr) {}
      }

      if (isDisconnectingRef.current || !activeRoomCodeRef.current) return;

      if (data && data.timestamp) {
        hasReceivedCloudStateRef.current = true;
        handleIncomingPeerState(data, 'CloudHost');

        if (!isHostRef.current && !hasSentCloudPingRef.current) {
          hasSentCloudPingRef.current = true;
          setTimeout(() => {
            pushToHttpsCloud(data.projectDetails, data.projectStudents, data.compDetails, data.compStudents, targetCode, Date.now());
          }, 100);
        }

        if (data.timestamp > lastHttpsTsRef.current) {
          lastHttpsTsRef.current = data.timestamp;

          isInternalHistoryChangeRef.current = true;
          try {
            const incomingRole = data.senderRole || 'all';
            if (data.projectDetails) setProjectDetails(data.projectDetails);
            if (data.projectStudents && Array.isArray(data.projectStudents)) {
              setProjectStudents(prev => mergeStudentData(prev, data.projectStudents, 'ProjectVivaApp', incomingRole));
            }
            if (data.compDetails) setCompDetails(data.compDetails);
            if (data.compStudents && Array.isArray(data.compStudents)) {
              setCompStudents(prev => mergeStudentData(prev, data.compStudents, 'ComprehensiveVivaApp', incomingRole));
            }

            setStatusMsg(`Synced update received via Cloud Relay at ${new Date().toLocaleTimeString()}`);
            addP2pLog(`HTTPS Cloud: Synced state update received for Room ${targetCode}`);

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
        }
      }
    };

    pollCloud();
    cloudPollingIntervalRef.current = setInterval(pollCloud, 1500);
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
    isDisconnectingRef.current = false;
    clearP2pLogs();
    setConnectionLostReason(null);

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

    const peer = createPeerInstance(hostPeerId, PEER_OPTIONS);
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
          const incomingRole = data.senderRole || 'all';
          if (data.projectDetails) setProjectDetails(data.projectDetails);
          if (data.projectStudents && Array.isArray(data.projectStudents)) {
            setProjectStudents(prev => mergeStudentData(prev, data.projectStudents, 'ProjectVivaApp', incomingRole));
          }
          if (data.compDetails) setCompDetails(data.compDetails);
          if (data.compStudents && Array.isArray(data.compStudents)) {
            setCompStudents(prev => mergeStudentData(prev, data.compStudents, 'ComprehensiveVivaApp', incomingRole));
          }

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

  const joinPeerRoom = (cleanCode) => {
    disconnectPeer();
    isDisconnectingRef.current = false;
    clearP2pLogs();
    isHostRef.current = false;
    hasSentCloudPingRef.current = false;
    hasPromptedRoleConflictRef.current = false;

    setPeerStatus('connecting');
    setStatusMsg(`Connecting to Room ${cleanCode}...`);
    setRoomCode(cleanCode);
    activeRoomCodeRef.current = cleanCode;

    addP2pLog(`Guest: Initializing PeerJS client to join room: ${cleanCode}`);
    addP2pLog(`Guest: App Version = ${APP_VERSION}`);

    const peer = createPeerInstance(PEER_OPTIONS);
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

      // CRITICAL OFFLINE SYNC FIX: Immediately transmit Guest's offline grade entries to Host upon connecting!
      sendStateToConn(conn, projectDetails, projectStudents, compDetails, compStudents);
    };

    if (conn.open) {
      handleConnected();
    } else {
      conn.on('open', handleConnected);
    }

    conn.on('data', (data) => {
      if (!data) return;
      handleIncomingPeerState(data, conn.peer);

      if (data.type === 'GLOBAL_SYNC_STATE') {
        addP2pLog(`Guest: Received state update from host.`);
        isInternalHistoryChangeRef.current = true;
        try {
          if (data.timestamp && data.timestamp > lastHttpsTsRef.current) {
            lastHttpsTsRef.current = data.timestamp;
          }
          const incomingRole = data.senderRole || 'all';
          if (data.projectDetails) setProjectDetails(data.projectDetails);
          if (data.projectStudents && Array.isArray(data.projectStudents)) {
            setProjectStudents(prev => mergeStudentData(prev, data.projectStudents, 'ProjectVivaApp', incomingRole));
          }
          if (data.compDetails) setCompDetails(data.compDetails);
          if (data.compStudents && Array.isArray(data.compStudents)) {
            setCompStudents(prev => mergeStudentData(prev, data.compStudents, 'ComprehensiveVivaApp', incomingRole));
          }

          checkAndPromptRoleConflict(data.senderRole, data.senderName, connectedPeers);

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

  const handleIncomingPeerState = (data, peerId = 'remote') => {
    if (!data || isDisconnectingRef.current || !activeRoomCodeRef.current) return;

    if (!isHostRef.current) {
      lastHostSeenRef.current = Date.now();
    }

    if (data.type === 'PEER_DISCONNECT' || data.type === 'ROOM_RESET') {
      if (!isHostRef.current && (data.isHost || data.type === 'ROOM_RESET')) {
        disconnectPeer();
        setConnectionLostReason(
          data.type === 'ROOM_RESET'
            ? 'The Host reset room examination data.'
            : 'The Host closed or refreshed their browser tab.'
        );
      }
      return;
    }

    if (data.senderName) {
      const key = peerId !== 'remote' ? peerId : data.senderName;
      setConnectedPeers(prev => ({
        ...prev,
        [key]: {
          name: data.senderName,
          role: data.senderRole || 'ex1',
          activeTab: data.senderActiveTab || 'comp',
          lastSeen: Date.now()
        }
      }));
    }
  };

  const sendStateToConn = (conn, pd, ps, cd, cs) => {
    const ts = Date.now();
    if (ts > lastHttpsTsRef.current) lastHttpsTsRef.current = ts;
    conn.send({
      type: 'GLOBAL_SYNC_STATE',
      projectDetails: pd,
      projectStudents: ps,
      compDetails: cd,
      compStudents: cs,
      senderRole: deviceRole,
      senderName: deviceName,
      senderActiveTab: currentAppTab,
      timestamp: ts
    });
  };

  const broadcastGlobalState = (pd, ps, cd, cs) => {
    if (isInternalHistoryChangeRef.current) return;

    const payload = {
      type: 'GLOBAL_SYNC_STATE',
      projectDetails: pd,
      projectStudents: ps,
      compDetails: cd,
      compStudents: cs,
      senderRole: deviceRole,
      senderName: deviceName,
      senderActiveTab: currentAppTab,
      timestamp: Date.now()
    };

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
  useEffect(() => {
    if (isInternalHistoryChangeRef.current) return;
    broadcastGlobalState(projectDetails, projectStudents, compDetails, compStudents);
  }, [projectDetails, projectStudents, compDetails, compStudents, deviceRole, deviceName, currentAppTab]);

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
        deviceRole={deviceRole} setDeviceRole={setDeviceRole}
        deviceName={deviceName} setDeviceName={setDeviceName}
        connectedPeers={connectedPeers}
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
        deviceRole={deviceRole} setDeviceRole={setDeviceRole}
        deviceName={deviceName} setDeviceName={setDeviceName}
        connectedPeers={connectedPeers}
      />
    );
  }

  return (
    <div className="app-container">
      <header className="master-header glass-panel" style={{ background: 'linear-gradient(135deg, #1e1b4b, #311b92)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', padding: '10px', borderRadius: '12px', display: 'flex' }}>
            <Share2 size={28} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              University Viva Voce Examination System
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#a5b4fc', margin: 0 }}>
              CBCSS Direct Grade & WGP Entry Suite (Integrated Peer-to-Peer & Cloud Sync)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>My Device Role:</span>
          <select
            value={deviceRole}
            onChange={(e) => setDeviceRole(e.target.value)}
            disabled={peerStatus !== 'disconnected'}
            title={peerStatus !== 'disconnected' ? "Role is locked while connected to room. Disconnect room session to change role." : "Select your device role"}
            style={{
              backgroundColor: deviceRole === 'ex1' ? '#15803d' : deviceRole === 'ex2' ? '#1d4ed8' : '#7c3aed',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: peerStatus !== 'disconnected' ? 'not-allowed' : 'pointer',
              opacity: peerStatus !== 'disconnected' ? 0.85 : 1,
              outline: 'none'
            }}
          >
            <option value="ex1" style={{ background: '#1e1b4b', color: '#4ade80' }}>Examiner 1</option>
            <option value="ex2" style={{ background: '#1e1b4b', color: '#60a5fa' }}>Examiner 2</option>
            <option value="viewer" style={{ background: '#1e1b4b', color: '#c084fc' }}>Chairman / Viewer</option>
          </select>
          {peerStatus !== 'disconnected' && (
            <span style={{ fontSize: '0.75rem', color: '#fbbf24' }} title="Role locked during live sync session. Exit room to change role.">
              🔒 Locked
            </span>
          )}
        </div>
      </header>

      <nav className="master-tabs">
        <button 
          className={`master-tab ${currentAppTab === 'project' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('project')}
        >
          1. Project Viva & Dissertation
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
          {peerStatus === 'disconnected' && connectionLostReason && (
            <span style={{ marginLeft: '6px', background: '#d97706', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px' }}>
              Offline (Saved)
            </span>
          )}
        </button>
      </nav>

      {/* Non-intrusive subtle alert banner when sync connection is dropped */}
      {connectionLostReason && (
        <div style={{
          background: 'linear-gradient(90deg, #78350f, #92400e)',
          borderBottom: '1px solid #f59e0b',
          color: '#fef3c7',
          padding: '8px 16px',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>📡</span>
            <span>
              <strong>Offline Sync Mode:</strong> {connectionLostReason} — <span style={{ color: '#86efac' }}>All your grade entries are safely stored in IndexedDB and will automatically sync when you rejoin!</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => handleTabSwitch('sync')}
              style={{
                background: '#f59e0b',
                color: '#0f172a',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Rejoin Room 🔄
            </button>
            <button
              onClick={() => setConnectionLostReason(null)}
              style={{
                background: 'transparent',
                color: '#fde68a',
                border: 'none',
                fontSize: '1.1rem',
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1
              }}
              title="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: '4px 16px', background: 'rgba(0,0,0,0.3)', color: '#64748b', fontSize: '0.75rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
        <span>App Build Version: <strong style={{ color: '#38bdf8' }}>{APP_VERSION}</strong></span>
        <button 
          onClick={() => {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
            }
            window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
          }} 
          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '3px 10px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ⚡ Force Load Latest Version
        </button>
      </div>

      <div className="master-content">
        {currentAppTab === 'project' && (
          <ProjectVivaApp 
            details={projectDetails} setDetails={setProjectDetails}
            students={projectStudents} setStudents={setProjectStudents}
            canUndo={canUndo} canRedo={canRedo} onUndo={handleUndo} onRedo={handleRedo}
            onResetData={() => handleResetDataWrapper('project')}
            deviceRole={deviceRole} setDeviceRole={setDeviceRole}
            deviceName={deviceName} setDeviceName={setDeviceName}
            connectedPeers={connectedPeers}
          />
        )}
        {currentAppTab === 'comp' && (
          <ComprehensiveVivaApp 
            details={compDetails} setDetails={setCompDetails}
            students={compStudents} setStudents={setCompStudents}
            canUndo={canUndo} canRedo={canRedo} onUndo={handleUndo} onRedo={handleRedo}
            onResetData={() => handleResetDataWrapper('comp')}
            deviceRole={deviceRole} setDeviceRole={setDeviceRole}
            deviceName={deviceName} setDeviceName={setDeviceName}
            connectedPeers={connectedPeers}
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
            deviceRole={deviceRole} setDeviceRole={setDeviceRole}
            deviceName={deviceName} setDeviceName={setDeviceName}
            connectedPeers={connectedPeers}
          />
        )}
      </div>
    </div>
  );
}

export default App;
