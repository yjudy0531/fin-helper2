import React, { useState, useEffect, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  loginWithGoogle,
  logoutUser,
  saveSessionToFirestore,
  deleteSessionFromFirestore,
  saveMessageToFirestore,
  subscribeSessions,
  subscribeMessages,
} from './lib/firebase';
import { Session, Message, SessionType } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { InterviewView } from './components/InterviewView';

const STORAGE_KEY_SESSIONS = 'bankpass_local_sessions';
const STORAGE_KEY_ACTIVE_ID = 'bankpass_active_session_id';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMode, setActiveMode] = useState<SessionType>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [contextBank, setContextBank] = useState<string>('KB국민은행');
  const [contextRole, setContextRole] = useState<string>('기업금융 (RM)');
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Track Firestore unsubscribe handles
  const unsubscribeSessionsRef = useRef<(() => void) | null>(null);
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (errorToast) {
      const timer = setTimeout(() => setErrorToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorToast]);

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (unsubscribeSessionsRef.current) {
          unsubscribeSessionsRef.current();
        }
        unsubscribeSessionsRef.current = subscribeSessions(currentUser.uid, (firestoreSessions) => {
          if (firestoreSessions && firestoreSessions.length > 0) {
            setSessions(firestoreSessions);
          }
        });
      } else {
        // Load sessions from localStorage for guest
        const local = localStorage.getItem(STORAGE_KEY_SESSIONS);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSessions(parsed);
            }
          } catch (e) {
            console.warn('Failed to parse local sessions', e);
          }
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSessionsRef.current) unsubscribeSessionsRef.current();
      if (unsubscribeMessagesRef.current) unsubscribeMessagesRef.current();
    };
  }, []);

  // Sync to local storage for guests
  useEffect(() => {
    if (!user && sessions.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
      } catch (e) {
        console.warn('Failed to save sessions to localStorage', e);
      }
    }
  }, [sessions, user]);

  // 2. Select initial session or create one if empty
  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      const savedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
      const matched = sessions.find((s) => s.id === savedActiveId);
      if (matched) {
        selectSession(matched);
      } else {
        selectSession(sessions[0]);
      }
    }
  }, [sessions, currentSessionId]);

  // 3. Subscribe to current session messages
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }

    if (user) {
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current();
      }
      unsubscribeMessagesRef.current = subscribeMessages(user.uid, currentSessionId, (firestoreMsgs) => {
        setMessages(firestoreMsgs || []);
      });
    } else {
      // Local storage messages fallback for guest
      const localMsgs = localStorage.getItem(`bankpass_msgs_${currentSessionId}`);
      if (localMsgs) {
        try {
          const parsed = JSON.parse(localMsgs);
          setMessages(Array.isArray(parsed) ? parsed : []);
        } catch {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    }
  }, [currentSessionId, user]);

  const currentSession = sessions.find((s) => s.id === currentSessionId) || null;

  // Select a session
  const selectSession = (session: Session) => {
    setCurrentSessionId(session.id);
    setActiveMode(session.type);
    if (session.targetBank) setContextBank(session.targetBank);
    if (session.targetRole) setContextRole(session.targetRole);
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, session.id);
  };

  // Helper: Persist session
  const persistSession = async (session: Session) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === session.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = session;
        return updated;
      }
      return [session, ...prev];
    });

    if (user) {
      try {
        await saveSessionToFirestore(user.uid, session);
      } catch (err) {
        console.warn('Error saving session to Firestore:', err);
      }
    }
  };

  // Helper: Persist message
  const persistMessage = async (sessionId: string, message: Message) => {
    setMessages((prev) => {
      const next = [...prev, message];
      if (!user) {
        try {
          localStorage.setItem(`bankpass_msgs_${sessionId}`, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to save message to localStorage', e);
        }
      }
      return next;
    });

    if (user) {
      try {
        await saveMessageToFirestore(user.uid, sessionId, message);
      } catch (err) {
        console.warn('Error saving message to Firestore:', err);
      }
    }
  };

  // Create New Chat Session
  const handleNewChat = async () => {
    setActiveMode('chat');
    const newId = `chat_${Date.now()}`;
    const newSession: Session = {
      id: newId,
      userId: user?.uid || 'guest',
      title: '새 커리어 코칭 상담',
      type: 'chat',
      targetBank: contextBank,
      targetRole: contextRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await persistSession(newSession);
    selectSession(newSession);
    setMessages([]);
  };

  // Create New Mock Interview Session (Guaranteed switch to setup screen)
  const handleNewInterview = async () => {
    setActiveMode('interview');
    const newId = `interview_${Date.now()}`;
    const newSession: Session = {
      id: newId,
      userId: user?.uid || 'guest',
      title: `${contextBank} ${contextRole} 모의면접`,
      type: 'interview',
      targetBank: contextBank,
      targetRole: contextRole,
      questionIndex: 1,
      currentQuestion: '', // Empty means setup screen will be shown
      isFinished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await persistSession(newSession);
    selectSession(newSession);
    setMessages([]);
  };

  // Delete Session
  const handleDeleteSession = async (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (!user) {
      localStorage.removeItem(`bankpass_msgs_${sessionId}`);
    } else {
      try {
        await deleteSessionFromFirestore(user.uid, sessionId);
      } catch (err) {
        console.warn('Error deleting session from Firestore:', err);
      }
    }

    if (currentSessionId === sessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId);
      if (remaining.length > 0) {
        selectSession(remaining[0]);
      } else {
        setCurrentSessionId(null);
        setMessages([]);
      }
    }
  };

  // Header Mode Change: Instant switch
  const handleModeChange = (mode: SessionType) => {
    setActiveMode(mode);
    if (mode === 'interview') {
      if (currentSession?.type === 'interview') {
        return;
      }
      const existingInterview = sessions.find((s) => s.type === 'interview');
      if (existingInterview) {
        selectSession(existingInterview);
      } else {
        handleNewInterview();
      }
    } else {
      if (currentSession?.type === 'chat') {
        return;
      }
      const existingChat = sessions.find((s) => s.type === 'chat');
      if (existingChat) {
        selectSession(existingChat);
      } else {
        handleNewChat();
      }
    }
  };

  // Send Message in Chat Mode
  const handleSendChatMessage = async (text: string, context?: { targetBank?: string; targetRole?: string }) => {
    let session = currentSession;
    if (!session || session.type !== 'chat') {
      const newId = `chat_${Date.now()}`;
      session = {
        id: newId,
        userId: user?.uid || 'guest',
        title: text.length > 25 ? text.substring(0, 25) + '...' : text,
        type: 'chat',
        targetBank: context?.targetBank || contextBank,
        targetRole: context?.targetRole || contextRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await persistSession(session);
      selectSession(session);
    } else if (messages.length === 0) {
      const updated = {
        ...session,
        title: text.length > 25 ? text.substring(0, 25) + '...' : text,
        updatedAt: new Date().toISOString(),
      };
      await persistSession(updated);
    }

    const userMsg: Message = {
      id: `msg_u_${Date.now()}`,
      sessionId: session.id,
      userId: user?.uid || 'guest',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    await persistMessage(session.id, userMsg);

    // Call backend API
    setIsLoading(true);
    try {
      const historyForApi = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyForApi,
          sessionContext: {
            targetBank: context?.targetBank || session.targetBank || contextBank,
            targetRole: context?.targetRole || session.targetRole || contextRole,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '잠시 후 다시 시도해주세요');
      }

      const assistantMsg: Message = {
        id: `msg_a_${Date.now()}`,
        sessionId: session.id,
        userId: 'coach_ai',
        role: 'assistant',
        content: data.reply || '잠시 후 다시 시도해주세요',
        createdAt: new Date().toISOString(),
      };
      await persistMessage(session.id, assistantMsg);
    } catch (err: any) {
      console.warn('Chat request issue:', err);
      // Clean error representation as requested
      const errorMsg: Message = {
        id: `msg_err_${Date.now()}`,
        sessionId: session.id,
        userId: 'system',
        role: 'assistant',
        content: '잠시 후 다시 시도해주세요',
        createdAt: new Date().toISOString(),
      };
      await persistMessage(session.id, errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Start Mock Interview (Flow: 은행/직무 선택 -> 질문 1개 출제)
  const handleStartInterview = async (bank: string, role: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          targetBank: bank,
          targetRole: role,
        }),
      });

      const data = await res.json();
      const firstQuestion =
        data.question ||
        `${bank}의 ${role} 직무에 지원하시게 된 구체적인 동기와, 본인이 해당 직무에 가장 적합하다고 자신하는 핵심 역량을 말씀해 주십시오.`;

      // Update current session or create new one
      let session = currentSession;
      if (!session || session.type !== 'interview' || messages.length > 0) {
        const newId = `interview_${Date.now()}`;
        session = {
          id: newId,
          userId: user?.uid || 'guest',
          title: `${bank} ${role} 모의면접`,
          type: 'interview',
          targetBank: bank,
          targetRole: role,
          questionIndex: 1,
          currentQuestion: firstQuestion,
          isFinished: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else {
        session = {
          ...session,
          title: `${bank} ${role} 모의면접`,
          targetBank: bank,
          targetRole: role,
          questionIndex: 1,
          currentQuestion: firstQuestion,
          isFinished: false,
          updatedAt: new Date().toISOString(),
        };
      }

      await persistSession(session);
      selectSession(session);
      setContextBank(bank);
      setContextRole(role);

      // Add initial assistant question message
      const initialQMsg: Message = {
        id: `msg_q1_${Date.now()}`,
        sessionId: session.id,
        userId: 'interviewer_ai',
        role: 'assistant',
        content: firstQuestion,
        questionNumber: 1,
        createdAt: new Date().toISOString(),
      };
      await persistMessage(session.id, initialQMsg);
    } catch (err: any) {
      console.warn('Error starting interview:', err);
      setErrorToast('잠시 후 다시 시도해주세요');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Answer in Interview Mode (Flow: 답변 -> 점수 카드(논리/직무/구체 1~5점 + 피드백) -> 다음 질문 -> 5문항 후 총평)
  const handleSubmitInterviewAnswer = async (answer: string) => {
    if (!currentSession) return;

    const qNum = currentSession.questionIndex || 1;
    const currentQ =
      currentSession.currentQuestion ||
      messages.filter((m) => m.role === 'assistant' && !m.evaluation).pop()?.content ||
      `${contextBank} ${contextRole} 관련 직무 질문`;

    // 1. Add user answer message
    const userMsg: Message = {
      id: `msg_ans_${Date.now()}`,
      sessionId: currentSession.id,
      userId: user?.uid || 'guest',
      role: 'user',
      content: answer,
      questionNumber: qNum,
      createdAt: new Date().toISOString(),
    };
    await persistMessage(currentSession.id, userMsg);

    // 2. Prepare past history
    const pastEvaluations = messages
      .filter((m) => m.evaluation)
      .map((m) => {
        const uAns = messages.find((um) => um.role === 'user' && um.questionNumber === m.questionNumber)?.content || '';
        return {
          questionNumber: m.questionNumber,
          question: m.content,
          answer: uAns,
          evaluation: m.evaluation,
        };
      });

    // 3. Call backend API
    setIsLoading(true);
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'answer',
          targetBank: currentSession.targetBank || contextBank,
          targetRole: currentSession.targetRole || contextRole,
          questionNumber: qNum,
          currentQuestion: currentQ,
          userAnswer: answer,
          history: pastEvaluations,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '잠시 후 다시 시도해주세요');
      }

      const isCompleted = data.isFinished || qNum >= 5;

      // 4. Save evaluation assistant message
      const evalMsg: Message = {
        id: `msg_eval_${Date.now()}`,
        sessionId: currentSession.id,
        userId: 'interviewer_ai',
        role: 'assistant',
        content: currentQ,
        questionNumber: qNum,
        evaluation: {
          logicScore: Number(data.logicScore) || 3,
          jobFitScore: Number(data.jobFitScore) || 3,
          specificityScore: Number(data.specificityScore) || 3,
          feedback: data.feedback || '답변을 분석했습니다. 두괄식 전개와 구체적인 수치를 보강하세요.',
          strengths: data.strengths || '질문의 핵심을 파악하려는 의도가 돋보였습니다.',
          improvements: data.improvements || '구체적인 성과 수치와 행동 중심의 근거를 보완하십시오.',
          modelAnswerTip: data.modelAnswerTip || '두괄식으로 결론을 먼저 제시하고 STAR 기법으로 전개하십시오.',
          nextQuestion: data.nextQuestion || '',
          isFinished: isCompleted,
          overallReview: data.overallReview || '',
        },
        nextQuestion: data.nextQuestion || '',
        createdAt: new Date().toISOString(),
      };
      await persistMessage(currentSession.id, evalMsg);

      // 5. Update session state
      const updatedSession: Session = {
        ...currentSession,
        questionIndex: isCompleted ? 5 : qNum + 1,
        currentQuestion: isCompleted ? '' : (data.nextQuestion || ''),
        isFinished: isCompleted,
        overallReview: isCompleted ? (data.overallReview || evalMsg.evaluation?.overallReview) : undefined,
        updatedAt: new Date().toISOString(),
      };
      await persistSession(updatedSession);
    } catch (err: any) {
      console.warn('Interview evaluation issue:', err);
      setErrorToast('잠시 후 다시 시도해주세요');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetInterview = () => {
    handleNewInterview();
  };

  const handleSwitchToChatWithInterviewContext = () => {
    handleNewChat();
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.warn('Login issue:', err);
      setErrorToast('잠시 후 다시 시도해주세요');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err: any) {
      console.warn('Logout issue:', err);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 font-sans">
      {/* Toast Notification */}
      {errorToast && (
        <div className="fixed top-18 right-4 z-50 bg-slate-900/95 border border-rose-500/80 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span>{errorToast}</span>
        </div>
      )}

      {/* Top Navigation */}
      <Header
        activeMode={activeMode}
        onModeChange={handleModeChange}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        currentBank={currentSession?.targetBank || contextBank}
        currentRole={currentSession?.targetRole || contextRole}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Drawer / Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={selectSession}
          onNewChat={handleNewChat}
          onNewInterview={handleNewInterview}
          onDeleteSession={handleDeleteSession}
          isLoading={isLoading}
        />

        {/* Center Main Stage */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
          {activeMode === 'chat' ? (
            <ChatView
              messages={messages}
              onSendMessage={handleSendChatMessage}
              isLoading={isLoading}
              targetBank={contextBank}
              targetRole={contextRole}
              onUpdateContext={(bank, role) => {
                if (bank) setContextBank(bank);
                if (role) setContextRole(role);
              }}
            />
          ) : (
            <InterviewView
              session={currentSession && currentSession.type === 'interview' ? currentSession : null}
              messages={messages}
              onStartInterview={handleStartInterview}
              onSubmitAnswer={handleSubmitInterviewAnswer}
              onResetInterview={handleResetInterview}
              onSwitchToChat={handleSwitchToChatWithInterviewContext}
              isLoading={isLoading}
            />
          )}
        </main>
      </div>
    </div>
  );
}
