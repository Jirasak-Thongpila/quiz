import { NextRequest, NextResponse } from 'next/server';
import { getQuizzes, saveQuiz, getSubmissions } from '@/lib/storage';
import { Quiz } from '@/types/quiz';

export async function GET() {
  try {
    const quizzes = await getQuizzes();
    const allSubmissions = await getSubmissions();

    // Attach submission counts
    const summary = quizzes.map(q => {
      const submissions = allSubmissions.filter(s => s.quizId === q.id);
      return {
        id: q.id,
        title: q.title,
        description: q.description,
        accessCode: q.accessCode,
        settings: {
          ...q.settings,
          hasGlobalWebhook: Boolean(process.env.DEFAULT_GOOGLE_SHEETS_WEBHOOK),
        },
        hasGlobalWebhook: Boolean(process.env.DEFAULT_GOOGLE_SHEETS_WEBHOOK),
        questionCount: q.questions.length,
        submissionCount: submissions.length,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      };
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to get quizzes:', error);
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, settings, questions, accessCode } = body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อชุดข้อสอบและเพิ่มข้อสอบอย่างน้อย 1 ข้อ' }, { status: 400 });
    }

    // Generate 6-digit access code if not provided
    const code = accessCode?.trim() || Math.floor(100000 + Math.random() * 900000).toString();

    const newQuiz: Quiz = {
      id: `quiz-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      description: description?.trim() || '',
      accessCode: code,
      settings: {
        timeLimit: Number(settings?.timeLimit) || 0,
        shuffleQuestions: Boolean(settings?.shuffleQuestions),
        shuffleChoices: Boolean(settings?.shuffleChoices),
        allowRetake: Boolean(settings?.allowRetake),
        tabSwitchWarning: Boolean(settings?.tabSwitchWarning),
        showScoreOnComplete: settings?.showScoreOnComplete !== undefined ? Boolean(settings.showScoreOnComplete) : true,
        googleSheetsWebhook: settings?.googleSheetsWebhook?.trim() || '',
      },
      questions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveQuiz(newQuiz);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error('Failed to create quiz:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างชุดข้อสอบ' }, { status: 500 });
  }
}
