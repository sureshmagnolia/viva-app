import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import ProjectVivaApp from './ProjectVivaApp';
import ComprehensiveVivaApp from './ComprehensiveVivaApp';
import SyncTab from './components/SyncTab';
import './index.css';

// Build version for cache verification
const APP_VERSION = "v1.3.0 (ntfy.sh HTTPS Relay)";

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
  // DUAL-ENGINE SYNC: WEBRTC P2P + NTFY.SH HTTPS CLOUD RELAY FALLBACK
  // -------------------------------------------------------------
  const [roomCode, setRoomCode] = useState('');
  const [peerStatus, setPeerStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [statusMsg, setStatusMsg] = useState('');
  const [p2pLogs, setP2pLogs] = useState([]);
  const [syncMode, setSyncMode] = useState('p2p'); // 'p2p' | 'https'

  const activeRoomCodeRef = useRef('');
  const lastHttpsTsRef = useRef(0);
  const cloudPollingIntervalRef = useRef(null);

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
  };

  // HTTPS Cloud Relay API (ntfy.sh - 100% free, CORS-enabled HTTPS relay)
  const pushToHttpsCloud = async (pd, ps, cd, cs, codeOverride) => {
    const targetCode = codeOverride || activeRoomCodeRef.current || roomCode;
    if (!targetCode) return;

    const url = `https://ntfy.sh/viva_room_${targetCode}`;
    const payload = {
      type: 'GLOBAL_SYNC_STATE',
      projectDetails: pd,
      projectStudents: ps,
      compDetails: cd,
      compStudents: cs,
      timestamp: Date.now()
    };
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      lastHttpsTsRef.current = payload.timestamp;
      addP2pLog(`HTTPS Cloud: Room data published for Room ${targetCode} over TLS port 443`);
    } catch (e) {
      addP2pLog(`HTTPS Cloud Push Error: ${e.message}`);
    }
  };

  const startHttpsCloudListening = (codeOverride) => {
    const targetCode = codeOverride || activeRoomCodeRef.current || roomCode;
    if (!targetCode) return;

    if (cloudPollingIntervalRef.current) clearInterval(cloudPollingIntervalRef.current);
    addP2pLog(`HTTPS Cloud: Activating HTTPS REST Relay listener for Room ${targetCode}...`);

    cloudPollingIntervalRef.current = setInterval(async () => {
      try {
        const url = `https://ntfy.sh/viva_room_${targetCode}/json?poll=1`;
        const res = await fetch(url);
        if (res.ok) {
          const text = await res.text();
          const lines = text.trim().split('\n');
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              if (!lines[i].trim()) continue;
              const msg = JSON.parse(lines[i]);
              if (msg.event === 'message' && msg.message) {
                const data = JSON.parse(msg.message);
                if (data && data.timestamp && data.timestamp > lastHttpsTsRef.current) {
                  lastHttpsTsRef.current = data.timestamp;
                  isInternalHistoryChangeRef.current = true;
                  try {
                    if (data.projectDetails) setProjectDetails(data.projectDetails);
                    if (data.projectStudents) setProjectStudents(data.projectStudents);
                    if (data.compDetails) setCompDetails(data.compDetails);
                    if (data.compStudents) setCompStudents(data.compStudents);

                    setPeerStatus('connected');
                    setSyncMode('https');
                    setStatusMsg(`Connected via HTTPS Cloud Relay (Room ${targetCode})`);
                    addP2pLog(`HTTPS Cloud: Synced state update received for Room ${targetCode}`);
                  } finally {
                    setTimeout(() => { isInternalHistoryChangeRef.current = false; }, 100);
                  }
                  break;
                }
              }
            } catch (_err) {
              // skip unparseable line
            }
          }
        }
      } catch (err) {
        addP2pLog(`HTTPS Cloud Listen Error: ${err.message}`);
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
          addP2pLog(`${label}: WebRTC blocked by router firewall. Activating HTTPS Cloud Relay fallback...`);
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
    setStatusMsg('Creating Multi-Device Room...');
    isHostRef.current = true;
    setSyncMode('p2p');

    const hostPeerId = `viva-${code}`;
    addP2pLog(`Host: Initializing PeerJS with Host ID = ${hostPeerId}`);
    addP2pLog(`Host: App Version = ${APP_VERSION}`);

    const peer = new Peer(hostPeerId, PEER_OPTIONS);
    peerRef.current = peer;

    peer.on('open', (id) => {
      addP2pLog(`Host: Connected to signaling server! Registered ID = ${id}`);
      setPeerStatus('connecting');
      setStatusMsg(`Room ready! Tell partners to enter code: ${code}`);

      // Publish initial state to HTTPS Cloud Relay
      pushToHttpsCloud(projectDetails, projectStudents, compDetails, compStudents, code);
      // Start fallback listener
      startHttpsCloudListening(code);
    });

    peer.on('connection', (conn) => {
      addP2pLog(`Host: Incoming connection attempt from guest peer: ${conn.peer}`);
      setupHostConnection(conn);
    });

    peer.on('error', (err) => {
      addP2pLog(`Host: P2P Error (${err.type}): ${err.message}. Enabling HTTPS Cloud Relay...`);
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
        addP2pLog(`Host: Received state packet from ${conn.peer}. Relaying to guests...`);
        isInternalHistoryChangeRef.current = true;
        try {
          if (data.projectDetails) setProjectDetails(data.projectDetails);
          if (data.projectStudents) setProjectStudents(data.projectStudents);
          if (data.compDetails) setCompDetails(data.compDetails);
          if (data.compStudents) setCompStudents(data.compStudents);

          // Relay to ALL OTHER connected guest devices in the room!
          hostConnectionsRef.current.forEach((otherConn, peerId) => {
            if (peerId !== conn.peer && otherConn.open) {
              otherConn.send(data);
            }
          });

          const totalDevices = hostConnectionsRef.current.size + 1;
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

    setPeerStatus('connecting');
    setStatusMsg(`Connecting to Room ${cleanCode}...`);
    setRoomCode(cleanCode);
    activeRoomCodeRef.current = cleanCode;

    addP2pLog(`Guest: Initializing PeerJS client to join room: ${cleanCode}`);
    addP2pLog(`Guest: App Version = ${APP_VERSION}`);

    const peer = new Peer(PEER_OPTIONS);
    peerRef.current = peer;

    // Start HTTPS Cloud Relay listener immediately as fallback in case WebRTC fails
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
      addP2pLog(`Guest: WebRTC Error (${err.type}): ${err.message}. Using HTTPS Cloud Relay fallback!`);
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
          if (data.projectDetails) setProjectDetails(data.projectDetails);
          if (data.projectStudents) setProjectStudents(data.projectStudents);
          if (data.compDetails) setCompDetails(data.compDetails);
          if (data.compStudents) setCompStudents(data.compStudents);

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
      setPeerStatus('disconnected');
      setStatusMsg('Disconnected from P2P Room.');
    });

    conn.on('error', (err) => {
      addP2pLog(`Guest: Connection Error: ${err.message}`);
    });
  };

  const sendStateToConn = (conn, pd, ps, cd, cs) => {
    if (conn && conn.open) {
      conn.send({
        type: 'GLOBAL_SYNC_STATE',
        projectDetails: pd,
        projectStudents: ps,
        compDetails: cd,
        compStudents: cs,
        timestamp: Date.now()
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
  useEffect(() => {
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
              {syncMode === 'p2p' ? `Room ${roomCode}` : `HTTPS ${roomCode}`}
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
            roomCode={roomCode}
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
