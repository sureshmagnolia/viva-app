import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import ProjectVivaApp from './ProjectVivaApp';
import ComprehensiveVivaApp from './ComprehensiveVivaApp';
import SyncTab from './components/SyncTab';
import './index.css';

// PeerJS signaling & WebRTC configuration with static IP & domain STUN/TURN relays
const PEER_OPTIONS = {
  debug: 2,
  config: {
    iceServers: [
      // Direct IP Google STUN servers (Bypasses DNS lookup blocking / Antivirus DNS shields!)
      { urls: 'stun:142.250.159.127:19302' },
      { urls: 'stun:74.125.200.127:19302' },
      { urls: 'stun:173.194.202.127:19302' },
      { urls: 'stun:74.125.250.129:19302' },
      // Domain STUN & TURN fallback
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelay',
        credential: 'openrelay'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelay',
        credential: 'openrelay'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
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
  // MULTI-DEVICE WEBRTC STAR-MESH P2P SYNC ENGINE WITH DETAILED LOGS
  // -------------------------------------------------------------
  const [roomCode, setRoomCode] = useState('');
  const [peerStatus, setPeerStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [statusMsg, setStatusMsg] = useState('');
  const [p2pLogs, setP2pLogs] = useState([]);

  const addP2pLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${msg}`;
    console.log(`[P2P DIAGNOSTIC] ${entry}`);
    setP2pLogs(prev => [entry, ...prev.slice(0, 49)]);
  };

  const clearP2pLogs = () => {
    setP2pLogs([]);
  };

  const peerRef = useRef(null);
  const isHostRef = useRef(false);
  const hostConnectionsRef = useRef(new Map()); // Host stores all connected guests
  const guestConnectionRef = useRef(null);      // Guest stores connection to Host

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const disconnectPeer = () => {
    addP2pLog('Disconnecting P2P sessions and destroying Peer instance...');
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
  };

  const attachWebRtcListeners = (conn, label) => {
    if (!conn) return;

    addP2pLog(`${label}: Registered DataConnection for peer: ${conn.peer}`);

    if (conn.peerConnection) {
      const pc = conn.peerConnection;
      addP2pLog(`${label}: Initial ICE State = ${pc.iceConnectionState}, Signaling = ${pc.signalingState}`);

      pc.oniceconnectionstatechange = () => {
        addP2pLog(`${label}: ICE Connection State changed -> ${pc.iceConnectionState}`);
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
    setPeerStatus('connecting');
    setStatusMsg('Creating Multi-Device P2P Room...');
    isHostRef.current = true;

    const hostPeerId = `viva-${code}`;
    addP2pLog(`Host: Initializing PeerJS with Host ID = ${hostPeerId}`);

    const peer = new Peer(hostPeerId, PEER_OPTIONS);
    peerRef.current = peer;

    peer.on('open', (id) => {
      addP2pLog(`Host: Connected to signaling server! Registered ID = ${id}`);
      setPeerStatus('connecting');
      setStatusMsg(`Room ready! Tell partners to enter code: ${code}`);
    });

    peer.on('connection', (conn) => {
      addP2pLog(`Host: Incoming connection attempt from guest peer: ${conn.peer}`);
      setupHostConnection(conn);
    });

    peer.on('error', (err) => {
      addP2pLog(`Host: Error (${err.type}): ${err.message}`);
      console.error('PeerJS Host Error:', err);
      setPeerStatus('error');
      setStatusMsg(`P2P Host Error (${err.type || 'unknown'}): ${err.message || 'Could not register room.'}`);
    });
  };

  const setupHostConnection = (conn) => {
    attachWebRtcListeners(conn, 'Host');

    const handleConnected = () => {
      hostConnectionsRef.current.set(conn.peer, conn);
      const totalDevices = hostConnectionsRef.current.size + 1;
      addP2pLog(`Host: DataChannel OPEN with guest ${conn.peer}! Total devices: ${totalDevices}`);
      setPeerStatus('connected');
      setStatusMsg(`Connected! ${totalDevices} devices synced in Room ${roomCode}`);

      // Send initial state to newly joined guest
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
        setStatusMsg(`Room active (${roomCode}). Waiting for devices...`);
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

    addP2pLog(`Guest: Initializing PeerJS client to join room: ${cleanCode}`);
    const peer = new Peer(PEER_OPTIONS);
    peerRef.current = peer;

    peer.on('open', (myId) => {
      const hostPeerId = `viva-${cleanCode}`;
      addP2pLog(`Guest: Registered with signaling server! My ID = ${myId}`);
      addP2pLog(`Guest: Initiating connection to host peer = ${hostPeerId}...`);
      
      const conn = peer.connect(hostPeerId);
      guestConnectionRef.current = conn;
      setupGuestConnection(conn);
    });

    peer.on('error', (err) => {
      addP2pLog(`Guest: Error (${err.type}): ${err.message}`);
      console.error('PeerJS Guest Error:', err);
      setPeerStatus('error');
      setStatusMsg(`Connection error (${err.type || 'unknown'}): ${err.message || 'Host room not found or connection failed.'}`);
    });
  };

  const setupGuestConnection = (conn) => {
    attachWebRtcListeners(conn, 'Guest');

    const handleConnected = () => {
      addP2pLog(`Guest: DataChannel OPEN with host ${conn.peer}! Synchronized.`);
      setPeerStatus('connected');
      setStatusMsg(`Connected to Room ${roomCode}! Multi-device background sync active.`);
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
      // Host sends payload to ALL connected guests
      hostConnectionsRef.current.forEach(conn => {
        if (conn.open) conn.send(payload);
      });
    } else if (guestConnectionRef.current && guestConnectionRef.current.open) {
      // Guest sends payload to Host (Host relays to all other guests)
      guestConnectionRef.current.send(payload);
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
            <span style={{ marginLeft: '6px', background: '#22c55e', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px' }}>
              Room {roomCode}
            </span>
          )}
        </button>
      </nav>

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
