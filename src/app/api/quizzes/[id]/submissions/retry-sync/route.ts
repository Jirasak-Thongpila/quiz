import { NextRequest, NextResponse } from 'next/server';
import { getQuizById, getSubmissions, updateSubmission } from '@/lib/storage';
import { sendSubmissionToGoogleSheets } from '@/lib/google-sheets';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params;
    const { submissionId } = await req.json();

    const quiz = await getQuizById(quizId);
    if (!quiz || !quiz.settings.googleSheetsWebhook) {
      return NextResponse.json({ error: 'ชุดข้อสอบนี้ยังไม่ได้ตั้งค่า Google Sheets Webhook' }, { status: 400 });
    }

    const all = await getSubmissions(quizId);
    const target = all.find(s => s.id === submissionId);
    if (!target) {
      return NextResponse.json({ error: 'ไม่พบรายการผลสอบนี้' }, { status: 404 });
    }

    const result = await sendSubmissionToGoogleSheets(quiz.settings.googleSheetsWebhook, target);

    if (result.success) {
      await updateSubmission(target.id, {
        googleSheetsStatus: 'synced',
        googleSheetsError: undefined,
      });
      return NextResponse.json({ success: true });
    } else {
      await updateSubmission(target.id, {
        googleSheetsStatus: 'failed',
        googleSheetsError: result.error,
      });
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }
  } catch (error) {
    console.error('Failed to retry sync:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล' }, { status: 500 });
  }
}
