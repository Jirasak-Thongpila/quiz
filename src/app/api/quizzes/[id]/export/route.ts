import { NextRequest, NextResponse } from 'next/server';
import { getQuizById, getSubmissions } from '@/lib/storage';
import * as XLSX from 'xlsx';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params;
    const quiz = await getQuizById(quizId);

    if (!quiz) {
      return NextResponse.json({ error: 'ไม่พบชุดข้อสอบ' }, { status: 404 });
    }

    const submissions = await getSubmissions(quizId);

    // Build data array
    const data: (string | number)[][] = [
      [
        'วันที่-เวลาที่ส่ง',
        'รหัสนักศึกษา',
        'ชื่อ - นามสกุล',
        'ชุดข้อสอบ',
        'คะแนนที่ได้',
        'คะแนนเต็ม',
        'คิดเป็นร้อยละ (%)',
        'เวลาที่ใช้',
        'สลับแท็บ (ครั้ง)',
        'สถานะ Google Sheets'
      ]
    ];

    submissions.forEach(s => {
      data.push([
        s.submittedAt,
        s.studentId,
        s.fullName,
        s.quizTitle,
        s.score,
        s.totalScore,
        `${s.percentage}%`,
        s.timeTakenFormatted,
        s.tabSwitchCount,
        s.googleSheetsStatus === 'synced' ? 'ซิงค์สำเร็จ' : s.googleSheetsStatus === 'failed' ? 'ซิงค์ไม่สำเร็จ' : 'ไม่ได้เชื่อมต่อ'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 20 },
      { wch: 16 },
      { wch: 25 },
      { wch: 30 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'คะแนนสอบ');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `scores_${quiz.title.replace(/[^a-zA-Z0-9\u0E00-\u0E7F]/g, '_')}_${Date.now()}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error('Failed to export submissions:', error);
    return NextResponse.json({ error: 'Failed to export submissions' }, { status: 500 });
  }
}
