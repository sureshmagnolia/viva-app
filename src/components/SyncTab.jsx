import React, { useState, useEffect, useRef } from 'react';
import { Wifi, QrCode, FileText, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, Camera } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { createCompressedPayload, decompressAndMergePayload, mergeStudentData } from '../utils/mergeUtils';

function SyncTab({ 
  peerStatus, 
  statusMsg, 
  roomCode, 
  initHostPeer, 
  joinPeerRoom, 
  disconnectPeer,
  projectDetails, setProjectDetails, projectStudents, setProjectStudents,
  compDetails, setCompDetails, compStudents, setCompStudents
}) {
  const [activeSubTab, setActiveSubTab] = useState('p2p'); // 'p2p' | 'qr' | 'json'
  const [joinInput, setJoinInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // QR Code State
  const [qrAppType, setQrAppType] = useState('ProjectVivaApp'); // 'ProjectVivaApp' | 'ComprehensiveVivaApp'
  const [myRole, setMyRole] = useState('ex1'); // 'ex1' | 'ex2' | 'all'
  const [qrPayloadString, setQrPayloadString] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');
  const scannerRef = useRef(null);

  // JSON Merge State
  const fileInputRef = useRef(null);
  const [jsonAppTarget, setJsonAppTarget] = useState('project'); // 'project' | 'comp'
  const [jsonMergeRole, setJsonMergeRole] = useState('all');

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Generate QR payload
  useEffect(() => {
    if (activeSubTab === 'qr') {
      const details = qrAppType === 'ProjectVivaApp' ? projectDetails : compDetails;
      const students = qrAppType === 'ProjectVivaApp' ? projectStudents : compStudents;
      const payload = createCompressedPayload(details, students, qrAppType, myRole);
      setQrPayloadString(JSON.stringify(payload));
    }
  }, [activeSubTab, qrAppType, myRole, projectDetails, projectStudents, compDetails, compStudents]);

  // QR Scanner logic
  const startQrScanner = () => {
    setIsScanning(true);
    setScanError('');
    setScanSuccess('');

    setTimeout(() => {
      const html5QrcodeScanner = new Html5Qrcode("tab-qr-reader-container");
      scannerRef.current = html5QrcodeScanner;

      html5QrcodeScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          try {
            const parsed = JSON.parse(decodedText);
            if (parsed.app === 'ProjectVivaApp') {
              const res = decompressAndMergePayload(parsed, projectStudents, projectDetails, 'ProjectVivaApp');
              setProjectDetails(res.details);
              setProjectStudents(res.students);
              setScanSuccess(`Merged Examiner Project Viva marks!`);
            } else if (parsed.app === 'ComprehensiveVivaApp') {
              const res = decompressAndMergePayload(parsed, compStudents, compDetails, 'ComprehensiveVivaApp');
              setCompDetails(res.details);
              setCompStudents(res.students);
              setScanSuccess(`Merged Examiner Comprehensive Viva marks!`);
            } else {
              throw new Error('Unrecognized app QR data format.');
            }
            stopQrScanner();
          } catch (err) {
            setScanError(`QR Scan Error: ${err.message}`);
          }
        },
        () => {}
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
      }).catch(() => {
        setIsScanning(false);
      });
    } else {
      setIsScanning(false);
    }
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
      } catch (err) {
        alert('Invalid JSON file format.');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', background: '#1e1e2e', color: '#fff', borderRadius: '16px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Wifi color="#38bdf8" size={32} />
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Background Multi-Device Sync & Merge
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Establish a background P2P connection once, then freely switch between Project Viva and Comprehensive Viva tabs to enter marks.
            </p>
          </div>
        </div>

        {peerStatus === 'connected' && (
          <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#4ade80', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></span>
            Background Sync Active (Room: {roomCode})
          </div>
        )}
      </div>

      {/* Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '10px' }}>
        <button
          className={`tab-btn ${activeSubTab === 'p2p' ? 'active' : ''}`}
          onClick={() => { stopQrScanner(); setActiveSubTab('p2p'); }}
          style={{ flex: 1, padding: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Wifi size={18} /> WebRTC Live P2P Sync
        </button>
        <button
          className={`tab-btn ${activeSubTab === 'qr' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('qr')}
          style={{ flex: 1, padding: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <QrCode size={18} /> Offline QR Camera Merge
        </button>
        <button
          className={`tab-btn ${activeSubTab === 'json' ? 'active' : ''}`}
          onClick={() => { stopQrScanner(); setActiveSubTab('json'); }}
          style={{ flex: 1, padding: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <FileText size={18} /> Smart File Merge
        </button>
      </div>

      {/* 1. WEBRTC P2P TAB */}
      {activeSubTab === 'p2p' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '1rem', borderRadius: '10px', fontSize: '0.9rem', color: '#cbd5e1' }}>
            💡 <b>How it works:</b> Create or Join a P2P Room below. Once connected, <b>you can switch back to Project Viva or Comprehensive Viva tabs</b> and start entering marks. All mark entries on both devices will sync automatically in the background!
          </div>

          {peerStatus === 'disconnected' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8' }}>Host Examiner (Create Room)</h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>Generate a room code to share with your co-examiner.</p>
                <button className="btn btn-primary" onClick={initHostPeer} style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 600 }}>
                  Create P2P Room
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

              {peerStatus === 'connected' && (
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '1rem' }}>
                  ✅ <b>Connected!</b> You can now navigate to <b>Project Viva</b> or <b>Comprehensive Viva</b> tabs above to enter marks. Background sync is running!
                </p>
              )}

              <button className="btn btn-danger" onClick={disconnectPeer} style={{ marginTop: '1.25rem', padding: '8px 20px' }}>
                Disconnect P2P Session
              </button>
            </div>
          )}

          {peerStatus === 'error' && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '1.25rem', borderRadius: '10px', color: '#fca5a5' }}>
              <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
              {statusMsg}
              <div style={{ marginTop: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={disconnectPeer} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>Reset Connection</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. OFFLINE QR CODE TAB */}
      {activeSubTab === 'qr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>App Section:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
              <input type="radio" name="qrApp" value="ProjectVivaApp" checked={qrAppType === 'ProjectVivaApp'} onChange={() => setQrAppType('ProjectVivaApp')} /> Project Viva
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
              <input type="radio" name="qrApp" value="ComprehensiveVivaApp" checked={qrAppType === 'ComprehensiveVivaApp'} onChange={() => setQrAppType('ComprehensiveVivaApp')} /> Comprehensive Viva
            </label>

            <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600, marginLeft: 'auto' }}>Role:</span>
            <select value={myRole} onChange={(e) => setMyRole(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
              <option value="ex1">Examiner 1 Marks</option>
              <option value="ex2">Examiner 2 Marks</option>
              <option value="all">All Marks</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* Show QR */}
            <div style={{ background: '#fff', color: '#000', padding: '1.25rem', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e1e2e' }}>My Marks QR Code</h4>
              {qrPayloadString ? (
                <QRCodeSVG value={qrPayloadString} size={180} level="M" />
              ) : (
                <span>Generating QR...</span>
              )}
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem' }}>Let co-examiner scan this code</span>
            </div>

            {/* Scan QR */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.25rem', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8' }}>Scan Co-Examiner QR Code</h4>
              
              {!isScanning ? (
                <button className="btn btn-primary" onClick={startQrScanner} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', margin: 'auto' }}>
                  <Camera size={18} /> Open Camera Scanner
                </button>
              ) : (
                <div style={{ width: '100%' }}>
                  <div id="tab-qr-reader-container" style={{ width: '100%', minHeight: '200px', background: '#000', borderRadius: '8px' }}></div>
                  <button className="btn btn-danger" onClick={stopQrScanner} style={{ marginTop: '0.75rem', padding: '6px 14px', fontSize: '0.8rem' }}>
                    Stop Camera
                  </button>
                </div>
              )}

              {scanSuccess && <div style={{ color: '#4ade80', fontSize: '0.85rem', marginTop: '0.75rem' }}>✅ {scanSuccess}</div>}
              {scanError && <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: '0.75rem' }}>⚠️ {scanError}</div>}
            </div>
          </div>
        </div>
      )}

      {/* 3. SMART FILE MERGE TAB */}
      {activeSubTab === 'json' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>
            Import a JSON file exported from your co-examiner's device. The app will automatically merge their scores into your list by Register Number.
          </p>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
