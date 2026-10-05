import React, { useState, useRef, useEffect } from 'react';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Sparkles,
  Award,
  BarChart3,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  RotateCcw,
  Send,
  HelpCircle,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { Session, Message, EvaluationData, TARGET_BANKS, TARGET_ROLES } from '../types';

interface InterviewViewProps {
  session: Session | null;
  messages: Message[];
  onStartInterview: (bank: string, role: string) => Promise<void>;
  onSubmitAnswer: (answer: string) => Promise<void>;
  onResetInterview: () => void;
  onSwitchToChat: () => void;
  isLoading: boolean;
}

export const InterviewView: React.FC<InterviewViewProps> = ({
  session,
  messages,
  onStartInterview,
  onSubmitAnswer,
  onResetInterview,
  onSwitchToChat,
  isLoading,
}) => {
  const [selectedBank, setSelectedBank] = useState<string>('KB국민은행');
  const [customBank, setCustomBank] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('기업금융 (RM)');
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [showStarGuide, setShowStarGuide] = useState<boolean>(false);
  const [expandedDetails, setExpandedDetails] = useState<{ [key: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Derived state from session
  const isStarted = !!session && (messages.length > 0 || !!session.currentQuestion);
  const questionIndex = session?.questionIndex || 1;
  const isFinished = session?.isFinished || false;

  const currentQuestion = session?.currentQuestion ||
    messages.filter((m) => m.role === 'assistant' && !m.evaluation).pop()?.content ||
    '지원동기와 본인의 핵심 역량을 말씀해 주십시오.';

  // Calculate overall average scores if finished
  const evalMessages = messages.filter((m) => m.evaluation);
  const totalLogic = evalMessages.reduce((acc, m) => acc + (m.evaluation?.logicScore || 0), 0);
  const totalJobFit = evalMessages.reduce((acc, m) => acc + (m.evaluation?.jobFitScore || 0), 0);
  const totalSpec = evalMessages.reduce((acc, m) => acc + (m.evaluation?.specificityScore || 0), 0);
  const count = evalMessages.length || 1;

  const avgLogic = (totalLogic / count).toFixed(1);
  const avgJobFit = (totalJobFit / count).toFixed(1);
  const avgSpec = (totalSpec / count).toFixed(1);
  const overallAvg = ((totalLogic + totalJobFit + totalSpec) / (count * 3)).toFixed(1);

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalBank = customBank.trim() || selectedBank;
    await onStartInterview(finalBank, selectedRole);
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || isLoading) return;
    const text = userAnswer.trim();
    setUserAnswer('');
    await onSubmitAnswer(text);
  };

  // Score Badge Component
  const renderScoreMeter = (label: string, score: number, colorClass: string) => {
    const getGradeText = (s: number) => {
      if (s >= 5) return '탁월 (S)';
      if (s >= 4) return '우수 (A)';
      if (s >= 3) return '보통 (B)';
      if (s >= 2) return '미흡 (C)';
      return '위험 (D)';
    };

    return (
      <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-600">{label}</span>
          <span className={`text-xs font-extrabold px-1.5 py-0.5 rounded ${colorClass}`}>
            {score} / 5
          </span>
        </div>

        {/* 5-bar visual */}
        <div className="flex gap-1 my-1">
          {[1, 2, 3, 4, 5].map((lvl) => (
            <div
              key={lvl}
              className={`h-2 flex-1 rounded-sm transition-all ${
                lvl <= score ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <span className="text-[10px] text-slate-500 font-medium mt-1">
          {getGradeText(score)}
        </span>
      </div>
    );
  };

  // Setup Screen (Before Starting)
  if (!isStarted) {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-900 text-white flex items-center justify-center shadow-lg shadow-blue-900/30 mb-3">
              <Briefcase className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              금융권 실전 모의면접 (5문항)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
              지원 은행 및 직무를 설정하면, 시중은행 인사담당자 AI가 실전 압박 질문을 1문항씩 출제하고
              답변마다 <strong>[논리성, 직무적합성, 구체성]</strong>을 냉정하게 평가합니다.
            </p>
          </div>

          <form onSubmit={handleStart} className="space-y-6">
            {/* Step 1: Target Bank */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. 지원 금융기관 선택
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2.5">
                {TARGET_BANKS.slice(0, 8).map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => {
                      setSelectedBank(bank);
                      setCustomBank('');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition ${
                      selectedBank === bank && !customBank
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {bank}
                  </button>
                ))}
              </div>

              {/* Direct input for other institutions */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="또는 직접 입력 (예: 카카오뱅크, 미래에셋증권, 산업은행 등)"
                  value={customBank}
                  onChange={(e) => {
                    setCustomBank(e.target.value);
                  }}
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Step 2: Target Role */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                2. 지원 직무 선택
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TARGET_ROLES.map((role) => (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRole(role.name)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      selectedRole === role.name
                        ? 'bg-blue-50/80 border-blue-600 text-blue-950 ring-1 ring-blue-600'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{role.name}</span>
                      {selectedRole === role.name && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {role.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Notice */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">모의면접 진행 방식:</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  총 5문항이 순차적으로 출제되며, 각 답변마다 실시간 채점 카드와 한 줄 피드백이 제공됩니다.
                  5문항 완료 시 최종 종합 총평과 합격 가능성 리포트가 발행됩니다.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-700/25 transition flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>실전 모의면접 시작하기 (1/5 문항)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Active Interview Screen
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Top Header: Target Info & Progress Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
              {session?.targetBank}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
              {session?.targetRole}
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-bold text-slate-700">
              {isFinished ? '면접 종료 (총평 완료)' : `질문 ${questionIndex} / 5 진행 중`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Step Indicators */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((step) => {
                const isPassed = step < questionIndex || isFinished;
                const isCurrent = step === questionIndex && !isFinished;
                return (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                        isPassed
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isCurrent
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-600 animate-pulse'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {step}
                    </div>
                    {step < 5 && (
                      <div
                        className={`w-3 h-0.5 ${isPassed ? 'bg-blue-600' : 'bg-slate-200'}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                onResetInterview();
              }}
              title="처음부터 다시 하기"
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Scroll Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Answered Questions & Evaluation Cards History */}
          {messages.map((msg, idx) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-tr-xs p-4 shadow-sm">
                    <div className="flex items-center justify-between text-[11px] text-blue-200 mb-1.5">
                      <span className="font-semibold">지원자 답변</span>
                      <span>질문 {msg.questionNumber || '—'}번 응답</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              );
            }

            // If assistant message has evaluation -> Render Evaluation Card!
            if (msg.evaluation) {
              const evalData = msg.evaluation;
              const isCardExpanded = !!expandedDetails[msg.id];

              return (
                <div key={msg.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-md transition">
                  {/* Card Header: Question Number & Badge */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-900 text-white flex items-center justify-center text-xs font-bold">
                        Q{msg.questionNumber}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        면접관 실시간 채점 결과표
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                      <Award className="w-3.5 h-3.5" />
                      <span>
                        평균 {(((evalData.logicScore + evalData.jobFitScore + evalData.specificityScore) / 3)).toFixed(1)}점
                      </span>
                    </div>
                  </div>

                  {/* 3 Metrics Score Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    {renderScoreMeter('논리성 (두괄식·설득력)', evalData.logicScore, 'bg-blue-100 text-blue-800')}
                    {renderScoreMeter('직무적합성 (은행 실무)', evalData.jobFitScore, 'bg-indigo-100 text-indigo-800')}
                    {renderScoreMeter('구체성 (STAR·수치)', evalData.specificityScore, 'bg-amber-100 text-amber-800')}
                  </div>

                  {/* One-Line Feedback (한 줄 피드백) */}
                  <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-inner mb-3">
                    <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>인사담당자 원포인트 한 줄 피드백</span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-100">
                      "{evalData.feedback}"
                    </p>
                  </div>

                  {/* Expandable Deep-Dive Details */}
                  <button
                    type="button"
                    onClick={() => toggleDetails(msg.id)}
                    className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-800 font-semibold py-1.5 px-1 transition"
                  >
                    <span>상세 분석 (강점, 개선점 및 모범 답변 방향)</span>
                    {isCardExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {isCardExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 text-xs text-slate-700 animate-fadeIn">
                      {evalData.strengths && (
                        <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200">
                          <span className="font-bold text-emerald-800 block mb-0.5">
                            🌟 긍정 평가 요소:
                          </span>
                          <p className="text-emerald-950 leading-relaxed">{evalData.strengths}</p>
                        </div>
                      )}

                      {evalData.improvements && (
                        <div className="p-3 rounded-lg bg-rose-50/80 border border-rose-200">
                          <span className="font-bold text-rose-800 block mb-0.5">
                            ⚠️ 감점 요인 및 보완점:
                          </span>
                          <p className="text-rose-950 leading-relaxed">{evalData.improvements}</p>
                        </div>
                      )}

                      {evalData.modelAnswerTip && (
                        <div className="p-3 rounded-lg bg-blue-50/80 border border-blue-200">
                          <span className="font-bold text-blue-800 block mb-0.5">
                            💡 인사담당자 모범 답변 팁:
                          </span>
                          <p className="text-blue-950 leading-relaxed">{evalData.modelAnswerTip}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}

          {/* Current Question Card (if interview is ongoing) */}
          {!isFinished && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-700/80 relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-blue-600 text-white uppercase tracking-wider">
                  면접관 질문 [{questionIndex} / 5]
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {session?.targetBank} 면접실
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                "{currentQuestion}"
              </h2>

              <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <span>실제 면접이라 생각하고 두괄식으로 구체적으로 답변해 주세요.</span>
                <button
                  type="button"
                  onClick={() => setShowStarGuide(!showStarGuide)}
                  className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>STAR 기법 가이드</span>
                </button>
              </div>

              {showStarGuide && (
                <div className="mt-3 p-3 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-blue-300">🎯 STAR 답변 구성 팁:</p>
                  <p>• <strong>Situation (상황):</strong> 직무와 관련된 구체적 배경 설명</p>
                  <p>• <strong>Task (과제):</strong> 해결해야 했던 명확한 문제나 목표 수치</p>
                  <p>• <strong>Action (행동):</strong> 내가 취한 독창적이거나 적극적인 해결책</p>
                  <p>• <strong>Result (결과):</strong> 수치화된 성과 및 은행 입사 후 적용 방안</p>
                </div>
              )}
            </div>
          )}

          {/* Finished Screen: Comprehensive Report Card */}
          {isFinished && (
            <div className="bg-white border-2 border-blue-600 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  5문항 모의면접 완주 성공
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {session?.targetBank} {session?.targetRole} 면접 최종 성적표
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  시중은행 인사담당자가 5개 문항을 종합 분석한 최종 리포트입니다.
                </p>
              </div>

              {/* Overall Score Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-blue-900 text-white rounded-2xl p-4 text-center flex flex-col justify-center">
                  <span className="text-xs text-blue-200 font-medium">종합 평균 점수</span>
                  <span className="text-2xl sm:text-3xl font-black mt-1 text-white">
                    {overallAvg} <span className="text-sm font-normal text-blue-300">/ 5.0</span>
                  </span>
                  <span className="text-[11px] text-blue-200 mt-1">
                    {Number(overallAvg) >= 4.2
                      ? '합격 유력권'
                      : Number(overallAvg) >= 3.5
                      ? '보완 후 합격권'
                      : '집중 보완 요망'}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                  <span className="text-xs text-slate-500 font-medium">논리성 평균</span>
                  <span className="text-xl sm:text-2xl font-bold text-slate-900 block mt-1">
                    {avgLogic} 점
                  </span>
                  <span className="text-[10px] text-slate-500">두괄식 구성도</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                  <span className="text-xs text-slate-500 font-medium">직무적합성 평균</span>
                  <span className="text-xl sm:text-2xl font-bold text-slate-900 block mt-1">
                    {avgJobFit} 점
                  </span>
                  <span className="text-[10px] text-slate-500">은행/실무 이해도</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                  <span className="text-xs text-slate-500 font-medium">구체성 평균</span>
                  <span className="text-xl sm:text-2xl font-bold text-slate-900 block mt-1">
                    {avgSpec} 점
                  </span>
                  <span className="text-[10px] text-slate-500">수치화/STAR</span>
                </div>
              </div>

              {/* Overall Review Text (총평) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-3">
                  <Award className="w-5 h-5 text-blue-600" />
                  <span>인사담당자 심층 종합 총평</span>
                </div>
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {session?.overallReview ||
                    messages.filter((m) => m.evaluation?.overallReview).pop()?.evaluation?.overallReview ||
                    '지원자님의 전반적인 논리와 금융권에 대한 열정이 돋보였습니다. 실제 면접에서는 구체적인 수치와 은행의 최신 전략 키워드를 더 정교하게 결합하시면 우수한 결과를 얻으실 수 있습니다.'}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onResetInterview}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>다른 은행/직무로 새 모의면접 시작</span>
                </button>

                <button
                  type="button"
                  onClick={onSwitchToChat}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>이 면접 결과로 상담 코칭 이어받기</span>
                </button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-blue-600 animate-ping"></span>
              <span className="text-xs sm:text-sm font-semibold text-slate-700">
                인사담당자 AI가 지원자의 답변을 3대 지표로 엄격하게 채점 중입니다...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Answer Input Bar (Only visible when interview is active and NOT finished) */}
      {!isFinished && (
        <div className="bg-white border-t border-slate-200 p-3 sm:p-4 shadow-lg">
          <form onSubmit={handleAnswerSubmit} className="max-w-4xl mx-auto flex flex-col gap-2">
            <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition bg-white shadow-inner">
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="답변을 입력하십시오. 실제 면접장에서 발언하듯 두괄식으로 작성해 주세요. (Shift+Enter 줄바꿈)"
                rows={3}
                disabled={isLoading}
                className="w-full resize-none p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
              />

              <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                <span className="text-[11px] text-slate-400">
                  {userAnswer.length}자 입력 (질문 {questionIndex}/5 답변)
                </span>

                <button
                  type="submit"
                  disabled={!userAnswer.trim() || isLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  <span>답변 제출 및 채점받기</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
