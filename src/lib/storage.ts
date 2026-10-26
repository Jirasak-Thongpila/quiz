import fs from 'fs/promises';
import path from 'path';
import { Quiz, QuizSubmission, QuizQuestion } from '@/types/quiz';

const DATA_DIR = path.join(process.cwd(), 'data');
const QUIZZES_FILE = path.join(DATA_DIR, 'quizzes.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

// Ensure directory exists
async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    // Ignore if directory exists
  }
}

// Default Seed Questions from user prompt
const SEED_QUESTIONS: QuizQuestion[] = [
  {
    id: "q_1",
    number: 1,
    question: "แบบจำลองของอินเทอร์เน็ต (TCP/IP protocol suite) แบ่งการทำงานออกเป็นกี่เลเยอร์",
    options: [
      { key: "ก", text: "4 เลเยอร์" },
      { key: "ข", text: "5 เลเยอร์" },
      { key: "ค", text: "6 เลเยอร์" },
      { key: "ง", text: "7 เลเยอร์" }
    ],
    correctAnswerKey: "ข",
    correctAnswerText: "5 เลเยอร์",
    points: 1
  },
  {
    id: "q_2",
    number: 2,
    question: "แบบจำลอง OSI แบ่งการทำงานออกเป็นกี่เลเยอร์",
    options: [
      { key: "ก", text: "4 เลเยอร์" },
      { key: "ข", text: "5 เลเยอร์" },
      { key: "ค", text: "6 เลเยอร์" },
      { key: "ง", text: "7 เลเยอร์" }
    ],
    correctAnswerKey: "ง",
    correctAnswerText: "7 เลเยอร์",
    points: 1
  },
  {
    id: "q_3",
    number: 3,
    question: "แบบจำลอง OSI (Open Systems Interconnection) ถูกพัฒนาขึ้นโดยองค์กรใด",
    options: [
      { key: "ก", text: "IEEE" },
      { key: "ข", text: "ITU-T" },
      { key: "ค", text: "ISO" },
      { key: "ง", text: "ANSI" }
    ],
    correctAnswerKey: "ค",
    correctAnswerText: "ISO",
    points: 1
  },
  {
    id: "q_4",
    number: 4,
    question: "เลเยอร์ใดบ้างที่มีในแบบจำลอง OSI แต่ไม่มีในแบบจำลองของอินเทอร์เน็ต",
    options: [
      { key: "ก", text: "Session และ Presentation" },
      { key: "ข", text: "Network และ Transport" },
      { key: "ค", text: "Data link และ Physical" },
      { key: "ง", text: "Application และ Session" }
    ],
    correctAnswerKey: "ก",
    correctAnswerText: "Session และ Presentation",
    points: 1
  },
  {
    id: "q_5",
    number: 5,
    question: "ที่เครื่องต้นทาง ข้อมูลจะเคลื่อนผ่านเลเยอร์ต่าง ๆ ในลักษณะใด",
    options: [
      { key: "ก", text: "จากเลเยอร์ล่างสุดขึ้นไปเลเยอร์บนสุด" },
      { key: "ข", text: "จากเลเยอร์บนสุดลงมาเลเยอร์ล่างสุด" },
      { key: "ค", text: "ส่งตรงจากเลเยอร์ 5 ไปยังสื่อโดยไม่ผ่านเลเยอร์อื่น" },
      { key: "ง", text: "เริ่มจากเลเยอร์ 3 แล้วกระจายขึ้นและลง" }
    ],
    correctAnswerKey: "ข",
    correctAnswerText: "จากเลเยอร์บนสุดลงมาเลเยอร์ล่างสุด",
    points: 1
  },
  {
    id: "q_6",
    number: 6,
    question: "เพียร์ทูเพียร์โพรเซส (Peer-to-Peer Process) หมายถึงข้อใด",
    options: [
      { key: "ก", text: "การที่เลเยอร์ต่างกันในเครื่องเดียวกันติดต่อกันโดยตรง" },
      { key: "ข", text: "การที่เลเยอร์เดียวกันของสองเครื่องติดต่อกันโดยใช้โพรโตคอลเดียวกัน" },
      { key: "ค", text: "การส่งข้อมูลระหว่างโหนดที่อยู่ติดกันเท่านั้น" },
      { key: "ง", text: "การเชื่อมต่อคอมพิวเตอร์โดยไม่ต้องมีเซิร์ฟเวอร์" }
    ],
    correctAnswerKey: "ข",
    correctAnswerText: "การที่เลเยอร์เดียวกันของสองเครื่องติดต่อกันโดยใช้โพรโตคอลเดียวกัน",
    points: 1
  },
  {
    id: "q_7",
    number: 7,
    question: "ข้อใดกล่าวถึงอินเทอร์เฟซ (Interface) ระหว่างเลเยอร์ได้ถูกต้อง",
    options: [
      { key: "ก", text: "หากเปลี่ยนการทำงานภายในเลเยอร์ใด ต้องแก้ไขทุกเลเยอร์ตามไปด้วย" },
      { key: "ข", text: "อินเทอร์เฟซใช้เชื่อมต่อระหว่างเครื่องต้นทางกับปลายทางโดยตรง" },
      { key: "ค", text: "ถ้าอินเทอร์เฟซไม่เปลี่ยน การแก้ไขการทำงานภายในเลเยอร์หนึ่งจะไม่กระทบเลเยอร์อื่น" },
      { key: "ง", text: "อินเทอร์เฟซมีเฉพาะในฟิสิคัลเลเยอร์" }
    ],
    correctAnswerKey: "ค",
    correctAnswerText: "ถ้าอินเทอร์เฟซไม่เปลี่ยน การแก้ไขการทำงานภายในเลเยอร์หนึ่งจะไม่กระทบเลเยอร์อื่น",
    points: 1
  },
  {
    id: "q_8",
    number: 8,
    question: "เลเยอร์ใดเพิ่มทั้งเฮดเดอร์ (Header) และเทรเลอร์ (Trailer) ให้กับข้อมูล",
    options: [
      { key: "ก", text: "Application layer" },
      { key: "ข", text: "Transport layer" },
      { key: "ค", text: "Network layer" },
      { key: "ง", text: "Data link layer" }
    ],
    correctAnswerKey: "ง",
    correctAnswerText: "Data link layer",
    points: 1
  },
  {
    id: "q_9",
    number: 9,
    question: "การกำหนดคุณสมบัติทางกลและทางไฟฟ้า การแปลงบิต 0 และ 1 เป็นสัญญาณ และการกำหนดอัตราการส่งข้อมูล เป็นหน้าที่ของเลเยอร์ใด",
    options: [
      { key: "ก", text: "Physical layer" },
      { key: "ข", text: "Data link layer" },
      { key: "ค", text: "Network layer" },
      { key: "ง", text: "Transport layer" }
    ],
    correctAnswerKey: "ก",
    correctAnswerText: "Physical layer",
    points: 1
  },
  {
    id: "q_10",
    number: 10,
    question: "การหาเส้นทาง (Routing) เพื่อส่งข้อมูลข้ามเครือข่ายไปยังปลายทาง เป็นหน้าที่ของเลเยอร์ใด",
    options: [
      { key: "ก", text: "Data link layer" },
      { key: "ข", text: "Network layer" },
      { key: "ค", text: "Transport layer" },
      { key: "ง", text: "Application layer" }
    ],
    correctAnswerKey: "ข",
    correctAnswerText: "Network layer",
    points: 1
  },
  {
    id: "q_11",
    number: 11,
    question: "หน่วยข้อมูลที่ทรานสปอร์ตเลเยอร์แบ่งและใส่หมายเลขกำกับ (Sequence number) เรียกว่าอะไร",
    options: [
      { key: "ก", text: "เฟรม (Frame)" },
      { key: "ข", text: "แพ็กเก็ต (Packet)" },
      { key: "ค", text: "เซ็กเมนต์ (Segment)" },
      { key: "ง", text: "บิต (Bit)" }
    ],
    correctAnswerKey: "ค",
    correctAnswerText: "เซ็กเมนต์ (Segment)",
    points: 1
  },
  {
    id: "q_12",
    number: 12,
    question: "ฟิสิคัลแอดเดรส (Physical address) ถูกเพิ่มเข้าไปในเฮดเดอร์ที่เลเยอร์ใด",
    options: [
      { key: "ก", text: "Physical layer" },
      { key: "ข", text: "Data link layer" },
      { key: "ค", text: "Network layer" },
      { key: "ง", text: "Transport layer" }
    ],
    correctAnswerKey: "ข",
    correctAnswerText: "Data link layer",
    points: 1
  },
  {
    id: "q_13",
    number: 13,
    question: "การส่งข้อมูลแบบ hop-to-hop (node-to-node delivery) เป็นความรับผิดชอบของเลเยอร์ใด",
    options: [
      { key: "ก", text: "Data link layer" },
      { key: "ข", text: "Network layer" },
      { key: "ค", text: "Transport layer" },
      { key: "ง", text: "Application layer" }
    ],
    correctAnswerKey: "ก",
    correctAnswerText: "Data link layer",
    points: 1
  },
  {
    id: "q_14",
    number: 14,
    question: "การส่งข้อมูลจากต้นทางถึงปลายทาง (source-to-destination หรือ end-to-end delivery) ซึ่งอาจข้ามหลายเครือข่าย เป็นความรับผิดชอบของเลเยอร์ใด",
    options: [
      { key: "ก", text: "Physical layer" },
      { key: "ข", text: "Data link layer" },
      { key: "ค", text: "Network layer" },
      { key: "ง", text: "Session layer" }
    ],
    correctAnswerKey: "ค",
    correctAnswerText: "Network layer",
    points: 1
  },
  {
    id: "q_15",
    number: 15,
    question: "เมื่อส่งข้อมูลข้ามเครือข่ายผ่านเราเตอร์ (Router) ข้อใดกล่าวถูกต้อง",
    options: [
      { key: "ก", text: "ลอจิคัลแอดเดรสและฟิสิคัลแอดเดรสคงเดิมตลอดเส้นทาง" },
      { key: "ข", text: "ลอจิคัลแอดเดรสเปลี่ยนไป แต่ฟิสิคัลแอดเดรสคงเดิม" },
      { key: "ค", text: "ทั้งลอจิคัลแอดเดรสและฟิสิคัลแอดเดรสเปลี่ยนทุกครั้ง" },
      { key: "ง", text: "ลอจิคัลแอดเดรสคงเดิม แต่ฟิสิคัลแอดเดรสเปลี่ยนไปในแต่ละช่วง" }
    ],
    correctAnswerKey: "ง",
    correctAnswerText: "ลอจิคัลแอดเดรสคงเดิม แต่ฟิสิคัลแอดเดรสเปลี่ยนไปในแต่ละช่วง",
    points: 1
  },
  {
    id: "q_16",
    number: 16,
    question: "พอร์ตแอดเดรส (Port address) ในทรานสปอร์ตเลเยอร์ใช้ระบุสิ่งใด",
    options: [
      { key: "ก", text: "เครื่องคอมพิวเตอร์ปลายทางในเครือข่าย" },
      { key: "ข", text: "โพรเซส (Process) ที่รับหรือส่งข้อมูลภายในเครื่อง" },
      { key: "ค", text: "การ์ดเครือข่ายของอุปกรณ์" },
      { key: "ง", text: "เส้นทางที่ข้อมูลเดินทาง" }
    ],
    correctAnswerKey: "ข",
    correctAnswerText: "โพรเซส (Process) ที่รับหรือส่งข้อมูลภายในเครื่อง",
    points: 1
  },
  {
    id: "q_17",
    number: 17,
    question: "หมายเลขกำกับ (Sequence number) ของเซ็กเมนต์มีประโยชน์อย่างไร",
    options: [
      { key: "ก", text: "ใช้รวมเซ็กเมนต์ที่ได้รับให้กลับเป็นข้อมูลเดิมตามลำดับ" },
      { key: "ข", text: "ใช้กำหนดเส้นทางของแพ็กเก็ต" },
      { key: "ค", text: "ใช้แปลงบิตเป็นสัญญาณไฟฟ้า" },
      { key: "ง", text: "ใช้ระบุแอดเดรสของการ์ดเครือข่าย" }
    ],
    correctAnswerKey: "ก",
    correctAnswerText: "ใช้รวมเซ็กเมนต์ที่ได้รับให้กลับเป็นข้อมูลเดิมตามลำดับ",
    points: 1
  },
  {
    id: "q_18",
    number: 18,
    question: "การติดต่อระหว่างโพรเซสแบบใดที่ต้องสร้างการเชื่อมต่อกันก่อน จึงจะรับส่งข้อมูลได้",
    options: [
      { key: "ก", text: "Connectionless" },
      { key: "ข", text: "Hop-to-hop" },
      { key: "ค", text: "Connection-oriented" },
      { key: "ง", text: "Multipoint" }
    ],
    correctAnswerKey: "ค",
    correctAnswerText: "Connection-oriented",
    points: 1
  },
  {
    id: "q_19",
    number: 19,
    question: "การเข้ารหัส การถอดรหัส และการบีบอัดข้อมูล ในแบบจำลอง OSI เป็นหน้าที่ของเลเยอร์ใด",
    options: [
      { key: "ก", text: "Session layer" },
      { key: "ข", text: "Presentation layer" },
      { key: "ค", text: "Transport layer" },
      { key: "ง", text: "Data link layer" }
    ],
    correctAnswerKey: "ข",
    correctAnswerText: "Presentation layer",
    points: 1
  },
  {
    id: "q_20",
    number: 20,
    question: "เลเยอร์ใดทำหน้าที่เชื่อมโยงระหว่างกลุ่มเลเยอร์ที่สนับสนุนการทำงานของเครือข่าย (network support layers) กับเลเยอร์ที่สนับสนุนผู้ใช้ (user support layer)",
    options: [
      { key: "ก", text: "Physical layer" },
      { key: "ข", text: "Network layer" },
      { key: "ค", text: "Application layer" },
      { key: "ง", text: "Transport layer" }
    ],
    correctAnswerKey: "ง",
    correctAnswerText: "Transport layer",
    points: 1
  }
];

