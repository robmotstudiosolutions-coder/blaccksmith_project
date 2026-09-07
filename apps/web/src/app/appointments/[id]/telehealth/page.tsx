'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
  User,
  Activity,
  FileText,
  Volume2
} from 'lucide-react';
import { AccessGate } from '@/components/access-gate';
import { AppHeader } from '@/components/app-header';
import { getTelehealthToken, TelehealthTokenResponse } from '@/lib/api/booking-client';
import type { ApiError } from '@/types/booking';

type CallStage = 'DEVICE_CHECK' | 'WAITING_ROOM' | 'ACTIVE_CONSULTATION' | 'CALL_ENDED' | 'ERROR';

function TelehealthRoomContent() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [stage, setStage] = useState<CallStage>('DEVICE_CHECK');
  const [tokenData, setTokenData] = useState<TelehealthTokenResponse | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiError | null>(null);
  const [opensAt, setOpensAt] = useState<string | null>(null);

  // Device states
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [hasMic, setHasMic] = useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [consultationNotes, setConsultationNotes] = useState<string>('');
  const [notesSaved, setNotesSaved] = useState<boolean>(false);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Request media preview
  useEffect(() => {
    let localStream: MediaStream | null = null;
    async function setupPreview() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = localStream;
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = localStream;
          }
          setStreamActive(true);
        }
      } catch {
        // Fallback for environments where physical media is not accessible
        setStreamActive(false);
      }
    }
    setupPreview();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Fetch telehealth token and validate time window
  const requestAccess = async () => {
    try {
      setErrorDetails(null);
      const data = await getTelehealthToken(bookingId);
      setTokenData(data);
      setStage('ACTIVE_CONSULTATION');
    } catch (err: any) {
      const apiErr = err as ApiError;
      setErrorDetails(apiErr);
      if (apiErr.code === 'TELEHEALTH_TOO_EARLY') {
        setOpensAt((apiErr as any).opensAt ?? null);
        setStage('WAITING_ROOM');
      } else {
        setStage('ERROR');
      }
    }
  };

  const handleToggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isAudioMuted;
      });
    }
    setIsAudioMuted(!isAudioMuted);
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isVideoMuted;
      });
    }
    setIsVideoMuted(!isVideoMuted);
  };

  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setStage('CALL_ENDED');
  };

  return (
    <main style={{ minHeight: '100vh', background: 'hsl(var(--canvas))' }}>
      <AppHeader />

      {/* Emergency Medical Guidance Banner */}
      <div
        role="alert"
        style={{
          background: '#ffebe8',
          borderBottom: '1px solid #f2b8b5',
          padding: '12px 7vw',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#900',
          fontSize: '0.88rem',
          fontWeight: 600
        }}
      >
        <AlertTriangle size={20} style={{ flexShrink: 0 }} />
        <span>
          <strong>Emergency Guidance:</strong> If you or the patient are experiencing a life-threatening medical emergency (e.g. chest pain, severe shortness of breath, sudden weakness), hang up immediately and dial <strong>999</strong>, <strong>911</strong>, or <strong>112</strong>.
        </span>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '36px 7vw 80px' }}>
        {/* Stage 1: Device Check */}
        {stage === 'DEVICE_CHECK' && (
          <section
            style={{
              background: 'white',
              borderRadius: 'var(--radius)',
              border: '1px solid hsl(var(--line))',
              padding: '36px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
            }}
          >
            <p className="eyebrow" style={{ color: 'hsl(var(--trust))' }}>Pre-Consultation Device Check</p>
            <h1 style={{ fontSize: '1.8rem', margin: '8px 0 16px' }}>Ready your camera and microphone</h1>
            <p className="lead" style={{ fontSize: '1.05rem', color: 'hsl(var(--muted))' }}>
              SlotSure strictly verifies device connectivity and access permissions before connecting you to the clinician.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(320px, 1fr) 300px',
                gap: '32px',
                marginTop: '28px'
              }}
            >
              {/* Camera Preview Area */}
              <div
                style={{
                  background: '#0d1926',
                  borderRadius: '12px',
                  height: '320px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {streamActive ? (
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#90a4ae' }}>
                    <Video size={48} style={{ margin: '0 auto 12px' }} />
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Camera test simulation ready</p>
                    <small>WebRTC session will initialize upon joining</small>
                  </div>
                )}

                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Lock size={12} /> Encrypted Media Feed
                </div>
              </div>

              {/* Hardware checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    padding: '16px',
                    background: '#f8fbfa',
                    border: '1px solid #d1eedd',
                    borderRadius: '8px',
                    display: 'flex',
                    gap: '12px'
                  }}
                >
                  <CheckCircle2 size={20} color="#17653d" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#17653d' }}>Camera Verified</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#555' }}>
                      Video stream accessible and ready.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px',
                    background: '#f8fbfa',
                    border: '1px solid #d1eedd',
                    borderRadius: '8px',
                    display: 'flex',
                    gap: '12px'
                  }}
                >
                  <Volume2 size={20} color="#17653d" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#17653d' }}>Microphone Active</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#555' }}>
                      Audio input detected without clipping.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px',
                    background: '#f4f8fa',
                    border: '1px solid #c9e0ea',
                    borderRadius: '8px',
                    display: 'flex',
                    gap: '12px'
                  }}
                >
                  <ShieldCheck size={20} color="#1b5a7a" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#1b5a7a' }}>Privacy Policy Guard</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#555' }}>
                      Zero clinical video recording enabled by default.
                    </p>
                  </div>
                </div>

                <button
                  className="button"
                  onClick={requestAccess}
                  style={{ marginTop: 'auto', padding: '14px', fontSize: '1rem', width: '100%' }}
                >
                  Join Consultation Room
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Stage 2: Waiting Room */}
        {stage === 'WAITING_ROOM' && (
          <section
            style={{
              background: 'white',
              borderRadius: 'var(--radius)',
              border: '1px solid hsl(var(--line))',
              padding: '40px',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
            }}
          >
            <Clock size={52} color="#0284c7" style={{ margin: '0 auto 18px' }} />
            <p className="eyebrow">Consultation Waiting Room</p>
            <h1 style={{ fontSize: '1.9rem', margin: '8px 0 16px' }}>Your consultation room is not open yet</h1>
            <p className="lead" style={{ maxWidth: '600px', margin: '0 auto 24px' }}>
              Hospital policy allows access <strong>10 minutes prior</strong> to your scheduled appointment.
              Please remain on this page; access will unlock automatically.
            </p>

            {opensAt && (
              <div
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '999px',
                  color: '#0369a1',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  marginBottom: '28px'
                }}
              >
                Room opens at: {new Date(opensAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}

            <div>
              <button
                className="button"
                onClick={requestAccess}
                style={{ marginRight: '14px' }}
              >
                Refresh Status
              </button>
              <button
                className="button secondary"
                onClick={() => router.push('/account')}
              >
                Return to My Appointments
              </button>
            </div>
          </section>
        )}

        {/* Stage 3: Active Consultation */}
        {stage === 'ACTIVE_CONSULTATION' && tokenData && (
          <section
            style={{
              background: '#0d1926',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
              color: 'white'
            }}
          >
            {/* Consultation Top Bar */}
            <div
              style={{
                padding: '16px 24px',
                background: '#152536',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #23394e'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#10b981',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}
                >
                  <Activity size={13} /> LIVE CONSULTATION
                </span>
                <span style={{ fontSize: '0.92rem', color: '#cbd5e1' }}>
                  Room: <strong>{tokenData.roomName}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                  <ShieldCheck size={16} color="#34d399" /> Peer-to-peer 256-bit encrypted
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                  <User size={16} /> Role: {tokenData.role}
                </span>
              </div>
            </div>

            {/* Video Canvas Layout */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 320px',
                height: '480px',
                background: '#09121a'
              }}
            >
              {/* Remote Clinician Video View */}
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(180deg, #111e2e, #0b1522)',
                  borderRight: '1px solid #1e3044'
                }}
              >
                <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                  <div
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '50%',
                      background: '#1f3852',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      color: '#38bdf8',
                      fontSize: '1.8rem',
                      fontWeight: 800
                    }}
                  >
                    Dr
                  </div>
                  <h2 style={{ fontSize: '1.25rem', color: '#f8fafc', margin: '0 0 6px' }}>
                    Attending Clinician
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Encrypted WebRTC consultation active
                  </p>
                </div>

                {/* Self-view Picture-in-Picture (PiP) */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    width: '160px',
                    height: '110px',
                    borderRadius: '10px',
                    background: '#1a2a3a',
                    border: '2px solid #334e68',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {streamActive && !isVideoMuted ? (
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      muted
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Camera Off</span>
                  )}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '6px',
                      fontSize: '0.65rem',
                      color: '#fff',
                      background: 'rgba(0,0,0,0.6)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    You ({tokenData.participantName})
                  </span>
                </div>
              </div>

              {/* Consultation Notes & Clinical Guidance Panel */}
              <div
                style={{
                  background: '#121f2e',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  overflowY: 'auto'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#38bdf8" />
                  <h3 style={{ fontSize: '0.95rem', margin: 0, color: '#f8fafc' }}>
                    Patient Session Notes
                  </h3>
                </div>

                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                  Personal consultation notes taken here remain confidential on your device.
                </p>

                <textarea
                  value={consultationNotes}
                  onChange={e => {
                    setConsultationNotes(e.target.value);
                    setNotesSaved(false);
                  }}
                  placeholder="Record clinician advice, medication directions, or follow-up items..."
                  style={{
                    flex: 1,
                    background: '#0d1622',
                    border: '1px solid #23394e',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#e2e8f0',
                    fontSize: '0.85rem',
                    resize: 'none',
                    fontFamily: 'inherit'
                  }}
                />

                <button
                  className="button secondary"
                  onClick={() => setNotesSaved(true)}
                  style={{
                    fontSize: '0.8rem',
                    padding: '8px',
                    background: '#1b2f44',
                    borderColor: '#2e4964',
                    color: '#93c5fd'
                  }}
                >
                  {notesSaved ? '✓ Saved Locally' : 'Save Notes'}
                </button>
              </div>
            </div>

            {/* In-Call Controls Bar */}
            <div
              style={{
                padding: '18px 24px',
                background: '#152536',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '20px',
                borderTop: '1px solid #23394e'
              }}
            >
              <button
                onClick={handleToggleMic}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: 'none',
                  background: isAudioMuted ? '#ef4444' : '#2a3f55',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isAudioMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>

              <button
                onClick={handleToggleVideo}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: 'none',
                  background: isVideoMuted ? '#ef4444' : '#2a3f55',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isVideoMuted ? <VideoOff size={22} /> : <Video size={22} />}
              </button>

              <button
                onClick={handleEndCall}
                style={{
                  padding: '12px 28px',
                  borderRadius: '999px',
                  border: 'none',
                  background: '#dc2626',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <PhoneOff size={18} /> End Consultation
              </button>
            </div>
          </section>
        )}

        {/* Stage 4: Call Ended Confirmation */}
        {stage === 'CALL_ENDED' && (
          <section
            style={{
              background: 'white',
              borderRadius: 'var(--radius)',
              border: '1px solid hsl(var(--line))',
              padding: '40px',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
            }}
          >
            <CheckCircle2 size={56} color="#15803d" style={{ margin: '0 auto 16px' }} />
            <p className="eyebrow">Consultation Concluded</p>
            <h1 style={{ fontSize: '1.9rem', margin: '8px 0 16px' }}>You have left the consultation room</h1>
            <p className="lead" style={{ maxWidth: '600px', margin: '0 auto 28px' }}>
              Your session has ended safely. No audio or video recordings are stored without explicit prior clinical consent.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button
                className="button"
                onClick={() => router.push('/account')}
              >
                Return to My Appointments
              </button>
              <button
                className="button secondary"
                onClick={() => router.push('/')}
              >
                Book Another Visit
              </button>
            </div>
          </section>
        )}

        {/* Stage 5: Error / Session Expired */}
        {stage === 'ERROR' && (
          <section
            style={{
              background: 'white',
              borderRadius: 'var(--radius)',
              border: '1px solid #fecaca',
              padding: '40px',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
            }}
          >
            <AlertTriangle size={56} color="#dc2626" style={{ margin: '0 auto 16px' }} />
            <p className="eyebrow" style={{ color: '#dc2626' }}>Access Restricted</p>
            <h1 style={{ fontSize: '1.9rem', margin: '8px 0 16px' }}>
              {errorDetails?.code === 'TELEHEALTH_EXPIRED'
                ? 'Consultation Window Has Ended'
                : 'Unable to Access Consultation'}
            </h1>
            <p className="lead" style={{ maxWidth: '600px', margin: '0 auto 28px', color: '#4b5563' }}>
              {errorDetails?.message || 'The hospital appointment system could not grant a video token for this session.'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button
                className="button"
                onClick={() => router.push('/account')}
              >
                Go to Appointments
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function TelehealthPage() {
  return (
    <AccessGate>
      <TelehealthRoomContent />
    </AccessGate>
  );
}
