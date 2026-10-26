"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Clock,
  FileText,
  AlertCircle,
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
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [error, setError] = useState("");

  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/quizzes");
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data);
        if (data.length > 0) {
          setSelectedQuizId(data[0].id);
          setAccessCode(data[0].accessCode);
        }
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

  const handleSelectQuiz = (quiz: QuizSummary) => {
    setSelectedQuizId(quiz.id);
    setAccessCode(quiz.accessCode);
    setError("");
  };

  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanId = studentId.trim();
    const cleanName = fullName.trim();
    const cleanCode = accessCode.trim();

    if (!cleanId) {
      setError("กรุณากรอกรหัสนักศึกษา");
      return;
    }
    if (!cleanName) {
      setError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }

    // Find quiz by access code or selected ID
    const target = quizzes.find(
      (q) =>
        q.accessCode.toLowerCase() === cleanCode.toLowerCase() ||
        q.id === selectedQuizId,
    );

    if (!target) {
      setError("ไม่พบชุดข้อสอบหรือรหัสห้องสอบไม่ถูกต้อง");
      return;
    }

    // Save student details in sessionStorage
    sessionStorage.setItem("studentId", cleanId);
    sessionStorage.setItem("fullName", cleanName);

    router.push(`/quiz/${target.id}`);
  };

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 max-w-5xl mx-auto w-full">
      {/* Hero Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          เข้าสู่ห้องสอบออนไลน์
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400 text-sm sm:text-base max-w-xl mx-auto">
          กรอกรหัสนักศึกษาและชื่อ-นามสกุล เพื่อเริ่มต้นทำแบบทดสอบ
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Entry Card */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            ข้อมูลผู้เข้าสอบ
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
            โปรดระบุข้อมูลที่ถูกต้องสำหรับบันทึกคะแนน
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleStartExam} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                รหัสนักศึกษา <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น 6512345678"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all text-sm font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                ชื่อ - นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น นายสมชาย ใจดี"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                รหัสห้องสอบ (Access Code)
              </label>
              <input
                type="text"
                placeholder="เช่น 123456"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all text-sm font-mono tracking-widest text-center uppercase"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>เริ่มทำข้อสอบ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Quizzes Selection List */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>เลือกชุดข้อสอบ ({quizzes.length})</span>
            </h2>
            <span className="text-xs text-zinc-500">
              คลิกเพื่อเลือกทำข้อสอบ
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse"
                />
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/40 dark:bg-zinc-900/40">
              <FileText className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                ยังไม่มีชุดข้อสอบในระบบ
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                ให้อาจารย์เข้าหน้า Admin เพื่อนำเข้าข้อสอบ
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz) => {
                const isSelected = selectedQuizId === quiz.id;
                return (
                  <div
                    key={quiz.id}
                    onClick={() => handleSelectQuiz(quiz)}
                    className={`cursor-pointer p-5 rounded-2xl border transition-all ${
                      isSelected
                        ? "border-zinc-900 bg-white dark:border-zinc-100 dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-900 dark:ring-zinc-100"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                            รหัส: {quiz.accessCode}
                          </span>
                          {quiz.settings.timeLimit > 0 ? (
                            <span className="flex items-center gap-1 text-xs text-zinc-500">
                              <Clock className="w-3.5 h-3.5" />
                              {quiz.settings.timeLimit} นาที
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500">
                              ไม่จำกัดเวลา
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                          {quiz.title}
                        </h3>

                        {quiz.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                            {quiz.description}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          {quiz.questionCount} ข้อ
                        </span>
                        <div className="mt-2">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected
                                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                                : "border-zinc-300 dark:border-zinc-700"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-white dark:bg-zinc-900" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
