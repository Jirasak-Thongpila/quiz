import { NextRequest, NextResponse } from 'next/server';
import { getQuizById, saveQuiz, deleteQuiz } from '@/lib/storage';
import { QuizQuestion } from '@/types/quiz';

// Helper to shuffle array
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quiz = await getQuizById(id);

    if (!quiz) {
      return NextResponse.json({ error: 'ไม่พบชุดข้อสอบนี้' }, { status: 404 });
    }

    const adminKey = req.headers.get('x-admin-key') || req.nextUrl.searchParams.get('adminKey');
    const isAdmin = adminKey && adminKey === (process.env.ADMIN_SECRET_KEY || 'admin1234');

    if (isAdmin) {
      // Return full quiz with answers for teacher
      return NextResponse.json(quiz);
    }

    // For students: strip answer keys to prevent cheating
    let studentQuestions: QuizQuestion[] = quiz.questions.map(q => {
      let options = q.options;
      if (quiz.settings.shuffleChoices) {
        options = shuffle(options);
      }
      return {
        id: q.id,
        number: q.number,
        question: q.question,
        options,
        correctAnswerKey: '', // Hidden!
        correctAnswerText: '', // Hidden!
        points: q.points,
      };
    });

    if (quiz.settings.shuffleQuestions) {
      studentQuestions = shuffle(studentQuestions);
    }

    return NextResponse.json({
      ...quiz,
      questions: studentQuestions,
    });
  } catch (error) {
    console.error('Failed to get quiz:', error);
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await getQuizById(id);

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบชุดข้อสอบนี้' }, { status: 404 });
    }

    const body = await req.json();
    const updated = {
      ...existing,
      ...body,
      id: existing.id, // prevent id modification
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveQuiz(updated);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('Failed to update quiz:', error);
    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteQuiz(id);

    if (!success) {
      return NextResponse.json({ error: 'ไม่พบชุดข้อสอบ' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete quiz:', error);
    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
  }
}
