import { NextResponse } from 'next/server';
import { getSampleCSV } from '@/lib/parser';

export async function GET() {
  const csvContent = getSampleCSV();
  // Add UTF-8 BOM so Excel opens Thai characters without garbled text
  const bom = '\uFEFF';
  const fullContent = bom + csvContent;

  return new NextResponse(fullContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="quiz_template.csv"',
    },
  });
}
