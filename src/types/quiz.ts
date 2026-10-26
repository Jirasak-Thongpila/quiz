export interface QuestionOption {
  key: string; // "ก", "ข", "ค", "ง" or "A", "B", "C", "D"
  text: string;
}

export interface QuizQuestion {
  id: string;
  number: number;
  question: string;
  options: QuestionOption[];
  correctAnswerKey: string; // e.g. "ข" or "B"
  correctAnswerText: string; // e.g. "5 เลเยอร์"
  points: number; // default 1
}

export interface QuizSettings {
  timeLimit: number; // in minutes, 0 = unlimited
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  allowRetake: boolean;
  tabSwitchWarning: boolean;
  showScoreOnComplete: boolean;
  googleSheetsWebhook: string; // URL to Google Apps Script Webhook
  isPublic?: boolean; // true = สาธารณะ (แสดงหน้าแรก), false = ส่วนตัว (ให้อาจารย์ส่งรหัสให้เท่านั้น)
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  accessCode: string; // 6-digit room code, e.g. "839102"
  settings: QuizSettings;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  fullName: string;
  score: number;
  totalScore: number;
  percentage: number;
  timeTakenSeconds: number;
  timeTakenFormatted: string;
  tabSwitchCount: number;
  answers: Record<string, string>; // questionId -> selectedOptionKey
  googleSheetsStatus: 'synced' | 'failed' | 'not_configured';
  googleSheetsError?: string;
  submittedAt: string;
}
