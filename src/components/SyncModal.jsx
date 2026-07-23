import React, { useState, useEffect, useRef } from 'react';
import { X, Wifi, QrCode, FileText, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, Camera } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import Peer from 'peerjs';
import { createCompressedPayload, decompressAndMergePayload, mergeStudentData } from '../utils/mergeUtils';

function SyncModal({ isOpen, onClose, details, setDetails, students, setStudents, appType }) {
  const [activeTab, setActiveTab] = useState('p2p'); // 'p2p' | 'qr' | 'json'
  
  // Role selection
  const [myRole, setMyRole] = useState('ex1'); // 'ex1' | 'ex2'

  // P2P State
  const [roomCode, setRoomCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [peerStatus, setPeerStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [statusMsg, setStatusMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const peerRef = useRef(null);
  const connRef = useRef(null);
  const isIncomingSyncRef = useRef(false);

  // QR State
  const [qrPayloadString, setQrPayloadString] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');
  const scannerRef = useRef(null);

  // JSON Merge State
  const fileInputRef = useRef(null);
  const [jsonMergeRole, setJsonMergeRole] = useState('auto'); // 'auto' | 'ex1' | 'ex2' | 'all'

  // -------------------------------------------------------------
  // P2P LOGIC (PeerJS)
  // -------------------------------------------------------------
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

    const peerId = `vivamarks-${appType.toLowerCase()}-${code}`;
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

    const peer = new Peer(null, { debug: 1 });
    peerRef.current = peer;

    peer.on('open', () => {
      const hostPeerId = `vivamarks-${appType.toLowerCase()}-${cleanCode}`;
      const conn = peer.connect(hostPeerId);
      connRef.current = conn;
      setupConnectionHandlers(conn);
    });

    peer.on('error', () => {
      setPeerStatus('error');
      setStatusMsg(`Connection failed: Check Room Code or Wi-Fi connection.`);
    });
  };

  const setupConnectionHandlers = (conn) => {
    conn.on('open', () => {
      setPeerStatus('connected');
      setStatusMsg('Connected! Syncing marks live across devices.');
      // Send initial sync state
      sendStateOverP2P(details, students);
    });

    conn.on('data', (data) => {
      if (data && data.type === 'SYNC_STATE') {
        isIncomingSyncRef.current = true;
        try {
          const mergedDetails = { ...details, ...(data.details || {}) };
          const mergedStudents = mergeStudentData(students, data.students, appType, 'all');
          
          setDetails(mergedDetails);
          setStudents(mergedStudents);
          setStatusMsg(`Synced update received at ${new Date().toLocaleTimeString()}`);
        } catch (e) {
          console.error('Failed to parse incoming peer state', e);
        } finally {
          setTimeout(() => { isIncomingSyncRef.current = false; }, 100);
        }
      }
    });

    conn.on('close', () => {
      setPeerStatus('disconnected');
      setStatusMsg('Peer connection closed.');
    });

    conn.on('error', (err) => {
      setPeerStatus('error');
      setStatusMsg(`P2P error: ${err.message}`);
    });
  };

  const sendStateOverP2P = (d, s) => {
    if (connRef.current && connRef.current.open && !isIncomingSyncRef.current) {
      connRef.current.send({
        type: 'SYNC_STATE',
        details: d,
        students: s,
        timestamp: Date.now()
      });
    }
  };

  // Broadcast P2P state on details/students change when connected
  useEffect(() => {
    if (peerStatus === 'connected') {
      sendStateOverP2P(details, students);
    }
  }, [details, students, peerStatus]);

  const disconnectPeer = () => {
    if (connRef.current) connRef.current.close();
    if (peerRef.current) peerRef.current.destroy();
    setPeerStatus('disconnected');
    setRoomCode('');
    setStatusMsg('');
  };

  // -------------------------------------------------------------
  // QR CODE LOGIC
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab === 'qr') {
      const payload = createCompressedPayload(details, students, appType, myRole);
      setQrPayloadString(JSON.stringify(payload));
    }
  }, [activeTab, details, students, appType, myRole]);

  const startQrScanner = () => {
    setIsScanning(true);
    setScanError('');
    setScanSuccess('');

    setTimeout(() => {
      const html5QrcodeScanner = new Html5Qrcode("qr-reader-container");
      scannerRef.current = html5QrcodeScanner;

      html5QrcodeScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          try {
            const parsed = JSON.parse(decodedText);
            const { details: newDetails, students: newStudents, role } = decompressAndMergePayload(parsed, students, details, appType);
            
            setDetails(newDetails);
            setStudents(newStudents);
            
            setScanSuccess(`Successfully merged ${role === 'ex1' ? 'Examiner 1' : role === 'ex2' ? 'Examiner 2' : ''} marks!`);
            stopQrScanner();
          } catch (err) {
            setScanError(`QR Scan Error: ${err.message}`);
          }
        },
        () => {
          // Silent scan error framing
        }
      ).catch(() => {
        setScanError('Unable to access camera. Please allow camera permissions.');
        setIsScanning(false);
      });
    }, 200);
  };

  const stopQrScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
        setIsScanning(false);
      }).catch(err => {
        console.error("Failed to stop scanner", err);
        setIsScanning(false);
      });
    } else {
      setIsScanning(false);
    }
  };

  // -------------------------------------------------------------
  // JSON SMART MERGE LOGIC
  // -------------------------------------------------------------
  const handleSmartJsonImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target.result);
        let importedStudents = [];
        let importedDetails = {};
        let roleToMerge = jsonMergeRole;

        if (raw.app === appType && Array.isArray(raw.students)) {
          importedStudents = raw.students;
          importedDetails = raw.details || {};
        } else if (raw.v === 1 && raw.app === appType) {
          // Unpack compressed payload
          const res = decompressAndMergePayload(raw, students, details, appType);
          setDetails(res.details);
          setStudents(res.students);
          alert(`Successfully merged JSON backup data!`);
          return;
        } else {
          alert('Error: File does not match current app format.');
          return;
        }

        if (roleToMerge === 'auto') {
          roleToMerge = 'all';
        }

        const mergedStudents = mergeStudentData(students, importedStudents, appType, roleToMerge);
        const mergedDetails = {
          centre: details.centre || importedDetails.centre || '',
          date: details.date || importedDetails.date || '',
          courseCode: details.courseCode || importedDetails.courseCode || ''
        };

        setDetails(mergedDetails);
        setStudents(mergedStudents);
        alert(`Smart merge completed! Merged data for ${importedStudents.length} students.`);
      } catch (err) {
        alert('Invalid JSON file format.');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content glass-panel" style={{ width: '90%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', background: '#1e1e2e', color: '#fff', borderRadius: '16px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wifi color="#38bdf8" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Multi-Examiner Sync & Merge</h2>
          </div>
          <button 
            onClick={() => { stopQrScanner(); onClose(); }}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Sync Mode Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
          <button
            className={`tab-btn ${activeTab === 'p2p' ? 'active' : ''}`}
            onClick={() => { stopQrScanner(); setActiveTab('p2p'); }}
            style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Wifi size={16} /> WebRTC P2P Sync
          </button>
          <button
            className={`tab-btn ${activeTab === 'qr' ? 'active' : ''}`}
            onClick={() => { setActiveTab('qr'); }}
            style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <QrCode size={16} /> Offline QR Merge
          </button>
          <button
            className={`tab-btn ${activeTab === 'json' ? 'active' : ''}`}
            onClick={() => { stopQrScanner(); setActiveTab('json'); }}
            style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <FileText size={16} /> Smart JSON Merge
          </button>
        </div>

        {/* TAB 1: WEBRTC P2P LIVE SYNC */}
        {activeTab === 'p2p' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
              Connect two devices over Wi-Fi or mobile hotspot. Marks entered by either examiner will sync <b>instantly in real time</b> across both screens.
            </p>

            {peerStatus === 'disconnected' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '1.25rem', borderRadius: '12px', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8' }}>Host P2P Room</h4>
                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '1rem' }}>Create a room code and share it with your co-examiner.</p>
                  <button className="btn btn-primary" onClick={initHostPeer} style={{ width: '100%' }}>
                    Create Room
                  </button>
                </div>

                <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '1.25rem', borderRadius: '12px', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#c084fc' }}>Join P2P Room</h4>
                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.75rem' }}>Enter room code from host examiner device.</p>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. A8K9X2"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', textAlign: 'center', letterSpacing: '2px', fontWeight: 'bold', marginBottom: '0.75rem' }}
                  />
                  <button className="btn btn-secondary" onClick={() => joinPeerRoom(joinCodeInput)} style={{ width: '100%' }}>
                    Join Room
                  </button>
                </div>
              </div>
            )}

            {(peerStatus === 'connecting' || peerStatus === 'connected') && (
              <div style={{ background: peerStatus === 'connected' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)', border: `1px solid ${peerStatus === 'connected' ? '#22c55e' : '#eab308'}`, padding: '1.25rem', borderRadius: '12px', textAlign: 'center' }}>
                {roomCode && (
                  <div style={{ marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Room Code:</span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '4px', color: '#38bdf8' }}>{roomCode}</span>
                      <button onClick={copyRoomCode} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                        {copiedCode ? <Check color="#22c55e" size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem', color: peerStatus === 'connected' ? '#4ade80' : '#fde047' }}>
                  {peerStatus === 'connected' ? <CheckCircle2 size={18} /> : <RefreshCw className="spin" size={18} />}
                  <span>{statusMsg}</span>
                </div>

                <button className="btn btn-danger" onClick={disconnectPeer} style={{ marginTop: '1rem', padding: '6px 16px', fontSize: '0.8rem' }}>
                  Disconnect P2P
                </button>
              </div>
            )}

            {peerStatus === 'error' && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '1rem', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
                <AlertCircle size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                {statusMsg}
                <div style={{ marginTop: '0.5rem' }}>
                  <button className="btn btn-secondary" onClick={disconnectPeer} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>Try Again</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OFFLINE QR CODE MERGE */}
        {activeTab === 'qr' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
              Use camera scanning to merge Examiner 1 and Examiner 2 scores directly screen-to-screen without internet.
            </p>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Select My Role on this Device:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="radio" name="myRole" value="ex1" checked={myRole === 'ex1'} onChange={() => setMyRole('ex1')} /> Examiner 1
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="radio" name="myRole" value="ex2" checked={myRole === 'ex2'} onChange={() => setMyRole('ex2')} /> Examiner 2
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="radio" name="myRole" value="all" checked={myRole === 'all'} onChange={() => setMyRole('all')} /> Both (All)
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              {/* Display QR Code */}
              <div style={{ background: '#fff', color: '#000', padding: '1rem', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e1e2e', fontSize: '0.9rem' }}>My Marks QR Code ({myRole.toUpperCase()})</h4>
                {qrPayloadString ? (
                  <QRCodeSVG value={qrPayloadString} size={160} level="M" />
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>Generating QR...</span>
                )}
                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem' }}>Let co-examiner scan this screen</span>
              </div>

              {/* Scan QR Code */}
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8', fontSize: '0.9rem' }}>Scan Partner QR Code</h4>
                
                {!isScanning ? (
                  <button className="btn btn-primary" onClick={startQrScanner} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 'auto' }}>
                    <Camera size={16} /> Open Camera Scanner
                  </button>
                ) : (
                  <div style={{ width: '100%' }}>
                    <div id="qr-reader-container" style={{ width: '100%', minHeight: '180px', background: '#000', borderRadius: '8px' }}></div>
                    <button className="btn btn-danger" onClick={stopQrScanner} style={{ marginTop: '0.5rem', padding: '4px 10px', fontSize: '0.75rem' }}>
                      Stop Camera
                    </button>
                  </div>
                )}

                {scanSuccess && (
                  <div style={{ color: '#4ade80', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    <CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {scanSuccess}
                  </div>
                )}
                {scanError && (
                  <div style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    {scanError}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SMART JSON MERGE */}
        {activeTab === 'json' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
              Import a JSON file exported from your co-examiner's device. The app will automatically merge their scores into your list by Register Number.
            </p>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Merge Field Target:</label>
              <select 
                value={jsonMergeRole} 
                onChange={(e) => setJsonMergeRole(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
              >
                <option value="auto">Auto-detect & Merge All Matching Student Data</option>
                <option value="ex1">Merge ONLY Examiner 1 Marks</option>
                <option value="ex2">Merge ONLY Examiner 2 Marks</option>
              </select>

              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleSmartJsonImport}
                style={{ display: 'none' }}
              />

              <button 
                className="btn btn-primary"
                onClick={() => fileInputRef.current.click()}
                style={{ padding: '10px 18px', marginTop: '0.5rem' }}
              >
                Select & Smart Merge JSON File
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default SyncModal;
