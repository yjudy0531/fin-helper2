import React, { useState } from 'react';
import {
  MessageSquare,
  Briefcase,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { Session, SessionType } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  currentSessionId: string | null;
  onSelectSession: (session: Session) => void;
  onNewChat: () => void;
  onNewInterview: () => void;
  onDeleteSession: (sessionId: string) => void;
  isLoading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onNewInterview,
  onDeleteSession,
  isLoading,
}) => {
  const [filter, setFilter] = useState<'all' | 'chat' | 'interview'>('all');

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'all') return true;
    return s.type === filter;
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return '방금 전';
      if (diffMins < 60) return `${diffMins}분 전`;
      if (diffHours < 24) return `${diffHours}시간 전`;
      if (diffDays < 7) return `${diffDays}일 전`;
      return `${d.getMonth() + 1}/${d.getDate()}`;
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed md:static top-0 bottom-0 left-0 z-50 w-72 sm:w-80 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Action Buttons */}
        <div className="p-4 border-b border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between md:hidden mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              대화 및 면접 기록
            </span>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition group"
            >
              <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
              <span>새 상담</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onNewInterview();
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition group"
            >
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              <span>새 모의면접</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-slate-950/60 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-1 rounded-md text-[11px] font-medium transition ${
                filter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              전체 ({sessions.length})
            </button>
            <button
              onClick={() => setFilter('chat')}
              className={`flex-1 py-1 rounded-md text-[11px] font-medium transition ${
                filter === 'chat'
                  ? 'bg-slate-800 text-blue-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              상담 ({sessions.filter((s) => s.type === 'chat').length})
            </button>
            <button
              onClick={() => setFilter('interview')}
              className={`flex-1 py-1 rounded-md text-[11px] font-medium transition ${
                filter === 'interview'
                  ? 'bg-slate-800 text-indigo-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              모의면접 ({sessions.filter((s) => s.type === 'interview').length})
            </button>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {filteredSessions.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-slate-500">
              <Layers className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-medium text-slate-400">저장된 세션이 없습니다.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                새 상담이나 모의면접을 시작해보세요.
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isSelected = session.id === currentSessionId;
              const isInterview = session.type === 'interview';

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session);
                    onClose();
                  }}
                  className={`group relative p-2.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500/50 shadow-sm'
                      : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isInterview ? (
                        <span className="shrink-0 p-1 rounded-md bg-indigo-500/20 text-indigo-400">
                          <Briefcase className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="shrink-0 p-1 rounded-md bg-blue-500/20 text-blue-400">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <h4
                        className={`text-xs font-medium truncate ${
                          isSelected ? 'text-white font-semibold' : 'text-slate-200'
                        }`}
                      >
                        {session.title || (isInterview ? '금융권 모의면접' : '커리어 상담')}
                      </h4>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Sub Badges */}
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    {session.targetBank && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-300 font-medium truncate max-w-[100px]">
                        {session.targetBank}
                      </span>
                    )}
                    {session.targetRole && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 font-medium truncate max-w-[90px]">
                        {session.targetRole}
                      </span>
                    )}

                    {isInterview && (
                      session.isFinished ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          5문항 완료
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/30 font-semibold">
                          진행중 ({session.questionIndex || 1}/5)
                        </span>
                      )
                    )}

                    <span className="text-[10px] text-slate-500 ml-auto flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDate(session.updatedAt || session.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info box */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-[11px] text-slate-400">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">인사담당자 3대 평가 기준</p>
              <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                • <strong className="text-blue-300">논리성</strong>: 두괄식 & 인과관계<br />
                • <strong className="text-indigo-300">직무적합성</strong>: 은행 실무 마인드<br />
                • <strong className="text-amber-300">구체성</strong>: STAR & 수치화된 성과
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
