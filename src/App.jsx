import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import ProjectVivaApp from './ProjectVivaApp';
import ComprehensiveVivaApp from './ComprehensiveVivaApp';
import SyncTab from './components/SyncTab';
import { mergeStudentData } from './utils/mergeUtils';
import './index.css';

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

      // Broadcast hard snapshot sync to P2P peer
      broadcastGlobalState(targetSnapshot.pd, targetSnapshot.ps, targetSnapshot.cd, targetSnapshot.cs, true);

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

      // Broadcast hard snapshot sync to P2P peer
      broadcastGlobalState(targetSnapshot.pd, targetSnapshot.ps, targetSnapshot.cd, targetSnapshot.cs, true);

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
  // GLOBAL BACKGROUND WEBRTC P2P SYNC ENGINE
  // -------------------------------------------------------------
  const [roomCode, setRoomCode] = useState('');
  const [peerStatus, setPeerStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [statusMsg, setStatusMsg] = useState('');

  const peerRef = useRef(null);
  const connRef = useRef(null);

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const initHostPeer = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setPeerStatus('connecting');
    setStatusMsg('Creating P2P Room...');

    const peerId = `vivamarks-global-${code}`;
    const peer = new Peer(peerId, { debug: 1 });
    peerRef.current = peer;

    peer.on('open', () => {
      setPeerStatus('connecting');
      setStatusMsg(`Room ready! Tell partner to enter code: ${code}`);
    });

    peer.on('connection', (conn) => {
      connRef.current = conn;
      setupConnectionHandlers(conn);
    });

    peer.on('error', (err) => {
      setPeerStatus('error');
      setStatusMsg(`P2P Error: ${err.type || err.message}`);
    });
  };

  const joinPeerRoom = (codeToJoin) => {
    const cleanCode = codeToJoin.trim().toUpperCase();
    if (!cleanCode || cleanCode.length !== 6) {
      alert('Please enter a valid 6-character Room Code.');
      return;
    }

    setPeerStatus('connecting');
    setStatusMsg(`Connecting to Room ${cleanCode}...`);
    setRoomCode(cleanCode);

    const peer = new Peer(null, { debug: 1 });
    peerRef.current = peer;

    peer.on('open', () => {
      const hostPeerId = `vivamarks-global-${cleanCode}`;
      const conn = peer.connect(hostPeerId);
      connRef.current = conn;
      setupConnectionHandlers(conn);
    });

    peer.on('error', () => {
      setPeerStatus('error');
      setStatusMsg(`Connection failed: Check Room Code or Wi-Fi network.`);
    });
  };

  const setupConnectionHandlers = (conn) => {
    conn.on('open', () => {
      setPeerStatus('connected');
      setStatusMsg('Connected! Background sync is live across all tabs.');
      // Broadcast initial full state
      broadcastGlobalState(projectDetails, projectStudents, compDetails, compStudents);
    });

    conn.on('data', (data) => {
      if (data && data.type === 'GLOBAL_SYNC_STATE') {
        isInternalHistoryChangeRef.current = true;
        try {
          // Direct 1-to-1 state mirroring across connected devices
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
      setPeerStatus('disconnected');
      setStatusMsg('P2P connection closed.');
    });

    conn.on('error', (err) => {
      setPeerStatus('error');
      setStatusMsg(`P2P Error: ${err.message}`);
    });
  };

  const broadcastGlobalState = (pd, ps, cd, cs, isHardReset = false) => {
    if (connRef.current && connRef.current.open && !isInternalHistoryChangeRef.current) {
      connRef.current.send({
        type: 'GLOBAL_SYNC_STATE',
        isHardReset,
        projectDetails: pd,
        projectStudents: ps,
        compDetails: cd,
        compStudents: cs,
        timestamp: Date.now()
      });
    }
  };

  // Broadcast state changes whenever local states change while connected
  useEffect(() => {
    if (peerStatus === 'connected') {
      broadcastGlobalState(projectDetails, projectStudents, compDetails, compStudents);
    }
  }, [projectDetails, projectStudents, compDetails, compStudents, peerStatus]);

  const handleResetDataWrapper = (appSource) => {
    if (appSource === 'project') {
      const defaultDetails = { centre: '', date: '', courseCode: '' };
      const defaultStudents = [];
      setProjectDetails(defaultDetails);
      setProjectStudents(defaultStudents);
      broadcastGlobalState(defaultDetails, defaultStudents, compDetails, compStudents, true);
    } else if (appSource === 'comp') {
      const defaultDetails = { centre: '', date: '', courseCode: 'Viva Voce / BOT4V01' };
      const defaultStudents = [];
      setCompDetails(defaultDetails);
      setCompStudents(defaultStudents);
      broadcastGlobalState(projectDetails, projectStudents, defaultDetails, defaultStudents, true);
    }
  };

  const disconnectPeer = () => {
    if (connRef.current) connRef.current.close();
    if (peerRef.current) peerRef.current.destroy();
    setPeerStatus('disconnected');
    setRoomCode('');
    setStatusMsg('');
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
