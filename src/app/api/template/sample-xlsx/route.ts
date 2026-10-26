import { NextResponse } from 'next/server';
import { getSampleExcelBuffer } from '@/lib/parser';

export async function GET() {
  const buffer = getSampleExcelBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="quiz_template.xlsx"',
    },
  });
}
