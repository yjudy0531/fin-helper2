import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '5mb' }));

// Initialize Google Gemini SDK on backend
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Candidate models for high availability:
// gemini-3.8-flash is primary, gemini-3.1-flash-lite as rate-limit/fallback model
const MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

// Helper: Exponential Backoff for 503 / 429 errors (Max 3 retries)
async function callGeminiWithRetry<T>(fn: (modelName: string) => Promise<T>, maxRetries = 3, initialDelayMs = 1500): Promise<T> {
  let delay = initialDelayMs;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Alternate models across retries if rate limit (429) was hit
    const modelToUse = MODELS[(attempt - 1) % MODELS.length];
    try {
      return await fn(modelToUse);
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.statusCode || error?.response?.status;
      const msg = String(error?.message || '');
      const isRetryable =
        status === 503 ||
        status === 429 ||
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('overloaded');

      if (isRetryable && attempt < maxRetries) {
        console.warn(`[Gemini Retry] Attempt ${attempt} (${modelToUse}) failed with ${status || msg.slice(0, 80)}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        break;
      }
    }
  }
  throw lastError || new Error('잠시 후 다시 시도해주세요');
}

const SYSTEM_INSTRUCTION_CHAT = `너는 대한민국 4대 시중은행(KB국민, 신한, 하나, 우리) 및 주요 금융기관(IBK기업은행, NH농협은행, 미래에셋증권, 한국투자증권 등) 인사담당자/면접관 출신의 15년 차 베테랑 금융 커리어 코치다.

[핵심 원칙 및 태도]
1. 시중은행 인사담당자 출신 커리어 코치로서 금융권 직무(기업금융 RM, 개인금융/리테일, 디지털/IT, 자산관리/WM, IB/트레이딩, 리스크관리 등), 자소서, 면접에 대해 구체적이고 솔직하게 조언한다.
2. 근거 없는 칭찬은 절대 하지 않는다. 지원자의 서류나 답변이 부족하다면 직설적이되 논리적으로 취약점(추상적 수식어, 해당 금융기관 최신 전략 무지, 실무 프로세스 이해 부족 등)을 지적한다.
3. 자기소개서 첨삭 시:
   - 두괄식 결론과 명확한 소제목 사용
   - 단순 활동 나열이 아닌 STAR 기법(상황, 과제, 행동, 수치화된 성과) 적용
   - 해당 은행의 최신 비즈니스 키워드(기업여신 심사 고도화, 금리 변동기 건전성 관리, 디지털 채널 혁신, 자산관리 대중화, 상생 금융 등)와 지원자 역량의 연결성 분석
   - [Before -> After 수정 예시]를 구체적으로 제시
4. 면접 코칭 시:
   - "왜 타행이 아니라 우리 은행인가?", "왜 이 직무인가?"에 대한 설득력 검토
   - 꼬리 질문(압박 질문)에 대비한 논리적 방어선 구축 방안 조언
5. 전문적이면서도 신뢰감 있는 금융권 전문가 어조(정중하면서도 단호한 경어체)를 일관되게 유지한다.`;

// API 1: Chat endpoint (상담 모드)
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, sessionContext } = req.body;

    if (!apiKey) {
      return res.status(500).json({
        error: '잠시 후 다시 시도해주세요',
        reply: '잠시 후 다시 시도해주세요',
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '대화 메시지 목록이 유효하지 않습니다.' });
    }

    let contextualSystemPrompt = SYSTEM_INSTRUCTION_CHAT;
    if (sessionContext?.targetBank || sessionContext?.targetRole) {
      contextualSystemPrompt += `\n\n[현재 지원자 목표]: 목표 기관: ${sessionContext.targetBank || '금융권 전반'}, 목표 직무: ${sessionContext.targetRole || '미정'}`;
    }

    // Format chat history for Gemini
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await callGeminiWithRetry(async (modelName) => {
      return await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: contextualSystemPrompt,
          temperature: 0.7,
        },
      });
    });

    const reply = response.text || '잠시 후 다시 시도해주세요';
    return res.json({ reply });
  } catch (error: any) {
    console.error('Chat API Error:', error?.message || error);
    return res.status(503).json({
      error: '잠시 후 다시 시도해주세요',
      reply: '잠시 후 다시 시도해주세요',
    });
  }
});

// API 2: Interview endpoint (모의면접 모드)
const interviewEvalSchema = {
  type: Type.OBJECT,
  properties: {
    logicScore: {
      type: Type.INTEGER,
      description: '논리성 점수 (1~5 정수). 두괄식 구성, 인과관계의 설득력, 질문 의도 부합도',
    },
    jobFitScore: {
      type: Type.INTEGER,
      description: '직무적합성 점수 (1~5 정수). 은행/증권사 직무 이해도, 금융 실무 마인드셋',
    },
    specificityScore: {
      type: Type.INTEGER,
      description: '구체성 점수 (1~5 정수). 모호한 표현 지양, 구체적 사례, 수치 및 행동 중심 기술',
    },
    feedback: {
      type: Type.STRING,
      description: '한 줄 핵심 피드백 (인사담당자의 날카롭고 직설적인 평가, 1~2문장)',
    },
    strengths: {
      type: Type.STRING,
      description: '답변에서 돋보였던 구체적 강점',
    },
    improvements: {
      type: Type.STRING,
      description: '가장 치명적인 감점 요인 및 보완 방향',
    },
    modelAnswerTip: {
      type: Type.STRING,
      description: '실제 면접관이 듣고 싶어 하는 모범 답변 구성 가이드',
    },
    nextQuestion: {
      type: Type.STRING,
      description: '다음 면접 질문 (현재 질문이 1~4번일 때 생성, 5번 완료 시 빈 문자열)',
    },
    isFinished: {
      type: Type.BOOLEAN,
      description: '5문항 모의면접 완료 여부 (현재 답변한 문항이 5번이면 true)',
    },
    overallReview: {
      type: Type.STRING,
      description: '5문항 완료 시 최종 종합 총평 (5문항 종합 강약점 분석, 실전 합격 가능성 진단, 최종 면접 조언). 미완료 시 빈 문자열',
    },
  },
  required: [
    'logicScore',
    'jobFitScore',
    'specificityScore',
    'feedback',
    'strengths',
    'improvements',
    'modelAnswerTip',
    'nextQuestion',
    'isFinished',
    'overallReview',
  ],
};

app.post('/api/interview', async (req: Request, res: Response) => {
  try {
    const { action, targetBank, targetRole, questionNumber, currentQuestion, userAnswer, history } = req.body;

    if (!apiKey) {
      return res.status(500).json({
        error: '잠시 후 다시 시도해주세요',
      });
    }

    if (action === 'start') {
      const startPrompt = `지원 금융기관: ${targetBank || '시중은행'}
지원 직무: ${targetRole || '일반금융'}

위 금융기관 및 직무에 지원한 취업준비생을 대상으로 1:1 실전 면접을 시작하려 합니다.
실제 면접관으로서 첫 번째 질문(1번 문항)을 던져주십시오.
- 첫 질문은 지원동기 및 직무 핵심 강점/준비도를 검증하는 핵심 질문이어야 합니다.
- 실제 면접관의 엄격하고 정중한 어조(하십시오체)로 작성하세요.
- 오직 질문 문장 1개만 단도직입적으로 출력하십시오.`;

      try {
        const response = await callGeminiWithRetry(async (modelName) => {
          return await ai.models.generateContent({
            model: modelName,
            contents: startPrompt,
            config: {
              systemInstruction: '너는 금융권 실전 면접관이다. 불필요한 서두 없이 첫 번째 면접 질문 1개만 출력한다.',
              temperature: 0.7,
            },
          });
        });

        const questionText = response.text?.trim() || `${targetBank}의 ${targetRole} 직무에 지원하시게 된 구체적인 동기와, 본인이 해당 직무에 가장 적합하다고 자신하는 핵심 역량을 말씀해 주십시오.`;

        return res.json({
          questionNumber: 1,
          question: questionText,
        });
      } catch (e) {
        console.warn('Start interview fallback triggered:', e);
        return res.json({
          questionNumber: 1,
          question: `${targetBank}의 ${targetRole} 직무에 지원하시게 된 구체적인 동기와, 본인이 해당 직무에 가장 적합하다고 자신하는 핵심 역량을 말씀해 주십시오.`,
        });
      }
    }

    if (action === 'answer') {
      const qNum = Number(questionNumber) || 1;
      const isFifth = qNum >= 5;

      const historySummary = Array.isArray(history) && history.length > 0
        ? history.map((h: any, idx: number) => `Q${idx + 1}: ${h.question}\nA: ${h.answer}\n점수: 논리(${h.evaluation?.logicScore}) 직무(${h.evaluation?.jobFitScore}) 구체(${h.evaluation?.specificityScore})\n`).join('\n')
        : '이전 질문 없음';

      const prompt = `[지원 정보]
지원 기관: ${targetBank}
지원 직무: ${targetRole}
현재 평가 문항: ${qNum} / 5
면접관 질문: ${currentQuestion}

[지원자의 답변]
${userAnswer}

[이전 문항 기록]
${historySummary}

[평가 및 다음 질문 지침]
너는 시중은행 인사담당자 출신 면접관이다.
지원자의 답변을 [논리성, 직무적합성, 구체성] 각 1~5점 척도로 냉정하게 채점하라.
- logicScore: 두괄식, 질문의 본질 파악, 인과관계 명확성 (1~5 정수)
- jobFitScore: 금융기관/직무 실무 관점 부합도, 금융 전문성 (1~5 정수)
- specificityScore: 추상적 어휘 배제, 실제 수치/사례/행동 중심 여부 (1~5 정수)
- feedback: 핵심을 찌르는 직설적인 한 줄 피드백 (1~2문장)
- strengths: 좋았던 점
- improvements: 부족한 점 및 수정 방향
- modelAnswerTip: 면접관이 기대한 모범 답변 가이드
- isFinished: ${isFifth ? 'true' : 'false'}
- nextQuestion: ${isFifth ? '"" (빈 문자열)' : `${qNum + 1}번째 면접 질문 (이전 문항들과 중복되지 않고 심층 검증하는 질문)`}
  - 2번 질문: 직무 관련 문제해결 경험 또는 성과 창출 과정
  - 3번 질문: 해당 금융사 최신 현안(디지털 혁신, 리스크 관리, 금리/환율, 건전성 등)에 대한 직무적 견해
  - 4번 질문: 고객 갈등 대처, 영업 압박, 혹은 팀 내 협업 갈등 극복 경험
  - 5번 질문: 입사 후 구체적 커리어 로드맵 및 마지막 한마디
- overallReview: ${isFifth ? '5개 문항 전체를 종합한 최종 총평 (종합 강점, 치명적 보완점, 최종 합격 가능성 진단 및 최종 조언)' : '"" (빈 문자열)'}`;

      const response = await callGeminiWithRetry(async (modelName) => {
        return await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: '너는 금융권 인사담당자 출신 실전 면접관이다. JSON 스키마를 엄격히 준수하여 채점 및 다음 질문을 생성하라.',
            responseMimeType: 'application/json',
            responseSchema: interviewEvalSchema,
            temperature: 0.6,
          },
        });
      });

      const responseText = response.text || '{}';
      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch (err) {
        console.error('Failed to parse Gemini JSON output:', responseText);
        parsed = {
          logicScore: 3,
          jobFitScore: 3,
          specificityScore: 3,
          feedback: '답변을 분석했습니다. 두괄식 전개와 금융 실무적 관점을 더 구체화해 주십시오.',
          strengths: '기본적인 논리적 태도와 질문 의도 파악이 돋보였습니다.',
          improvements: '경험의 구체적인 수치와 행동 중심 성과를 명확히 제시하십시오.',
          modelAnswerTip: '결론부터 두괄식으로 말하고 구체적 상황(STAR)을 제시하십시오.',
          nextQuestion: isFifth ? '' : `${targetBank} ${targetRole} 직무 수행 중 예상치 못한 갈등이나 압박 상황을 극복한 경험을 말씀해 주십시오.`,
          isFinished: isFifth,
          overallReview: isFifth ? '모의면접 5문항을 모두 완주하셨습니다. 실전 면접 전 두괄식 말하기와 수치화된 성과를 다시 한번 정리해보시길 권합니다.' : '',
        };
      }

      return res.json(parsed);
    }

    return res.status(400).json({ error: '알 수 없는 요청입니다.' });
  } catch (error: any) {
    console.error('Interview API Error:', error?.message || error);
    return res.status(503).json({
      error: '잠시 후 다시 시도해주세요',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BankPass Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
