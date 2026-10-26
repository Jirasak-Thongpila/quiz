"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Clock,
  AlertCircle,
  GraduationCap,
  CheckCircle2,
  ChevronRight,
  X,
  User,
  IdCard,
} from "lucide-react";

interface QuizSummary {
  id: string;
  title: string;
  description: string;
  accessCode: string;
  questionCount: number;
  submissionCount: number;
  settings: {
    timeLimit: number;
    allowRetake: boolean;
  };
}

export default function HomePage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");

  // Modal state
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [targetQuiz, setTargetQuiz] = useState<QuizSummary | null>(null);
  const [modalError, setModalError] = useState("");

  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/quizzes");
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data);
      }
    } catch (err) {
      console.error("Error fetching quizzes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Restore previous student info if available
    const savedId = sessionStorage.getItem("studentId") || "";
    const savedName = sessionStorage.getItem("fullName") || "";
    if (savedId || savedName) {
      queueMicrotask(() => {
        if (savedId) setStudentId(savedId);
        if (savedName) setFullName(savedName);
      });
    }

    queueMicrotask(() => {
      fetchQuizzes();
    });
  }, [fetchQuizzes]);

  // Real-time matched quiz preview
  const matchedQuiz = useMemo(() => {
    const cleanCode = accessCode.trim().toLowerCase();
    if (!cleanCode) return null;
    return quizzes.find((q) => q.accessCode.trim().toLowerCase() === cleanCode) || null;
  }, [quizzes, accessCode]);

  // When clicking "เข้าร่วมห้องสอบ" from center code input
  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanCode = accessCode.trim();
    if (!cleanCode) {
      setError("กรุณากรอกรหัสห้องสอบที่อาจารย์กำหนด");
      return;
    }

    // Match quiz by access code
    const found = quizzes.find(
      (q) => q.accessCode.trim().toLowerCase() === cleanCode.toLowerCase()
    );

    if (!found) {
      setError("ไม่พบชุดข้อสอบจากรหัสห้องสอบนี้ โปรดตรวจสอบรหัสที่อาจารย์แจ้งอีกครั้ง");
      return;
    }

    setTargetQuiz(found);
    setModalError("");
    setShowStudentModal(true);
  };

  // When clicking a quiz from the compact self-study list below
  const handleSelectQuizDirectly = (quiz: QuizSummary) => {
    setAccessCode(quiz.accessCode);
    setTargetQuiz(quiz);
    setError("");
    setModalError("");
    setShowStudentModal(true);
  };

  // Submit student info in Modal to enter exam
  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    const cleanId = studentId.trim();
    const cleanName = fullName.trim();

    if (!cleanId) {
      setModalError("กรุณากรอกรหัสนักศึกษา");
      return;
    }
    if (!cleanName) {
      setModalError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    if (!targetQuiz) {
      setModalError("ไม่พบข้อมูลชุดข้อสอบ");
      return;
    }

    // Save student details in sessionStorage
    sessionStorage.setItem("studentId", cleanId);
    sessionStorage.setItem("fullName", cleanName);

    setShowStudentModal(false);
    router.push(`/quiz/${targetQuiz.id}`);
  };

  return (
    <div className="flex-1 py-12 px-4 sm:px-6 max-w-4xl mx-auto w-full">
      {/* Hero Header */}
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          เข้าสู่ห้องสอบออนไลน์
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400 text-sm sm:text-base max-w-md mx-auto">
          ใส่รหัสห้องสอบที่อาจารย์กำหนด เพื่อเข้าทำแบบทดสอบ
        </p>
      </div>

      {/* Main Center Code Entry Area (Clean Kahoot-style, No bulky card container) */}
      <div className="max-w-md mx-auto">
        <form onSubmit={handleJoinWithCode} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="ใส่รหัสห้องสอบ (เช่น 123456)"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              className="w-full px-5 py-4 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-all text-xl font-mono font-bold tracking-widest text-center shadow-xs"
              autoFocus
            />
          </div>

          {/* Matched Quiz Live Preview */}
          {matchedQuiz && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in transition-all">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-emerald-900 dark:text-emerald-200 truncate">
                  {matchedQuiz.title}
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-2">
                  <span>{matchedQuiz.questionCount} ข้อ</span>
                  <span>•</span>
                  <span>
                    {matchedQuiz.settings.timeLimit > 0
                      ? `${matchedQuiz.settings.timeLimit} นาที`
                      : "ไม่จำกัดเวลา"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 px-6 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold text-base flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] cursor-pointer"
          >
            <span>เข้าร่วมห้องสอบ</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Secondary Lower Section: Compact Self-study Quizzes List */}
      <div className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-zinc-500" />
              <span>หรือเลือกทำแบบฝึกหัดด้วยตนเอง ({quizzes.length})</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              คลิกชุดข้อสอบด้านล่างเพื่อเลือกทำแบบฝึกหัดได้ทันทีโดยไม่ต้องจำรหัส
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse"
              />
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/40 dark:bg-zinc-900/40">
            <p className="text-xs text-zinc-500">ยังไม่มีชุดข้อสอบในระบบ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                onClick={() => handleSelectQuizDirectly(quiz)}
                className="group cursor-pointer p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all hover:shadow-xs flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      รหัส: {quiz.accessCode}
                    </span>
                    {quiz.settings.timeLimit > 0 ? (
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {quiz.settings.timeLimit} นาที
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-500">ไม่จำกัดเวลา</span>
                    )}
                    <span className="text-[11px] text-zinc-400">
                      • {quiz.questionCount} ข้อ
                    </span>
                  </div>
                  <h3 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                    {quiz.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectQuizDirectly(quiz);
                  }}
                  className="shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-zinc-100 dark:group-hover:text-zinc-900 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>เลือกสอบ</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pop-up Modal: Student Info Entry */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            {/* Close Button */}
            <button
              onClick={() => setShowStudentModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                ข้อมูลผู้เข้าสอบ
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                กรอกรหัสนักศึกษาและชื่อเพื่อบันทึกผลคะแนน
              </p>
            </div>

            {/* Target Quiz Info Card in Modal */}
            {targetQuiz && (
              <div className="mb-5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-xs">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                  ชุดข้อสอบที่เลือก:
                </span>
                <div className="font-bold text-zinc-900 dark:text-zinc-100">
                  {targetQuiz.title}
                </div>
                <div className="mt-1 flex items-center gap-2 text-zinc-500">
                  <span>รหัสห้อง: {targetQuiz.accessCode}</span>
                  <span>•</span>
                  <span>{targetQuiz.questionCount} ข้อ</span>
                  <span>•</span>
                  <span>
                    {targetQuiz.settings.timeLimit > 0
                      ? `${targetQuiz.settings.timeLimit} นาที`
                      : "ไม่จำกัดเวลา"}
                  </span>
                </div>
              </div>
            )}

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <IdCard className="w-3.5 h-3.5 text-zinc-500" />
                  <span>รหัสนักศึกษา <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น 6712732103"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all text-sm font-mono"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span>ชื่อ - นามสกุล <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น นายจิรศักดิ์ ทองพิละ"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all text-sm"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium text-sm transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-2 py-3 px-4 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>เริ่มทำข้อสอบ</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
