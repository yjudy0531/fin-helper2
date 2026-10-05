export type SessionType = 'chat' | 'interview';

export interface EvaluationData {
  logicScore: number;       // 1 ~ 5
  jobFitScore: number;      // 1 ~ 5
  specificityScore: number;  // 1 ~ 5
  feedback: string;         // 한 줄 피드백
  strengths?: string;       // 잘한 점
  improvements?: string;    // 보완점
  modelAnswerTip?: string;  // 모범 답변 팁
  nextQuestion?: string;    // 다음 질문
  isFinished?: boolean;     // 5문항 완료 여부
  overallReview?: string;   // 5문항 종합 총평
}

export interface Message {
  id: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  questionNumber?: number; // 모의면접 질문 번호 (1 ~ 5)
  evaluation?: EvaluationData;
  nextQuestion?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  title: string;
  type: SessionType;
  targetBank?: string;
  targetRole?: string;
  questionIndex?: number;    // 현재 질문 번호 (1 ~ 5)
  currentQuestion?: string;  // 현재 출제된 질문
  isFinished?: boolean;
  overallReview?: string;
  createdAt: string;
  updatedAt: string;
}

export const TARGET_BANKS = [
  'KB국민은행',
  '신한은행',
  '우리은행',
  '하나은행',
  'NH농협은행',
  'IBK기업은행',
  'KDB산업은행',
  '카카오뱅크',
  '토스뱅크',
  '미래에셋증권',
  '한국투자증권',
  'NH투자증권',
  '삼성증권',
  'KB증권',
  '신용보증기금',
  '기술보증기금',
];

export const TARGET_ROLES = [
  { id: 'corporate_rm', name: '기업금융 (RM)', desc: '중소·대기업 여신심사, 재무제표 분석, 기업 유치 및 맞춤형 종합 금융 솔루션 제공' },
  { id: 'retail_banking', name: '개인금융 (리테일)', desc: '영업점 창구 예적금, 가계대출 상담, 교차판매 및 신규 고객 유치' },
  { id: 'digital_it', name: '디지털 / IT / 핀테크', desc: '모바일 뱅킹 플랫폼 개발, 마이데이터, 생성형 AI 서비스 구축 및 코어뱅킹 운영' },
  { id: 'wealth_pb', name: '자산관리 (WM / PB)', desc: '고액자산가(HNW) 포트폴리오 설계, 펀드/채권/신탁 상품 제안 및 상속·세무 컨설팅' },
  { id: 'ib_trading', name: '투자은행 (IB / Deal)', desc: '기업공개(IPO), 유상증자, 메자닌/회사채 인수, M&A 자문 및 구조화 금융' },
  { id: 'risk_compliance', name: '리스크관리 / 심사', desc: '신용평가 모델링, 거시경제 충격 스트레스 테스트 및 내부통제·준법감시' },
];
