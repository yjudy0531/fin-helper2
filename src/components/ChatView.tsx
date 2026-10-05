import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  User,
  Copy,
  Check,
  Building2,
  Briefcase,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Message, TARGET_BANKS, TARGET_ROLES } from '../types';

interface ChatViewProps {
  messages: Message[];
  onSendMessage: (text: string, context?: { targetBank?: string; targetRole?: string }) => Promise<void>;
  isLoading: boolean;
  targetBank?: string;
  targetRole?: string;
  onUpdateContext: (bank?: string, role?: string) => void;
}

const QUICK_PROMPTS = [
  {
    title: '자소서 두괄식 첨삭',
    category: '자기소개서',
    prompt: '기업금융 RM 직무 자소서에서 "고객을 감동시켜 유치한 경험"을 작성했는데, 너무 추상적이라는 피드백을 받았습니다. 금융권 인사담당자 시각에서 수치와 성과를 중심으로 날카롭게 첨삭해 주십시오.\n\n[내 자소서 내용]:\n동아리 축제 때 협찬 유치를 위해 기업 10곳에 연락하여 3곳에서 협찬을 받았습니다. 포기하지 않는 끈기로 담당자를 설득했습니다.',
  },
  {
    title: '"왜 꼭 우리 은행인가?" 답변',
    category: '면접 질문',
    prompt: 'KB국민은행과 신한은행 면접에서 "시중은행 중 왜 꼭 우리 은행이어야 하는가?"라는 질문을 받았을 때, 뻔한 칭찬 말고 현직자가 고개를 끄덕일 수 있는 차별화된 답변 전략과 키워드를 알려주세요.',
  },
  {
    title: '은행권 핫이슈 & 직무 연결',
    category: '금융 시사',
    prompt: '최근 시중은행들이 사활을 걸고 있는 비이자이익(수수료, 자산관리) 확대와 기업여신 건전성 관리 이슈를 개인금융/기업금융 지원자 관점에서 면접 때 어떻게 연결해 어필해야 할지 알려주세요.',
  },
  {
    title: '압박 면접 방어 논리',
    category: '면접 압박',
    prompt: '"금융 자격증이나 인턴 경험이 없는데 어떻게 현업에서 성과를 낼 수 있습니까?"라는 압박 질문에 당황하지 않고 솔직하면서도 논리적으로 방어하는 모범 답변 프레임을 짜주세요.',
  },
];

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  isLoading,
  targetBank,
  targetRole,
  onUpdateContext,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showContextBar, setShowContextBar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText.trim();
    setInputText('');
    await onSendMessage(text, { targetBank, targetRole });
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderFormattedContent = (content: string) => {
    if (content.includes('{"error"') || content.includes('잠시 후 다시 시도해주세요') || content.trim().startsWith('{"')) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>잠시 후 다시 시도해주세요</span>
        </div>
      );
    }

    // Process markdown-like lines for clean readability
    const lines = content.split('\n');
    return (
      <div className="space-y-2 text-sm leading-relaxed text-slate-800">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
            return (
              <h4 key={idx} className="font-bold text-slate-900 text-base mt-3 mb-1 text-blue-900 flex items-center gap-1.5">
                <span className="w-1.5 h-4 bg-blue-600 rounded-full inline-block"></span>
                {trimmed.replace(/^#+\s*/, '')}
              </h4>
            );
          }
          if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            return (
              <p key={idx} className="font-bold text-slate-900 mt-2 text-indigo-950">
                {trimmed.replace(/\*\*/g, '')}
              </p>
            );
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
                <span className="text-blue-600 font-bold mt-1 text-xs">•</span>
                <span className="text-slate-800">{trimmed.substring(2)}</span>
              </div>
            );
          }
          if (/^\d+\.\s/.test(trimmed)) {
            const num = trimmed.match(/^(\d+)\.\s/)?.[1];
            const rest = trimmed.replace(/^\d+\.\s/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
                <span className="font-semibold text-blue-700 min-w-[18px] text-xs mt-0.5">{num}.</span>
                <span className="text-slate-800">{rest}</span>
              </div>
            );
          }
          if (trimmed.startsWith('[Before') || trimmed.startsWith('[수정 전')) {
            return (
              <div key={idx} className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-mono my-2">
                <span className="font-bold block text-rose-700 mb-1">❌ 수정 전 (Before):</span>
                {trimmed}
              </div>
            );
          }
          if (trimmed.startsWith('[After') || trimmed.startsWith('[수정 후')) {
            return (
              <div key={idx} className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono my-2">
                <span className="font-bold block text-emerald-700 mb-1">✅ 수정 후 (After 추천안):</span>
                {trimmed}
              </div>
            );
          }
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }
          return <p key={idx} className="text-slate-800">{line}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Top Context Subheader */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            목표 설정:
          </span>
          <select
            value={targetBank || ''}
            onChange={(e) => onUpdateContext(e.target.value, targetRole)}
            className="bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-blue-500"
          >
            <option value="">은행/증권사 선택 (선택 안 함)</option>
            {TARGET_BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={targetRole || ''}
            onChange={(e) => onUpdateContext(targetBank, e.target.value)}
            className="bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-blue-500"
          >
            <option value="">목표 직무 선택 (선택 안 함)</option>
            {TARGET_ROLES.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
          <span>솔직하고 냉정한 인사담당자 코칭 모드</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-3xl mx-auto py-6 sm:py-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center shadow-inner mb-4">
              <Sparkles className="w-7 h-7 text-blue-700" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              시중은행 인사담당자 출신 커리어 코치
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto mt-2 leading-relaxed">
              "근거 없는 칭찬은 하지 않습니다. 자소서의 추상적 문장, 은행과 직무에 대한 이해도 부족을
              날카롭게 짚고 합격 가능한 수준으로 다듬어 드립니다."
            </p>

            {/* Quick Starter Prompts */}
            <div className="mt-8 text-left">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
                추천 상담 질문
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUICK_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(item.prompt);
                    }}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition text-left group flex flex-col justify-between"
                  >
                    <div>
                      <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md mb-1.5 border border-blue-100">
                        {item.category}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {item.prompt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-900 to-blue-900 text-white flex items-center justify-center text-xs font-bold shadow-md shrink-0 mt-0.5">
                      HR
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[78%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {isUser ? '지원자' : '인사담당자 코치'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`relative rounded-2xl p-4 shadow-xs ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      ) : (
                        renderFormattedContent(message.content)
                      )}

                      {!isUser && (
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded transition"
                          title="답변 복사"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-md shrink-0">
                  HR
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 rounded-tl-xs shadow-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                  <span className="text-xs text-slate-600 font-medium">
                    인사담당자가 답변을 날카롭게 분석 중입니다...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-3 sm:p-4 shadow-md">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex flex-col gap-2">
          <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition bg-white shadow-inner">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="자소서 문항, 면접 질문, 혹은 직무 고민을 입력하세요. (Shift+Enter 줄바꿈)"
              rows={3}
              className="w-full resize-none p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
              disabled={isLoading}
            />

            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
              <span className="text-[11px] text-slate-400">
                {inputText.length}자 입력 중
              </span>

              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white text-xs font-bold shadow-sm transition"
              >
                <span>전송</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