const SEED_QUIZ: Quiz = {
  id: "quiz-sample-network",
  title: "แบบทดสอบเครือข่ายคอมพิวเตอร์ (TCP/IP & OSI Models)",
  description: "แบบทดสอบความรู้พื้นฐานเกี่ยวกับ Layer ในแบบจำลอง OSI และ TCP/IP Protocol Suite",
  accessCode: "123456",
  settings: {
    timeLimit: 20, // 20 minutes
    shuffleQuestions: true,
    shuffleChoices: true,
    allowRetake: false,
    tabSwitchWarning: true,
    showScoreOnComplete: true,
    googleSheetsWebhook: ""
  },
  questions: SEED_QUESTIONS,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

/**
 * Reads all quizzes from file (with automatic seed)
 */
export async function getQuizzes(): Promise<Quiz[]> {
  await ensureDir();
  try {
    const data = await fs.readFile(QUIZZES_FILE, 'utf-8');
    const quizzes = JSON.parse(data) as Quiz[];
    return quizzes;
  } catch (err) {
    // File doesn't exist or is invalid; seed it
    const initial = [SEED_QUIZ];
    await fs.writeFile(QUIZZES_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

/**
 * Saves a quiz (create or update)
 */
export async function saveQuiz(quiz: Quiz): Promise<Quiz> {
  const quizzes = await getQuizzes();
  const index = quizzes.findIndex(q => q.id === quiz.id);

  quiz.updatedAt = new Date().toISOString();

  if (index >= 0) {
    quizzes[index] = quiz;
  } else {
    quizzes.unshift(quiz);
  }

  await ensureDir();
  const tempPath = `${QUIZZES_FILE}.tmp.${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(quizzes, null, 2), 'utf-8');
  await fs.rename(tempPath, QUIZZES_FILE);

  return quiz;
}

/**
 * Gets a quiz by ID
 */
export async function getQuizById(id: string): Promise<Quiz | null> {
  const quizzes = await getQuizzes();
  return quizzes.find(q => q.id === id) || null;
}

/**
 * Gets a quiz by 6-digit access code
 */
export async function getQuizByAccessCode(code: string): Promise<Quiz | null> {
  const quizzes = await getQuizzes();
  const cleanCode = code.trim().toLowerCase();
  return quizzes.find(q => q.accessCode.trim().toLowerCase() === cleanCode) || null;
}

/**
 * Deletes a quiz by ID
 */
export async function deleteQuiz(id: string): Promise<boolean> {
  const quizzes = await getQuizzes();
  const filtered = quizzes.filter(q => q.id !== id);
  if (filtered.length === quizzes.length) return false;

  await ensureDir();
  const tempPath = `${QUIZZES_FILE}.tmp.${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(filtered, null, 2), 'utf-8');
  await fs.rename(tempPath, QUIZZES_FILE);
  return true;
}

/**
 * Reads all submissions (optionally filtered by quizId)
 */
export async function getSubmissions(quizId?: string): Promise<QuizSubmission[]> {
  await ensureDir();
  try {
    const data = await fs.readFile(SUBMISSIONS_FILE, 'utf-8');
    const list = JSON.parse(data) as QuizSubmission[];
    if (quizId) {
      return list.filter(s => s.quizId === quizId);
    }
    return list;
  } catch (err) {
    return [];
  }
}

/**
 * Saves a submission
 */
export async function saveSubmission(submission: QuizSubmission): Promise<QuizSubmission> {
  const list = await getSubmissions();
  list.unshift(submission);

  await ensureDir();
  const tempPath = `${SUBMISSIONS_FILE}.tmp.${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(list, null, 2), 'utf-8');
  await fs.rename(tempPath, SUBMISSIONS_FILE);

  return submission;
}

/**
 * Updates a submission status (e.g. after Google Sheets retry)
 */
export async function updateSubmission(id: string, updates: Partial<QuizSubmission>): Promise<QuizSubmission | null> {
  const list = await getSubmissions();
  const index = list.findIndex(s => s.id === id);
  if (index === -1) return null;

  list[index] = { ...list[index], ...updates };

  await ensureDir();
  const tempPath = `${SUBMISSIONS_FILE}.tmp.${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(list, null, 2), 'utf-8');
  await fs.rename(tempPath, SUBMISSIONS_FILE);

  return list[index];
}

/**
 * Deletes a submission by ID
 */
export async function deleteSubmission(id: string): Promise<boolean> {
  const list = await getSubmissions();
  const filtered = list.filter(s => s.id !== id);
  if (filtered.length === list.length) return false;

  await ensureDir();
  const tempPath = `${SUBMISSIONS_FILE}.tmp.${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(filtered, null, 2), 'utf-8');
  await fs.rename(tempPath, SUBMISSIONS_FILE);
  return true;
}
