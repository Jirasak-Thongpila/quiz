import { NextRequest, NextResponse } from 'next/server';
import { getQuizById, getSubmissions, saveSubmission, updateSubmission } from '@/lib/storage';
import { QuizSubmission } from '@/types/quiz';
import { sendSubmissionToGoogleSheets } from '@/lib/google-sheets';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} วินาที`;
  return `${mins} นาที ${secs} วินาที`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params;
    const quiz = await getQuizById(quizId);

    if (!quiz) {
      return NextResponse.json({ error: 'ไม่พบชุดข้อสอบนี้' }, { status: 404 });
    }

    const body = await req.json();
    const { studentId, fullName, answers, timeTakenSeconds, tabSwitchCount } = body;

    const cleanStudentId = String(studentId || '').trim();
    const cleanFullName = String(fullName || '').trim();

    if (!cleanStudentId || !cleanFullName) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสนักศึกษาและชื่อ-นามสกุล' }, { status: 400 });
    }

    // Check attempt limit
    if (!quiz.settings.allowRetake) {
      const existing = await getSubmissions(quizId);
      const alreadySubmitted = existing.some(
        s => s.studentId.trim().toLowerCase() === cleanStudentId.toLowerCase()
      );
      if (alreadySubmitted) {
        return NextResponse.json({
          error: `รหัสนักศึกษา ${cleanStudentId} ได้ทำข้อสอบชุดนี้ไปแล้ว (ชุดข้อสอบนี้ไม่อนุญาตให้ทำซ้ำ)`,
        }, { status: 403 });
      }
    }

    // Calculate score
    let score = 0;
    let totalScore = 0;
    const studentAnswers = (answers || {}) as Record<string, string>;

    quiz.questions.forEach(q => {
      totalScore += q.points || 1;
      const selected = studentAnswers[q.id];
      if (selected && selected.trim() === q.correctAnswerKey.trim()) {
        score += q.points || 1;
      }
    });

    const percentage = totalScore > 0 ? Math.round((score / totalScore) * 100 * 10) / 10 : 0;
    const seconds = Number(timeTakenSeconds) || 0;

    const targetWebhook = quiz.settings.googleSheetsWebhook?.trim() || process.env.DEFAULT_GOOGLE_SHEETS_WEBHOOK?.trim() || '';

    const submission: QuizSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      quizId,
      quizTitle: quiz.title,
      studentId: cleanStudentId,
      fullName: cleanFullName,
      score,
      totalScore,
      percentage,
      timeTakenSeconds: seconds,
      timeTakenFormatted: formatDuration(seconds),
      tabSwitchCount: Number(tabSwitchCount) || 0,
      answers: studentAnswers,
      googleSheetsStatus: targetWebhook ? 'failed' : 'not_configured',
      submittedAt: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
    };

    // Save locally first
    await saveSubmission(submission);

    // Sync to Google Sheets if configured
    if (targetWebhook) {
      try {
        const syncResult = await sendSubmissionToGoogleSheets(
          targetWebhook,
          submission
        );
        if (syncResult.success) {
          submission.googleSheetsStatus = 'synced';
          await updateSubmission(submission.id, { googleSheetsStatus: 'synced' });
        } else {
          submission.googleSheetsStatus = 'failed';
          submission.googleSheetsError = syncResult.error;
          await updateSubmission(submission.id, {
            googleSheetsStatus: 'failed',
            googleSheetsError: syncResult.error,
          });
        }
      } catch (syncErr: unknown) {
        console.error('Background Google Sheets sync error:', syncErr);
      }
    }

    // Response back to student
    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      score: quiz.settings.showScoreOnComplete ? score : null,
      totalScore: quiz.settings.showScoreOnComplete ? totalScore : null,
      percentage: quiz.settings.showScoreOnComplete ? percentage : null,
      showScore: quiz.settings.showScoreOnComplete,
      googleSheetsStatus: submission.googleSheetsStatus,
      message: 'บันทึกคำตอบและผลการสอบเรียบร้อยแล้ว',
    });
  } catch (error) {
    console.error('Failed to submit quiz:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกคำตอบ' }, { status: 500 });
  }
}
