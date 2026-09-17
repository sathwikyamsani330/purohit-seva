import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, ShieldCheck, UserCheck } from 'lucide-react';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantName: string;
  participantPhone?: string;
  participantTitle?: string;
  participantRole: 'priest' | 'customer';
  bookingId: string;
  eventName: string;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  participantName,
  participantPhone,
  participantTitle,
  participantRole,
  bookingId,
  eventName
}) => {
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);

  const displayPhone = participantPhone || (participantRole === 'priest' ? '+91 98450 11223' : '+91 98451 22334');
  const telLink = `tel:${displayPhone.replace(/[^\d+]/g, '')}`;

  useEffect(() => {
    if (!isOpen) {
      setCallStatus('connecting');
      setSeconds(0);
      return;
    }

    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
    }, 1800);

    return () => clearTimeout(connectTimer);
  }, [isOpen]);

  useEffect(() => {
    if (callStatus !== 'connected') return;

    const timer = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callStatus]);

  if (!isOpen) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-sm p-4">
      <div
        id="mock-call-modal"
        className="w-full max-w-sm rounded-2xl bg-stone-900 border border-stone-800 text-white shadow-2xl p-6 flex flex-col items-center text-center relative overflow-hidden"
      >
        {/* Decorative subtle background aura */}
        <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full bg-[#701a28]/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full bg-[#e5b869]/10 blur-2xl pointer-events-none" />

        {/* Masked Privacy Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-800 border border-stone-700 text-[#f6d89b] text-xs font-medium mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-[#e5b869]" />
          <span>Number Masked for Devotee & Priest Privacy</span>
        </div>

        {/* Participant Avatar / Icon */}
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full bg-[#701a28] flex items-center justify-center p-1 shadow-lg ring-4 ring-[#701a28]/30">
            <div className="w-full h-full rounded-full bg-stone-900 flex items-center justify-center">
              <UserCheck className="w-10 h-10 text-[#e5b869]" />
            </div>
          </div>
          {callStatus === 'connected' && (
            <span className="absolute bottom-0 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-stone-900" />
          )}
        </div>

        <h3 className="text-xl font-bold text-stone-100">{participantName}</h3>
        <p className="text-xs text-stone-400 mt-0.5">{participantTitle || (participantRole === 'priest' ? 'Vedic Acharya' : 'Devotee')}</p>
        <p className="text-xs text-[#f6d89b] font-medium mt-1">{eventName} • Booking #{bookingId}</p>

        {/* Direct Mobile Contact Display */}
        <div className="my-3 px-4 py-2.5 rounded-xl bg-stone-800 border border-[#e5b869]/30 text-xs text-stone-300 w-full flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Direct Mobile Contact</span>
            <span className="font-mono text-[#f6d89b] font-bold text-sm">{displayPhone}</span>
          </div>
          <a
            href={telLink}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
            title="Open Phone Dialer"
          >
            <Phone className="w-3 h-3" />
            <span>Dial</span>
          </a>
        </div>

        {/* Status or Duration */}
        <div className="h-8 flex items-center justify-center mb-6">
          {callStatus === 'connecting' && (
            <div className="flex items-center gap-2 text-sm text-stone-400 animate-pulse">
              <Phone className="w-4 h-4 text-[#e5b869] animate-bounce" />
              <span>Connecting sacred call...</span>
            </div>
          )}
          {callStatus === 'connected' && (
            <div className="text-xl font-mono text-emerald-400 tracking-wider font-semibold">
              {formatDuration(seconds)}
            </div>
          )}
          {callStatus === 'ended' && (
            <div className="text-sm text-rose-400 font-medium">Call Ended</div>
          )}
        </div>

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-4 w-full pt-2">
          {/* Mute Button */}
          <button
            id="call-mute-toggle"
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isMuted ? 'bg-[#e5b869] text-stone-950 font-bold' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            id="call-end-btn"
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
            title="End Call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          {/* Speaker Button */}
          <button
            id="call-speaker-toggle"
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isSpeaker ? 'bg-stone-700 text-amber-400' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
            title={isSpeaker ? 'Speaker On' : 'Speaker Off'}
          >
            {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
