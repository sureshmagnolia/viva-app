import React, { useState, useRef } from 'react';
import { Wifi, FileText, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, Smartphone, HelpCircle, Terminal, Trash2, RotateCw } from 'lucide-react';
import { mergeStudentData } from '../utils/mergeUtils';

function SyncTab({ 
  peerStatus, 
  statusMsg,
  roomCode, 
  isHost,
  initHostPeer, 
  joinPeerRoom, 
  disconnectPeer,
  p2pLogs = [],
  clearP2pLogs,
  projectDetails, setProjectDetails, projectStudents, setProjectStudents,
  compDetails, setCompDetails, compStudents, setCompStudents,
  deviceRole = 'ex1', setDeviceRole = () => {},
  deviceName = 'My PC', setDeviceName = () => {},
  connectedPeers = {}
}) {
  const [activeSubTab, setActiveSubTab] = useState('p2p'); // 'p2p' | 'json'
  const [joinInput, setJoinInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [showNetworkGuide, setShowNetworkGuide] = useState(false);

  // JSON Merge State
  const fileInputRef = useRef(null);
  const [jsonAppTarget, setJsonAppTarget] = useState('project'); // 'project' | 'comp'
  const [jsonMergeRole, setJsonMergeRole] = useState('all');

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyDebugLogs = () => {
    const logText = p2pLogs.join('\n');
    navigator.clipboard.writeText(logText);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const forceCacheClearReload = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('v', Date.now());
    window.location.href = url.toString();
  };

  // Smart JSON File Import
  const handleSmartJsonImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target.result);
        if (jsonAppTarget === 'project') {
          const rawStudents = Array.isArray(raw.students) ? raw.students : (raw.s || []);
          const mergedStudents = mergeStudentData(projectStudents, rawStudents, 'ProjectVivaApp', jsonMergeRole);
          setProjectStudents(mergedStudents);
          alert(`Project Viva data merged successfully (${rawStudents.length} records)!`);
        } else {
          const rawStudents = Array.isArray(raw.students) ? raw.students : (raw.s || []);
          const mergedStudents = mergeStudentData(compStudents, rawStudents, 'ComprehensiveVivaApp', jsonMergeRole);
          setCompStudents(mergedStudents);
          alert(`Comprehensive Viva data merged successfully (${rawStudents.length} records)!`);
        }
      } catch (_err) {
        alert('Invalid JSON file format.');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', background: '#1e1e2e', color: '#fff', borderRadius: '16px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Wifi color="#38bdf8" size={32} />
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Multi-Device Sync & Merge
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Establish a live connection once, then freely enter marks across Project Viva and Comprehensive Viva tabs.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={forceCacheClearReload}
            style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
            title="Bypass browser cache and load the latest build version"
          >
            <RotateCw size={14} /> Force Load Latest Build
          </button>

          {peerStatus === 'connected' && (
            <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#4ade80', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></span>
              Background Sync Active (Room: {roomCode})
            </div>
          )}
        </div>
      </div>

      {/* Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '10px' }}>
        <button
          className={`tab-btn ${activeSubTab === 'p2p' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('p2p')}
          style={{ flex: 1, padding: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Wifi size={18} /> Live WebRTC P2P & HTTPS Cloud Room
        </button>
        <button
          className={`tab-btn ${activeSubTab === 'json' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('json')}
          style={{ flex: 1, padding: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <FileText size={18} /> Smart JSON File Merge
        </button>
      </div>

      {/* 1. WEBRTC P2P TAB */}
      {activeSubTab === 'p2p' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* DEVICE ROLE SELECTION CARD */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.25rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>👤 Device Role & Identification</span>
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PC Label:</span>
                <input 
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '0.8rem', width: '110px' }}
                />
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 1rem 0' }}>
              Select which role this computer will perform to prevent editing conflicts with other connected devices in the room.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <label htmlFor="deviceRoleSelect" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#e2e8f0' }}>
                Select Role:
              </label>
              <select
                id="deviceRoleSelect"
                value={deviceRole}
                onChange={(e) => setDeviceRole(e.target.value)}
                style={{
                  background: deviceRole === 'ex1' ? '#15803d' : deviceRole === 'ex2' ? '#1d4ed8' : '#7c3aed',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  minWidth: '220px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  outline: 'none'
                }}
              >
                <option value="ex1" style={{ background: '#1e1b4b', color: '#4ade80' }}>
                  Examiner 1 (Edits Examiner 1 Marks)
                </option>
                <option value="ex2" style={{ background: '#1e1b4b', color: '#60a5fa' }}>
                  Examiner 2 (Edits Examiner 2 Marks)
                </option>
                <option value="viewer" style={{ background: '#1e1b4b', color: '#c084fc' }}>
                  Chairman / Viewer (Read-Only Monitoring)
                </option>
              </select>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                {deviceRole === 'ex1' && '• Configured to enter Examiner 1 marks'}
                {deviceRole === 'ex2' && '• Configured to enter Examiner 2 marks'}
                {deviceRole === 'viewer' && '• Monitoring & Read-only mode'}
              </span>
            </div>
          </div>

          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '1rem', borderRadius: '10px', fontSize: '0.9rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              💡 <b>How it works:</b> Create or Join a Room below using a 6-character code. Once connected, <b>navigate to Project Viva or Comprehensive Viva tabs</b> to enter marks. All entries sync automatically!
            </div>
            <button 
              onClick={() => setShowNetworkGuide(!showNetworkGuide)} 
              style={{ background: 'rgba(234, 179, 8, 0.2)', border: '1px solid #eab308', color: '#fde047', padding: '4px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
            >
              <HelpCircle size={14} /> Wi-Fi Troubleshooting Tip
            </button>
          </div>

          {showNetworkGuide && (
            <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.4)', padding: '1.25rem', borderRadius: '12px', color: '#fef08a', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.95rem', color: '#fde047' }}>
                <Smartphone size={20} /> College Wi-Fi / Connection Help:
              </div>
              <p style={{ margin: 0 }}>
                If devices stay stuck on <b>"Connecting to Room..."</b>, your College/Campus Wi-Fi network has <i>AP Client Isolation</i> enabled, which blocks direct computer-to-computer connections.
              </p>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', marginTop: '4px' }}>
                <b>Recommended Quick Fix:</b>
                <ol style={{ margin: '6px 0 0 1.2rem', padding: 0 }}>
                  <li>Turn on <b>Portable Hotspot</b> on your mobile phone.</li>
                  <li>Connect both laptops (Host and Partner) to your Mobile Hotspot.</li>
                  <li>Re-enter the 6-character Room Code! Connections will establish instantly.</li>
                </ol>
              </div>
            </div>
          )}

          {peerStatus === 'disconnected' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8' }}>Host Examiner (Create Room)</h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>Generate a room code to share with your co-examiner.</p>
                <button className="btn btn-primary" onClick={initHostPeer} style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 600 }}>
                  Create Sync Room
                </button>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#c084fc' }}>Join Examiner (Enter Room)</h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Enter the 6-character room code from host device.</p>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. X9K2L4"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', textAlign: 'center', letterSpacing: '3px', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.75rem' }}
                />
                <button className="btn btn-secondary" onClick={() => joinPeerRoom(joinInput)} style={{ width: '100%', padding: '10px', fontSize: '0.95rem' }}>
                  Connect to Room
                </button>
              </div>
            </div>
          )}

          {(peerStatus === 'connecting' || peerStatus === 'connected') && (
            <div style={{ background: peerStatus === 'connected' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)', border: `1px solid ${peerStatus === 'connected' ? '#22c55e' : '#eab308'}`, padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
              {roomCode && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Shared Room Code:</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '6px' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '4px', color: '#38bdf8' }}>{roomCode}</span>
                    <button onClick={copyRoomCode} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px 12px', borderRadius: '6px' }}>
                      {copiedCode ? <Check color="#22c55e" size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem', color: peerStatus === 'connected' ? '#4ade80' : '#fde047', fontWeight: 600 }}>
                {peerStatus === 'connected' ? <CheckCircle2 size={20} /> : <RefreshCw className="spin" size={20} />}
                <span>{statusMsg}</span>
              </div>

              {peerStatus === 'connecting' && (
                <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: '#fef08a', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px', display: 'inline-block' }}>
                  💡 <i>{isHost ? 'Hosting Room over WebRTC & HTTPS Cloud Relay...' : 'Connecting over WebRTC & HTTPS Cloud Relay...'}</i>
                </div>
              )}

              {peerStatus === 'connected' && (
                <>
                  <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '1rem' }}>
                    ✅ <b>Connected!</b> You can now navigate to <b>Project Viva</b> or <b>Comprehensive Viva</b> tabs above to enter marks. Background sync is running!
                  </p>

                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '10px', marginTop: '1rem', textAlign: 'left' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px' }}>
                      🖥️ Active Room Devices Roster:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', padding: '5px 12px', borderRadius: '6px', fontSize: '0.8rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></span>
                        <strong>{deviceName} (This PC)</strong>: {deviceRole === 'ex1' ? 'Examiner 1' : deviceRole === 'ex2' ? 'Examiner 2' : 'Chairman / Viewer'}
                      </div>
                      {Object.entries(connectedPeers).map(([key, peer]) => (
                        <div key={key} style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', padding: '5px 12px', borderRadius: '6px', fontSize: '0.8rem', color: '#7dd3fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }}></span>
                          <strong>{peer.name || key}</strong>: {peer.role === 'ex1' ? 'Examiner 1' : peer.role === 'ex2' ? 'Examiner 2' : 'Chairman / Viewer'}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button className="btn btn-danger" onClick={disconnectPeer} style={{ marginTop: '1.25rem', padding: '8px 20px' }}>
                Disconnect Sync Session
              </button>
            </div>
          )}

          {peerStatus === 'error' && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '1.25rem', borderRadius: '10px', color: '#fca5a5' }}>
              <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
              {statusMsg}
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={disconnectPeer} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>Reset Connection</button>
                <button className="btn btn-secondary" onClick={() => setShowNetworkGuide(true)} style={{ fontSize: '0.85rem', padding: '6px 14px', background: 'rgba(234, 179, 8, 0.2)', color: '#fde047' }}>View Hotspot Guide</button>
              </div>
            </div>
          )}

          {/* DIAGNOSTIC LOG CONSOLE */}
          <div style={{ marginTop: '1rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#38bdf8', fontWeight: 'bold' }}>
                <Terminal size={16} /> Real-time Sync Diagnostic Logs ({p2pLogs.length})
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  onClick={copyDebugLogs} 
                  disabled={p2pLogs.length === 0}
                  style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {copiedLogs ? <Check size={12} /> : <Copy size={12} />}
                  {copiedLogs ? 'Copied!' : 'Copy Console Logs'}
                </button>
                {clearP2pLogs && (
                  <button 
                    onClick={clearP2pLogs} 
                    disabled={p2pLogs.length === 0}
                    style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ padding: '10px', maxHeight: '180px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.78rem', color: '#a5f3fc', lineHeight: '1.5' }}>
              {p2pLogs.length === 0 ? (
                <span style={{ color: '#64748b' }}>No connection logs captured yet. Click "Create Sync Room" or "Connect to Room" to begin tracing.</span>
              ) : (
                p2pLogs.map((log, i) => (
                  <div key={i} style={{ borderBottom: '1px dashed rgba(255,255,255,0.05)', padding: '2px 0' }}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* 2. SMART FILE MERGE TAB */}
      {activeSubTab === 'json' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>
            Import a JSON file exported from your co-examiner's device. The app will automatically merge their scores into your list by Register Number.
          </p>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>Target App:</label>
              <select value={jsonAppTarget} onChange={(e) => setJsonAppTarget(e.target.value)} style={{ padding: '8px', borderRadius: '6px', background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                <option value="project">Project Viva Marks</option>
                <option value="comp">Comprehensive Viva Marks</option>
              </select>

              <label style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600, marginLeft: 'auto' }}>Merge Role:</label>
              <select value={jsonMergeRole} onChange={(e) => setJsonMergeRole(e.target.value)} style={{ padding: '8px', borderRadius: '6px', background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                <option value="all">Auto-Merge All Matching Students</option>
                <option value="ex1">Merge ONLY Examiner 1 Marks</option>
                <option value="ex2">Merge ONLY Examiner 2 Marks</option>
              </select>
            </div>

            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleSmartJsonImport}
              style={{ display: 'none' }}
            />

            <button className="btn btn-primary" onClick={() => fileInputRef.current.click()} style={{ padding: '12px', fontSize: '0.95rem' }}>
              Select & Smart Merge JSON File
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default SyncTab;
