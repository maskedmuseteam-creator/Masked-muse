import React from 'react';
import { ShieldAlert, Clock, AlertTriangle, X } from 'lucide-react';
import { User } from '../types';
import { inspectBanStatus } from '../services/storage';

interface BanNoticeModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSwitchAccount?: () => void;
}

export const BanNoticeModal: React.FC<BanNoticeModalProps> = ({
  user,
  isOpen,
  onClose,
  onSwitchAccount,
}) => {
  if (!isOpen || !user) return null;
  const banInfo = inspectBanStatus(user);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          aria-label="Close ban alert"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-500/20 text-red-400 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {banInfo.type === 'permanent' ? 'Account Permanently Suspended' : 'Account Temporarily Suspended'}
            </h3>
            <p className="text-xs text-slate-400">
              Moderation action applied to <span className="text-white font-medium">{user.nickName}</span> ({user.fullName})
            </p>
          </div>
        </div>

        <div className="space-y-4 my-4">
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Reason for Ban</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-normal">
              "{banInfo.reason || 'Violation of PulseX community guidelines and safety standards.'}"
            </p>
          </div>

          {banInfo.type === 'temporary' ? (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <Clock className="w-4 h-4" />
                <span>Ban Duration & Expiration</span>
              </div>
              <p className="text-sm text-slate-200">
                Time remaining: <span className="font-semibold text-amber-300">{banInfo.remainingText || 'Active'}</span>
              </p>
              {banInfo.expiresDateFormatted && (
                <p className="text-xs text-slate-400">
                  Suspension lifts automatically on: <span className="text-slate-300 font-medium">{banInfo.expiresDateFormatted}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-xs text-red-300">
                This is a permanent termination. You are restricted from posting, commenting, or interacting on the platform.
              </p>
            </div>
          )}

          <div className="text-xs text-slate-400 pt-1">
            Enforced by administrator: <span className="text-slate-300 font-medium">{user.banStatus.bannedBy || 'Rahin'}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          {onSwitchAccount && (
            <button
              onClick={() => {
                onClose();
                onSwitchAccount();
              }}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Switch Account
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
