import React from 'react';
import { Landmark, MessageSquare, Briefcase, Menu, LogIn, LogOut } from 'lucide-react';
import { SessionType } from '../types';
import { User } from 'firebase/auth';

interface HeaderProps {
  activeMode: SessionType;
  onModeChange: (mode: SessionType) => void;
  onToggleSidebar: () => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  currentBank?: string;
  currentRole?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeMode,
  onModeChange,
  onToggleSidebar,
  user,
  onLogin,
  onLogout,
  currentBank,
  currentRole,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 overflow-hidden">
        {/* Left: Mobile Menu & Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
            aria-label="사이드바 열기"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => onModeChange('chat')}
            className="flex items-center gap-2 cursor-pointer shrink-0 select-none"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Landmark className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white whitespace-nowrap">
                  BankPass
                </span>
                <span className="hidden xs:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-400/30 whitespace-nowrap">
                  AI 코치
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden lg:block whitespace-nowrap">
                시중은행 인사담당자 출신 취업 코치
              </p>
            </div>
          </div>
        </div>

        {/* Center: Mode Toggle - Guaranteed No Vertical Text Break */}
        <div className="flex items-center shrink-0 bg-slate-800/90 p-0.5 sm:p-1 rounded-xl border border-slate-700/60 shadow-inner">
          <button
            type="button"
            onClick={() => onModeChange('chat')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              activeMode === 'chat'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">
              상담<span className="hidden sm:inline"> 코치</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('interview')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              activeMode === 'interview'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">
              모의면접<span className="hidden sm:inline"> (5문항)</span>
            </span>
          </button>
        </div>

        {/* Right: Target info & Auth */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {(currentBank || currentRole) && (
            <div className="hidden xl:flex items-center gap-1.5 text-xs bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/50 text-slate-300 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium text-white">{currentBank || '금융권'}</span>
              <span className="text-slate-500">|</span>
              <span className="text-blue-300">{currentRole || '직무 미지정'}</span>
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-blue-400/50 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {user.displayName?.[0] || user.email?.[0] || 'U'}
                  </div>
                )}
                <div className="hidden md:block text-left text-xs whitespace-nowrap">
                  <p className="font-semibold text-white leading-tight truncate max-w-[80px]">
                    {user.displayName || user.email?.split('@')[0] || '취준생'}
                  </p>
                  <p className="text-[10px] text-emerald-400">클라우드 동기화</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                title="로그아웃"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700 transition font-medium whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Google 로그인</span>
              <span className="sm:hidden whitespace-nowrap">로그인</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
