'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  Lock,
  Plus,
  FileSpreadsheet,
  Download,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Search,
  Users,
  Award,
  AlertTriangle,
  FileUp,
  Link as LinkIcon,
  HelpCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  Edit,
  ArrowRight
} from 'lucide-react';
import { Quiz, QuizQuestion, QuizSubmission } from '@/types/quiz';
import { parseCSV, parseExcel } from '@/lib/parser';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '@/lib/google-sheets';

export default function AdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'quizzes' | 'create' | 'submissions' | 'guide'>('quizzes');

  // Data states
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Quiz Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [timeLimit, setTimeLimit] = useState(20);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleChoices, setShuffleChoices] = useState(true);
  const [allowRetake, setAllowRetake] = useState(false);
  const [tabSwitchWarning, setTabSwitchWarning] = useState(true);
  const [showScoreOnComplete, setShowScoreOnComplete] = useState(true);
  const [googleSheetsWebhook, setGoogleSheetsWebhook] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  // Import mode in Create tab: 'file' | 'sheet' | 'manual'
  const [importMode, setImportMode] = useState<'file' | 'sheet' | 'manual'>('file');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [importingSheet, setImportingSheet] = useState(false);
  const [sheetImportError, setSheetImportError] = useState('');

  // Manual Question Builder state
  const [manualQ, setManualQ] = useState('');
  const [manualOptA, setManualOptA] = useState('');
  const [manualOptB, setManualOptB] = useState('');
  const [manualOptC, setManualOptC] = useState('');
  const [manualOptD, setManualOptD] = useState('');
  const [manualAnsKey, setManualAnsKey] = useState('ก');

  // UI feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [retryingSyncId, setRetryingSyncId] = useState<string | null>(null);

  // Check saved admin key in sessionStorage
  useEffect(() => {
    const savedKey = sessionStorage.getItem('adminSecretKey');
    if (savedKey) {
      verifyKey(savedKey);
    }
  }, []);

  const verifyKey = async (key: string) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: key }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('adminSecretKey', key);
        fetchQuizzes(key);
      } else {
        const data = await res.json();
        setAuthError(data.message || 'รหัสผ่าน Admin ไม่ถูกต้อง');
        sessionStorage.removeItem('adminSecretKey');
      }
    } catch (err) {
      setAuthError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKeyInput.trim()) return;
    verifyKey(secretKeyInput.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminSecretKey');
    setIsAuthenticated(false);
    setSecretKeyInput('');
  };

  const fetchQuizzes = async (adminKey?: string) => {
    setQuizzesLoading(true);
    try {
      const key = adminKey || sessionStorage.getItem('adminSecretKey') || '';
      const res = await fetch('/api/quizzes', {
        headers: { 'x-admin-key': key },
      });
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data);
        if (data.length > 0 && !selectedQuizId) {
          setSelectedQuizId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setQuizzesLoading(false);
    }
  };

  // Fetch submissions when selectedQuizId changes
  useEffect(() => {
    if (selectedQuizId && isAuthenticated) {
      fetchSubmissions(selectedQuizId);
    }
  }, [selectedQuizId, isAuthenticated]);

  const fetchSubmissions = async (quizId: string) => {
    setSubmissionsLoading(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // File Upload Handler (CSV / XLSX)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let parsed: QuizQuestion[] = [];
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'csv') {
        const text = await file.text();
        parsed = parseCSV(text);
      } else if (extension === 'xlsx' || extension === 'xls') {
        const buffer = await file.arrayBuffer();
        parsed = parseExcel(buffer);
      } else {
        alert('กรุณาเลือกไฟล์ .csv หรือ .xlsx เท่านั้น');
        return;
      }

      if (parsed.length === 0) {
        alert('ไม่พบข้อสอบในไฟล์ กรุณาตรวจสอบหัวตาราง: ข้อ, คำถาม, ตัวเลือก ก, ตัวเลือก ข, ตัวเลือก ค, ตัวเลือก ง, เฉลย');
        return;
      }

      setQuestions(parsed);
      alert(`นำเข้าข้อสอบสำเร็จ ${parsed.length} ข้อ!`);
    } catch (err) {
      console.error('Parse file error:', err);
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์');
    }
  };

  // Google Sheet Import Handler
  const handleImportGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) {
      setSheetImportError('กรุณากรอก URL ของ Google Sheet');
      return;
    }

    setImportingSheet(true);
    setSheetImportError('');

    try {
      const res = await fetch('/api/quizzes/import-google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: googleSheetUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSheetImportError(data.error || 'ดึงข้อสอบล้มเหลว');
        return;
      }

      setQuestions(data.questions);
      alert(`ดึงข้อสอบจาก Google Sheet สำเร็จ ${data.count} ข้อ!`);
      setGoogleSheetUrl('');
    } catch (err) {
      setSheetImportError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อดึงข้อมูล');
    } finally {
      setImportingSheet(false);
    }
  };

  // Manual Add Question Handler
  const handleAddManualQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQ.trim() || !manualOptA.trim() || !manualOptB.trim()) {
      alert('กรุณากรอกคำถามและตัวเลือกอย่างน้อย ก และ ข');
      return;
    }

    const options = [
      { key: 'ก', text: manualOptA.trim() },
      { key: 'ข', text: manualOptB.trim() },
    ];
    if (manualOptC.trim()) options.push({ key: 'ค', text: manualOptC.trim() });
    if (manualOptD.trim()) options.push({ key: 'ง', text: manualOptD.trim() });

    const correctOpt = options.find(o => o.key === manualAnsKey);

    const newQuestion: QuizQuestion = {
      id: `q_${Date.now()}_${questions.length + 1}`,
      number: questions.length + 1,
      question: manualQ.trim(),
      options,
      correctAnswerKey: manualAnsKey,
      correctAnswerText: correctOpt?.text || '',
      points: 1,
    };

    setQuestions(prev => [...prev, newQuestion]);

    // Reset inputs
    setManualQ('');
    setManualOptA('');
    setManualOptB('');
    setManualOptC('');
    setManualOptD('');
    setManualAnsKey('ก');
  };

  // Delete Question
  const handleDeleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id).map((q, i) => ({ ...q, number: i + 1 })));
  };

  // Save Quiz Handler
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');

    if (!title.trim()) {
      setSaveError('กรุณากรอกชื่อชุดข้อสอบ');
      return;
    }
    if (questions.length === 0) {
      setSaveError('กรุณาเพิ่มข้อสอบอย่างน้อย 1 ข้อ');
      return;
    }

    setSavingQuiz(true);
    try {
      const adminKey = sessionStorage.getItem('adminSecretKey') || '';
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          title,
          description,
          accessCode: accessCode.trim() || Math.floor(100000 + Math.random() * 900000).toString(),
          settings: {
            timeLimit,
            shuffleQuestions,
            shuffleChoices,
            allowRetake,
            tabSwitchWarning,
            showScoreOnComplete,
            googleSheetsWebhook,
          },
          questions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error || 'บันทึกชุดข้อสอบล้มเหลว');
        return;
      }

      const createdQuiz = await res.json();
      setSaveSuccess('สร้างชุดข้อสอบสำเร็จเรียบร้อยแล้ว!');

      // Reset form
      setTitle('');
      setDescription('');
      setAccessCode('');
      setQuestions([]);
      setGoogleSheetsWebhook('');

      // Refresh list & select created
      fetchQuizzes();
      setSelectedQuizId(createdQuiz.id);
      setActiveTab('quizzes');
    } catch (err) {
      setSaveError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSavingQuiz(false);
    }
  };

  // Delete Quiz
  const handleDeleteQuiz = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบชุดข้อสอบนี้? ข้อมูลคำถามและคะแนนที่เกี่ยวข้องจะถูกลบ')) {
      return;
    }

    try {
      const res = await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchQuizzes();
        if (selectedQuizId === id) setSelectedQuizId('');
      } else {
        alert('ลบไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบ');
    }
  };

  // Delete Submission
  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm('คุณต้องการลบผลคะแนนของนักศึกษาท่านนี้เพื่อเปิดสิทธิ์ให้สอบใหม่หรือไม่?')) {
      return;
    }

    try {
      const res = await fetch(`/api/quizzes/${selectedQuizId}/submissions?submissionId=${submissionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchSubmissions(selectedQuizId);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบผลคะแนน');
    }
  };

  // Retry Google Sheets sync
  const handleRetrySync = async (submissionId: string) => {
    setRetryingSyncId(submissionId);
    try {
      const res = await fetch(`/api/quizzes/${selectedQuizId}/submissions/retry-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('ซิงค์เข้า Google Sheets สำเร็จเรียบร้อย!');
        fetchSubmissions(selectedQuizId);
      } else {
        alert(`ซิงค์ล้มเหลว: ${data.error || 'โปรดตรวจสอบ Webhook URL'}`);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setRetryingSyncId(null);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // If NOT authenticated, show clean PIN Login Card
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 py-16">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center mx-auto mb-4 font-black shadow-sm">
            <Lock className="w-5 h-5" />
          </div>

          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            ระบบจัดการอาจารย์ (Admin)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
            กรุณากรอกรหัสผ่านผู้ดูแลระบบ (ADMIN_SECRET_KEY)
          </p>

          {authError && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-2 text-xs text-red-600 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="กรอกรหัส Secret Key"
                value={secretKeyInput}
                onChange={e => setSecretKeyInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-center tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังตรวจสอบ...</span>
                </>
              ) : (
                <span>เข้าสู่ระบบ</span>
              )}
            </button>
          </form>

          <p className="mt-5 text-[11px] text-zinc-400">
            *ค่าเริ่มต้นใน .env คือ <code>admin1234</code>
          </p>
        </div>
      </div>
    );
  }

  // Filter submissions by search query
  const filteredSubmissions = submissions.filter(
    s =>
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);

  // Submissions Stats
  const totalSubmissions = submissions.length;
  const avgScore = totalSubmissions > 0
    ? (submissions.reduce((acc, cur) => acc + cur.score, 0) / totalSubmissions).toFixed(1)
    : '0';
  const maxScore = totalSubmissions > 0
    ? Math.max(...submissions.map(s => s.score))
    : 0;

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            แดชบอร์ดจัดการข้อสอบ
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            สร้างชุดข้อสอบ, นำเข้าไฟล์ CSV/Excel, และเชื่อมต่อผลคะแนนเข้า Google Sheets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-px mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('quizzes')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 ${
            activeTab === 'quizzes'
              ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 bg-white dark:bg-zinc-900'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>ชุดข้อสอบทั้งหมด ({quizzes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 ${
            activeTab === 'create'
              ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 bg-white dark:bg-zinc-900'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>สร้างชุดข้อสอบใหม่</span>
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 ${
            activeTab === 'submissions'
              ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 bg-white dark:bg-zinc-900'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>ผลการสอบ & คะแนน</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 ${
            activeTab === 'guide'
              ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 bg-white dark:bg-zinc-900'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>คู่มือ Google Sheets (2 ชีต)</span>
        </button>
      </div>

      {/* ================= TAB 1: QUIZZES LIST ================= */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              รายการชุดข้อสอบ
            </h2>
            <button
              onClick={() => setActiveTab('create')}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างชุดข้อสอบ</span>
            </button>
          </div>

          {quizzesLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-32 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900">
              <FileText className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">ยังไม่มีชุดข้อสอบ</p>
              <p className="text-xs text-zinc-400 mt-1 mb-4">เริ่มต้นสร้างหรือนำเข้าชุดข้อสอบแรกของคุณ</p>
              <button
                onClick={() => setActiveTab('create')}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold"
              >
                + สร้างชุดข้อสอบเลย
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map(quiz => {
                const examUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/quiz/${quiz.id}`;
                return (
                  <div
                    key={quiz.id}
                    className="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                          รหัส: {quiz.accessCode}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString('th-TH') : ''}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 line-clamp-1">
                        {quiz.title}
                      </h3>
                      {quiz.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                          {quiz.description}
                        </p>
                      )}

                      {/* Settings Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {quiz.questions?.length || 0} ข้อ
                        </span>
                        {quiz.settings.timeLimit > 0 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {quiz.settings.timeLimit} นาที
                          </span>
                        )}
                        {quiz.settings.googleSheetsWebhook && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Sheets Connected
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(examUrl, quiz.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-1 transition-colors"
                          title="คัดลอกลิงก์ให้นักศึกษา"
                        >
                          {copiedId === quiz.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedId === quiz.id ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedQuizId(quiz.id);
                            setActiveTab('submissions');
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>ดูคะแนน</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <Link
                          href={`/quiz/${quiz.id}`}
                          target="_blank"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="ทดสอบทำข้อสอบ"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="ลบชุดข้อสอบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: CREATE QUIZ ================= */}
      {activeTab === 'create' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              สร้างชุดข้อสอบใหม่
            </h2>
            <p className="text-xs text-zinc-500 mb-6">
              ระบุรายละเอียด นำเข้าข้อสอบ และตั้งค่าการส่งผลคะแนน
            </p>

            {saveSuccess && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {saveError && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleCreateQuiz} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    ชื่อชุดข้อสอบ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น แบบทดสอบกลางภาค วิชาเครือข่ายคอมพิวเตอร์"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    คำอธิบายเพิ่มเติม
                  </label>
                  <textarea
                    rows={2}
                    placeholder="เช่น ข้อสอบมีทั้งหมด 20 ข้อ กรุณาทำภายในเวลาที่กำหนด"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                      รหัสห้องสอบ (Access Code)
                    </label>
                    <input
                      type="text"
                      placeholder="เว้นว่างเพื่อให้ระบบสุ่ม 6 หลัก"
                      value={accessCode}
                      onChange={e => setAccessCode(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                      เวลาทำข้อสอบ (นาที, 0 = ไม่จำกัด)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="300"
                      value={timeLimit}
                      onChange={e => setTimeLimit(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1">
                  ตั้งค่ากติกาและการสอบ
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={e => setShuffleQuestions(e.target.checked)}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <span>สุ่มสลับลำดับข้อสอบ (Shuffle Questions)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleChoices}
                      onChange={e => setShuffleChoices(e.target.checked)}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <span>สุ่มสลับตัวเลือก ก-ง (Shuffle Choices)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!allowRetake}
                      onChange={e => setAllowRetake(!e.target.checked)}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <span>ห้ามสอบซ้ำ (1 รหัสนักศึกษาทำได้ 1 ครั้ง)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tabSwitchWarning}
                      onChange={e => setTabSwitchWarning(e.target.checked)}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <span>แจ้งเตือน & บันทึกการสลับแท็บหน้าจอ</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showScoreOnComplete}
                      onChange={e => setShowScoreOnComplete(e.target.checked)}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <span>แสดงคะแนนทันทีหลังนักศึกษาส่งข้อสอบ</span>
                  </label>
                </div>
              </div>

              {/* Google Sheets Webhook URL */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Google Sheets Webhook URL (รับคะแนน Real-time)</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('guide')}
                    className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
                  >
                    ดูวิธีสร้าง Webhook URL
                  </button>
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={googleSheetsWebhook}
                  onChange={e => setGoogleSheetsWebhook(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  *เมื่อนักศึกษาส่งข้อสอบ คะแนนจะถูกส่งเข้า Google Sheet ทันที (หากเว้นว่าง จะบันทึกเฉพาะในเว็บ)
                </p>
              </div>

              {/* Section: Question Import & Builder */}
              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                      จัดการข้อสอบ ({questions.length} ข้อ)
                    </h3>
                    <p className="text-xs text-zinc-400">เลือกวิธีนำเข้าข้อสอบที่สะดวกสำหรับคุณ</p>
                  </div>

                  {/* Template download buttons */}
                  <div className="flex items-center gap-2">
                    <a
                      href="/api/template/sample-csv"
                      download="quiz_template.csv"
                      className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[11px] font-medium flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Template CSV</span>
                    </a>
                    <a
                      href="/api/template/sample-xlsx"
                      download="quiz_template.xlsx"
                      className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[11px] font-medium flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Template Excel</span>
                    </a>
                  </div>
                </div>

                {/* Sub tabs for import */}
                <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 mb-6 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setImportMode('file')}
                    className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      importMode === 'file'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                    }`}
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>อัปโหลดไฟล์ (CSV / Excel)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('sheet')}
                    className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      importMode === 'sheet'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>ดึงจาก Google Sheet (ชีตข้อสอบ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('manual')}
                    className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      importMode === 'manual'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                    }`}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>เพิ่มข้อสอบเองทีละข้อ</span>
                  </button>
                </div>

                {/* Import Mode 1: File Upload */}
                {importMode === 'file' && (
                  <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center bg-zinc-50/50 dark:bg-zinc-900/40">
                    <FileSpreadsheet className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1 mb-4">
                      รองรับไฟล์ .csv และ .xlsx (รูปแบบ: ข้อ, คำถาม, ตัวเลือก ก, ข, ค, ง, เฉลย)
                    </p>
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold cursor-pointer hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-sm transition-colors">
                      <FileUp className="w-4 h-4" />
                      <span>เลือกไฟล์ CSV หรือ Excel</span>
                      <input
                        type="file"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Import Mode 2: Google Sheet Link */}
                {importMode === 'sheet' && (
                  <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        วางลิงก์ Google Sheet ที่มีคำถามข้อสอบ
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                          value={googleSheetUrl}
                          onChange={e => setGoogleSheetUrl(e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={handleImportGoogleSheet}
                          disabled={importingSheet}
                          className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold flex items-center gap-2 hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {importingSheet ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>กำลังดึง...</span>
                            </>
                          ) : (
                            <span>ดึงข้อสอบ</span>
                          )}
                        </button>
                      </div>
                      {sheetImportError && (
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{sheetImportError}</span>
                        </p>
                      )}
                      <p className="text-[11px] text-zinc-400 mt-2">
                        *หมายเหตุ: อย่าลืมกด &quot;แชร์&quot; ใน Google Sheet ให้เป็น &quot;ทุกคนที่มีลิงก์มีสิทธิ์ดู&quot;
                      </p>
                    </div>
                  </div>
                )}

                {/* Import Mode 3: Manual Builder */}
                {importMode === 'manual' && (
                  <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        คำถาม / โจทย์
                      </label>
                      <input
                        type="text"
                        placeholder="พิมพ์โจทย์คำถาม..."
                        value={manualQ}
                        onChange={e => setManualQ(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                          ตัวเลือก ก
                        </label>
                        <input
                          type="text"
                          placeholder="ตัวเลือก ก"
                          value={manualOptA}
                          onChange={e => setManualOptA(e.target.value)}
                          className="w-full px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                          ตัวเลือก ข
                        </label>
                        <input
                          type="text"
                          placeholder="ตัวเลือก ข"
                          value={manualOptB}
                          onChange={e => setManualOptB(e.target.value)}
                          className="w-full px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                          ตัวเลือก ค
                        </label>
                        <input
                          type="text"
                          placeholder="ตัวเลือก ค"
                          value={manualOptC}
                          onChange={e => setManualOptC(e.target.value)}
                          className="w-full px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                          ตัวเลือก ง
                        </label>
                        <input
                          type="text"
                          placeholder="ตัวเลือก ง"
                          value={manualOptD}
                          onChange={e => setManualOptD(e.target.value)}
                          className="w-full px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">เฉลยข้อ:</span>
                        {['ก', 'ข', 'ค', 'ง'].map(key => (
                          <label key={key} className="flex items-center gap-1 text-xs cursor-pointer">
                            <input
                              type="radio"
                              name="manualAns"
                              value={key}
                              checked={manualAnsKey === key}
                              onChange={() => setManualAnsKey(key)}
                              className="text-zinc-900 focus:ring-zinc-900"
                            />
                            <span>{key}</span>
                          </label>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleAddManualQuestion}
                        className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800"
                      >
                        + เพิ่มข้อนี้
                      </button>
                    </div>
                  </div>
                )}

                {/* Questions Preview List */}
                {questions.length > 0 && (
                  <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                        รายการข้อสอบที่พร้อมบันทึก ({questions.length} ข้อ)
                      </h4>
                      <button
                        type="button"
                        onClick={() => setQuestions([])}
                        className="text-xs text-red-500 hover:underline"
                      >
                        ล้างทั้งหมด
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {questions.map((q, idx) => {
                        const isExpanded = expandedQuestionId === q.id;
                        return (
                          <div
                            key={q.id || idx}
                            className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/60 p-4 transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div
                                className="flex-1 cursor-pointer flex items-center gap-2"
                                onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                              >
                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
                                  ข้อ {idx + 1}
                                </span>
                                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                                  {q.question}
                                </span>
                                <span className="text-xs text-emerald-600 font-bold ml-auto shrink-0">
                                  เฉลย: {q.correctAnswerKey}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="text-zinc-400 hover:text-red-500 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Expanded options */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                                {q.options.map(opt => (
                                  <div
                                    key={opt.key}
                                    className={`p-2 rounded-lg flex items-center gap-2 ${
                                      opt.key === q.correctAnswerKey
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-zinc-50 dark:bg-zinc-800'
                                    }`}
                                  >
                                    <span className="font-mono w-5 text-center">{opt.key}.</span>
                                    <span>{opt.text}</span>
                                    {opt.key === q.correctAnswerKey && (
                                      <span className="ml-auto text-[10px] text-emerald-600 uppercase">
                                        คำตอบที่ถูก
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                <button
                  type="submit"
                  disabled={savingQuiz}
                  className="py-3 px-6 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold text-sm transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {savingQuiz ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึกชุดข้อสอบ...</span>
                    </>
                  ) : (
                    <>
                      <span>บันทึกและสร้างชุดข้อสอบ ({questions.length} ข้อ)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= TAB 3: SUBMISSIONS ================= */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          {/* Top Filter and Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                เลือกชุดข้อสอบ:
              </label>
              <select
                value={selectedQuizId}
                onChange={e => setSelectedQuizId(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                {quizzes.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.title} (รหัส: {q.accessCode})
                  </option>
                ))}
              </select>
            </div>

            {selectedQuizId && (
              <div className="flex items-center gap-2">
                <a
                  href={`/api/quizzes/${selectedQuizId}/export`}
                  download
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดไฟล์ Excel (.xlsx)</span>
                </a>
              </div>
            )}
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                จำนวนผู้ส่งข้อสอบ
              </span>
              <div className="text-3xl font-extrabold mt-1 text-zinc-900 dark:text-zinc-100 font-mono">
                {totalSubmissions} <span className="text-xs font-normal text-zinc-400">คน</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                คะแนนเฉลี่ย
              </span>
              <div className="text-3xl font-extrabold mt-1 text-zinc-900 dark:text-zinc-100 font-mono">
                {avgScore}{' '}
                <span className="text-xs font-normal text-zinc-400">
                  / {selectedQuiz?.questions?.length || 0}
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                คะแนนสูงสุด
              </span>
              <div className="text-3xl font-extrabold mt-1 text-zinc-900 dark:text-zinc-100 font-mono">
                {maxScore}{' '}
                <span className="text-xs font-normal text-zinc-400">
                  / {selectedQuiz?.questions?.length || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="ค้นหาด้วยรหัสนักศึกษา หรือชื่อ-นามสกุล..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          {/* Submissions Table */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
            {submissionsLoading ? (
              <div className="p-8 text-center text-xs text-zinc-400">กำลังโหลดรายการคะแนน...</div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">ยังไม่มีผู้ส่งคำตอบ</p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  เมื่อนักศึกษาส่งข้อสอบ รายชื่อและคะแนนจะแสดงที่นี่โดยอัตโนมัติ
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">วันที่-เวลา</th>
                      <th className="py-3 px-4">รหัสนักศึกษา</th>
                      <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                      <th className="py-3 px-4 text-center">คะแนน</th>
                      <th className="py-3 px-4 text-center">ร้อยละ</th>
                      <th className="py-3 px-4 text-center">เวลาที่ใช้</th>
                      <th className="py-3 px-4 text-center">สลับแท็บ</th>
                      <th className="py-3 px-4 text-center">Google Sheets</th>
                      <th className="py-3 px-4 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                    {filteredSubmissions.map(sub => (
                      <tr key={sub.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                          {sub.submittedAt}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          {sub.studentId}
                        </td>
                        <td className="py-3 px-4 text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                          {sub.fullName}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold whitespace-nowrap">
                          {sub.score} / {sub.totalScore}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {sub.percentage}%
                        </td>
                        <td className="py-3 px-4 text-center text-zinc-500 whitespace-nowrap">
                          {sub.timeTakenFormatted}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {sub.tabSwitchCount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              {sub.tabSwitchCount} ครั้ง
                            </span>
                          ) : (
                            <span className="text-zinc-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {sub.googleSheetsStatus === 'synced' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              ซิงค์แล้ว
                            </span>
                          ) : sub.googleSheetsStatus === 'failed' ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-[11px] text-red-500 font-bold">ล้มเหลว</span>
                              <button
                                onClick={() => handleRetrySync(sub.id)}
                                disabled={retryingSyncId === sub.id}
                                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600"
                                title="ลองส่งเข้าชีตใหม่อีกครั้ง"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${retryingSyncId === sub.id ? 'animate-spin' : ''}`} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">ไม่ระบุ Webhook</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteSubmission(sub.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="ลบผลคะแนน (เปิดให้นักศึกษาสอบใหม่ได้)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 4: GOOGLE SHEETS SETUP GUIDE ================= */}
      {activeTab === 'guide' && (
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Guide Header */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">
              คู่มือการใช้งาน 2 ไฟล์ Google Sheet
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              ตามที่คุณต้องการแยก Google Sheet ออกเป็น 2 ไฟล์ต่างหาก: ไฟล์ที่ 1 สำหรับใส่คำถามข้อสอบ และไฟล์ที่ 2 สำหรับรับคะแนนของนักศึกษา
            </p>
          </div>

          {/* Sheet 1: Exam Questions */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                ไฟล์ที่ 1: Google Sheet สำหรับ &quot;ข้อสอบ&quot; (Question Sheet)
              </h3>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              สร้าง Google Sheet ขึ้นมา 1 ไฟล์ แล้วกำหนดหัวตาราง 8 คอลัมน์ในแถวที่ 1 ดังนี้:
            </p>

            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 p-3 font-mono text-xs">
              <table className="w-full text-center">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700 font-bold text-zinc-800 dark:text-zinc-200">
                    <th className="p-2">ข้อ</th>
                    <th className="p-2">คำถาม</th>
                    <th className="p-2">ตัวเลือก ก</th>
                    <th className="p-2">ตัวเลือก ข</th>
                    <th className="p-2">ตัวเลือก ค</th>
                    <th className="p-2">ตัวเลือก ง</th>
                    <th className="p-2">เฉลย</th>
                    <th className="p-2">คำตอบที่ถูก</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-600 dark:text-zinc-400">
                  <tr>
                    <td className="p-2">1</td>
                    <td className="p-2 text-left">แบบจำลอง OSI มีกี่เลเยอร์</td>
                    <td className="p-2">4 เลเยอร์</td>
                    <td className="p-2">5 เลเยอร์</td>
                    <td className="p-2">6 เลเยอร์</td>
                    <td className="p-2">7 เลเยอร์</td>
                    <td className="p-2 font-bold text-emerald-600">ง</td>
                    <td className="p-2">7 เลเยอร์</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
              <strong className="block font-bold">วิธีนำเข้าชีตนี้เข้าสู่ระบบ:</strong>
              <p>1. กดปุ่ม <strong>แชร์ (Share)</strong> ด้านขวาบนของ Google Sheet</p>
              <p>2. เปลี่ยนการเข้าถึงทั่วไปเป็น <strong>&quot;ทุกคนที่มีลิงก์ (Anyone with the link)&quot;</strong> ให้มีสิทธิ์ <strong>ดู (Viewer)</strong></p>
              <p>3. คัดลอกลิงก์ Google Sheet มาวางในแท็บ &quot;ดึงจาก Google Sheet&quot; ในหน้าสร้างชุดข้อสอบ ระบบจะดึงคำถามทั้งหมดเข้ามาทันที!</p>
            </div>
          </div>

          {/* Sheet 2: Real-time Scores Webhook */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold text-xs">
                2
              </span>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                ไฟล์ที่ 2: Google Sheet สำหรับ &quot;รับผลคะแนน&quot; (Score Sheet Webhook)
              </h3>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              สร้าง Google Sheet ว่างๆ ขึ้นมาอีก 1 ไฟล์ เพื่อเป็นที่รับคะแนนนักศึกษาแบบ Real-time โดยทำตาม 4 ขั้นตอนนี้:
            </p>

            <ol className="list-decimal list-inside text-xs text-zinc-700 dark:text-zinc-300 space-y-2 pl-2">
              <li>เปิด Google Sheet ไฟล์ที่ 2 แล้วคลิกเมนู <strong>ส่วนขยาย (Extensions) &gt; Apps Script</strong></li>
              <li>ลบโค้ดเดิมทั้งหมดในหน้าต่าง Apps Script แล้ววางโค้ดด้านล่างนี้ลงไป</li>
              <li>คลิกปุ่ม <strong>การทำให้ใช้งานได้ (Deploy) &gt; การทำให้ใช้งานได้ใหม่ (New deployment)</strong></li>
              <li>
                เลือกประเภท: <strong>เว็บแอป (Web app)</strong>
                <br />- คำอธิบาย: <code>Quiz Webhook</code>
                <br />- ดำเนินการในฐานะ: <strong>ฉัน (Me)</strong>
                <br />- ผู้มีสิทธิ์เข้าถึง: <strong>ทุกคน (Anyone)</strong> *(สำคัญมาก! เพื่อให้เว็บส่งคะแนนเข้าได้)*
              </li>
              <li>กด <strong>ทำให้ใช้งานได้ (Deploy)</strong> แล้วคัดลอก <strong>URL เว็บแอป (Web App URL)</strong> มาใส่ในช่อง Google Sheets Webhook URL ในระบบ Quiz</li>
            </ol>

            {/* Code Block with 1-click Copy */}
            <div className="relative">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-mono font-bold text-zinc-500">Google Apps Script Code:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(GOOGLE_APPS_SCRIPT_TEMPLATE, 'script_code')}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5 hover:bg-zinc-800 transition-colors shadow-sm"
                >
                  {copiedId === 'script_code' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                      <span>คัดลอกโค้ดเรียบร้อย!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอกโค้ด (Copy Code)</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-200 text-xs font-mono overflow-x-auto max-h-[300px] border border-zinc-800 leading-relaxed">
                {GOOGLE_APPS_SCRIPT_TEMPLATE}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
