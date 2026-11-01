import React, { useState, useEffect } from 'react';
import { Mail, Check, Copy, X } from 'lucide-react';

interface OtpPayload {
  email: string;
  otp: string;
  sentViaEmailJs: boolean;
  message: string;
}

export const OtpNotificationBanner: React.FC = () => {
  const [notification, setNotification] = useState<OtpPayload | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail) {
        setNotification(e.detail);
        setCopied(false);
      }
    };

    window.addEventListener('pulsex-otp-dispatched', handler);
    return () => window.removeEventListener('pulsex-otp-dispatched', handler);
  }, []);

  if (!notification) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(notification.otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl shadow-2xl p-4 transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg shrink-0">
          <Mail className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-white">Password Reset Code</h4>
            <span className="text-[11px] text-slate-400">
              {notification.sentViaEmailJs ? 'EmailJS Sent' : 'In-App Test Simulator'}
            </span>
          </div>
          <p className="text-xs text-slate-300 mb-2 truncate">
            Dispatched for: <span className="text-slate-100 font-medium">{notification.email}</span>
          </p>
          <div className="flex items-center gap-2 p-2 bg-slate-950/80 border border-slate-800 rounded-lg">
            <span className="text-xs text-slate-400">Your OTP:</span>
            <code className="text-base font-mono font-bold tracking-widest text-emerald-400 select-all">
              {notification.otp}
            </code>
            <button
              onClick={handleCopy}
              className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
              title="Copy OTP code"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Enter this 6-digit code on the reset screen to set a new password. Valid for 10 minutes.
          </p>
        </div>
        <button
          onClick={() => setNotification(null)}
          className="text-slate-400 hover:text-white transition-colors p-1"
          aria-label="Dismiss OTP notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
