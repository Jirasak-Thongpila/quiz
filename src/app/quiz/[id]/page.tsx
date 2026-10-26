'use client';

import { useState, useEffect, useRef, use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  HelpCircle,
  Home,
  RefreshCw,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Quiz, QuizQuestion } from '@/types/quiz';

function QuizTakingContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: quizId } = use(params);

  // Quiz state
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Student Info
  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentInputModal, setStudentInputModal] = useState(false);

  // Exam flow states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> optionKey
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Result state
  const [completed, setCompleted] = useState(false);
  const [resultData, setResultData] = useState<{
    score: number | null;
    totalScore: number | null;
    percentage: number | null;
    showScore: boolean;
    googleSheetsStatus: string;
  } | null>(null);

  // Load Quiz & Check Student Info
  useEffect(() => {
    const sId = sessionStorage.getItem('studentId') || '';
    const sName = sessionStorage.getItem('fullName') || '';

    if (!sId || !sName) {
      setStudentInputModal(true);
    } else {
      setStudentId(sId);
      setFullName(sName);
    }

    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/quizzes/${quizId}`);
      if (!res.ok) {
        const err = await res.json();
        setLoadError(err.error || 'ไม่สามารถโหลดข้อสอบได้');
        return;
      }
      const data: Quiz = await res.json();
      setQuiz(data);

      // Initialize Timer if timeLimit > 0
      if (data.settings.timeLimit > 0) {
        setTimeLeft(data.settings.timeLimit * 60);
      }
      setStartTime(Date.now());
    } catch (err) {
      setLoadError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  // Timer countdown hook
  useEffect(() => {
    if (timeLeft === null || completed) return;

    if (timeLeft <= 0) {
      // Auto submit when time runs out
      handleSubmitExam();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, completed]);

  // Tab switch detection hook
  useEffect(() => {
    if (!quiz?.settings.tabSwitchWarning || completed) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const next = prev + 1;
          setShowTabWarning(true);
          return next;
        });
      }
    };

    const handleBlur = () => {
      setTabSwitchCount(prev => {
        const next = prev + 1;
        setShowTabWarning(true);
        return next;
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [quiz?.settings.tabSwitchWarning, completed]);

  // Handle option selection
  const handleSelectOption = (questionId: string, optionKey: string) => {
    if (completed || submitting) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  // Keyboard shortcut listener (1-4 or ก-ง for options, Arrows for nav)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (completed || submitting || showSubmitConfirm || showTabWarning || studentInputModal) return;
      if (!quiz || !quiz.questions[currentIndex]) return;

      const currentQ = quiz.questions[currentIndex];
      const key = e.key.toLowerCase();

      // Number keys 1, 2, 3, 4, 5
      const num = parseInt(key, 10);
      if (!isNaN(num) && num >= 1 && num <= currentQ.options.length) {
        handleSelectOption(currentQ.id, currentQ.options[num - 1].key);
        return;
      }

      // Arrows
      if (e.key === 'ArrowRight' && currentIndex < quiz.questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quiz, currentIndex, completed, submitting, showSubmitConfirm, showTabWarning, studentInputModal]);

  // Submit Exam handler
  const handleSubmitExam = async () => {
    if (!quiz || submitting || completed) return;

    setSubmitting(true);
    setSubmitError('');

    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));

    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          fullName,
          answers,
          timeTakenSeconds: timeSpentSeconds,
          tabSwitchCount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'เกิดข้อผิดพลาดในการส่งข้อสอบ');
        setSubmitting(false);
        return;
      }

      setResultData({
        score: data.score,
        totalScore: data.totalScore,
        percentage: data.percentage,
        showScore: Boolean(data.showScore),
        googleSheetsStatus: data.googleSheetsStatus,
      });

      setCompleted(true);
      setShowSubmitConfirm(false);

      // Trigger Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {
        // Ignore confetti if unsupported
      }
    } catch (err) {
      setSubmitError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ กรุณากดลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStudentModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !fullName.trim()) return;

    sessionStorage.setItem('studentId', studentId.trim());
    sessionStorage.setItem('fullName', fullName.trim());
    setStudentInputModal(false);
    setStartTime(Date.now());
  };

  // Helper format time
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent dark:border-zinc-100 dark:border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-500 font-medium">กำลังโหลดแบบทดสอบ...</p>
        </div>
      </div>
    );
  }

  if (loadError || !quiz) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">เกิดข้อผิดพลาด</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">{loadError || 'ไม่พบแบบทดสอบ'}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium text-sm"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  // Completed Screen
  if (completed && resultData) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 py-12">
        <div className="max-w-lg w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 border border-zinc-200 dark:border-zinc-700">
            <CheckCircle2 className="w-8 h-8 text-zinc-900 dark:text-zinc-100" />
          </div>

          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            ส่งข้อสอบเรียบร้อยแล้ว
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {quiz.title}
          </p>

          <div className="mt-6 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">รหัสนักศึกษา:</span>
              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{studentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">ชื่อ - นามสกุล:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{fullName}</span>
            </div>
            {tabSwitchCount > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                <span>บันทึกการสลับหน้าจอ:</span>
                <span className="font-bold">{tabSwitchCount} ครั้ง</span>
              </div>
            )}
          </div>

          {resultData.showScore && resultData.score !== null ? (
            <div className="mt-6 py-6 px-4 rounded-2xl border border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
                คะแนนที่คุณได้
              </span>
              <div className="text-4xl sm:text-5xl font-black mt-1 font-mono">
                {resultData.score}{' '}
                <span className="text-lg font-normal text-zinc-400 dark:text-zinc-500">
                  / {resultData.totalScore}
                </span>
              </div>
              <p className="text-xs font-medium mt-1 text-zinc-300 dark:text-zinc-700">
                คิดเป็นร้อยละ {resultData.percentage}%
              </p>
            </div>
          ) : (
            <div className="mt-6 p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
              ระบบได้บันทึกคำตอบของคุณแล้ว อาจารย์ผู้สอนจะเป็นผู้แจ้งผลคะแนนในภายหลัง
            </div>
          )}

          {/* Google Sheets Status Badge */}
          <div className="mt-5 flex items-center justify-center gap-2 text-xs">
            {resultData.googleSheetsStatus === 'synced' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ส่งผลคะแนนเข้า Google Sheets เรียบร้อย
              </span>
            ) : resultData.googleSheetsStatus === 'failed' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                บันทึกคะแนนในระบบแล้ว (Google Sheets กำลังรอซิงค์)
              </span>
            ) : (
              <span className="text-zinc-400">บันทึกข้อมูลในระบบเรียบร้อย</span>
            )}
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Home className="w-4 h-4" />
              <span>กลับหน้าหลัก</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion: QuizQuestion | undefined = quiz.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = quiz.questions.length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 select-none">
      {/* Sticky Exam Status Bar */}
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>{quiz.title}</span>
          </h1>
          <div className="flex items-center gap-2 sm:gap-4 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            <span>
              ผู้สอบ: <strong className="text-zinc-800 dark:text-zinc-200">{fullName}</strong> ({studentId})
            </span>
            {tabSwitchCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                สลับจอ: {tabSwitchCount} ครั้ง
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer Badge */}
          {timeLeft !== null && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-sm font-bold transition-colors ${
                timeLeft < 120
                  ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 animate-pulse'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}

          {/* Quick Submit button */}
          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>ส่งข้อสอบ</span>
          </button>
        </div>
      </div>

      {/* Main Exam Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* Question Area (8 cols) */}
        <div className="lg:col-span-8 flex flex-col">
          {currentQuestion && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm flex-1 flex flex-col">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  ข้อที่ {currentIndex + 1} จาก {totalQuestions}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 font-mono text-zinc-600 dark:text-zinc-400">
                  {currentQuestion.points || 1} คะแนน
                </span>
              </div>

              {/* Question Text */}
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-relaxed mb-8">
                {currentQuestion.question}
              </h2>

              {/* Options List */}
              <div className="space-y-3 mb-8 flex-1">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = answers[currentQuestion.id] === option.key;
                  return (
                    <div
                      key={option.key || idx}
                      onClick={() => handleSelectOption(currentQuestion.id, option.key)}
                      className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-center gap-3.5 ${
                        isSelected
                          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-md scale-[1.005]'
                          : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        {option.key}
                      </div>

                      <span className="text-sm font-medium flex-1">
                        {option.text}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>ข้อก่อนหน้า</span>
                </button>

                <span className="text-xs text-zinc-400 hidden sm:inline">
                  (กดปุ่ม 1-4 หรือคลิกเลือกคำตอบ)
                </span>

                {currentIndex < totalQuestions - 1 ? (
                  <button
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>ข้อถัดไป</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>ตรวจสอบ & ส่งข้อสอบ</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Question Navigator Grid (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              สถานะการตอบ ({answeredCount}/{totalQuestions})
            </h3>
            <span className="text-xs font-mono font-bold text-zinc-500">
              {progressPercent}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mb-6">
            <div
              className="bg-zinc-900 dark:bg-zinc-100 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Numbers Grid */}
          <div className="grid grid-cols-5 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
            {quiz.questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id]);
              const isCurrent = idx === currentIndex;

              let btnStyle = 'border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800';
              if (isAnswered) {
                btnStyle = 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-bold';
              }
              if (isCurrent) {
                btnStyle += ' ring-2 ring-offset-2 ring-zinc-900 dark:ring-zinc-100 dark:ring-offset-zinc-900';
              }

              return (
                <button
                  key={q.id || idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-10 rounded-xl border text-xs font-mono transition-all flex items-center justify-center ${btnStyle}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-around text-[11px] text-zinc-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-zinc-900 dark:bg-zinc-100" />
              <span>ตอบแล้ว</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900" />
              <span>ยังไม่ตอบ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md border-2 border-zinc-900 dark:border-zinc-100" />
              <span>ข้อปัจจุบัน</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal before Submit */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              ยืนยันการส่งข้อสอบ?
            </h3>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              คุณได้ทำข้อสอบไปแล้ว{' '}
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{answeredCount}</strong>{' '}
              จากทั้งหมด{' '}
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{totalQuestions}</strong> ข้อ
            </p>

            {answeredCount < totalQuestions && (
              <div className="mb-6 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  ยังมีอีก {totalQuestions - answeredCount} ข้อที่คุณยังไม่ได้ตอบ
                  คุณแน่ใจหรือไม่ว่าต้องการส่งข้อสอบตอนนี้?
                </span>
              </div>
            )}

            {submitError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-2 text-xs text-red-600 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors"
              >
                กลับไปทำต่อ
              </button>
              <button
                onClick={handleSubmitExam}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังส่ง...</span>
                  </>
                ) : (
                  <span>ยืนยันส่งข้อสอบ</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Switch Warning Modal */}
      {showTabWarning && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center mx-auto mb-3 border border-amber-300 dark:border-amber-700">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>

            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              แจ้งเตือน: ตรวจพบการสลับหน้าจอ
            </h3>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
              ระบบได้บันทึกการออกจากหน้าจอข้อสอบแล้ว (ครั้งที่ {tabSwitchCount})
              กรุณาทำข้อสอบภายในหน้านี้จนเสร็จสิ้นเพื่อความโปร่งใส
            </p>

            <button
              onClick={() => setShowTabWarning(false)}
              className="w-full py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 text-xs font-semibold transition-colors"
            >
              รับทราบและกลับไปทำข้อสอบ
            </button>
          </div>
        </div>
      )}

      {/* Student Details Prompt Modal if accessed directly via URL */}
      {studentInputModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              ระบุข้อมูลผู้เข้าสอบ
            </h3>
            <p className="text-xs text-zinc-500 mb-5">
              ก่อนเริ่มทำแบบทดสอบ &quot;{quiz.title}&quot; โปรดกรอกข้อมูลของคุณ
            </p>

            <form onSubmit={handleStudentModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  รหัสนักศึกษา <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น 6512345678"
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
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
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors mt-2"
              >
                เริ่มทำข้อสอบ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizTakingPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent dark:border-zinc-100 dark:border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-zinc-400 font-mono">กำลังเตรียมห้องสอบ...</p>
          </div>
        </div>
      }
    >
      <QuizTakingContent {...props} />
    </Suspense>
  );
}

