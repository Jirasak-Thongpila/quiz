import { NextRequest, NextResponse } from 'next/server';
import { extractGoogleSheetCsvUrl, parseCSV } from '@/lib/parser';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'กรุณาระบุ URL ของ Google Sheet' }, { status: 400 });
    }

    const csvUrl = extractGoogleSheetCsvUrl(url);

    if (!csvUrl) {
      return NextResponse.json({
        error: 'รูปแบบ URL ไม่ถูกต้อง กรุณาใช้ลิงก์ Google Sheet เช่น https://docs.google.com/spreadsheets/d/...',
      }, { status: 400 });
    }

    // Fetch Google Sheet as CSV
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(csvUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.redirected) {
        return NextResponse.json({
          error: 'ไม่สามารถเข้าถึง Google Sheet ได้ กรุณาเปิดสิทธิ์แชร์ใน Google Sheet เป็น "ทุกคนที่มีลิงก์มีสิทธิ์ดู (Anyone with the link can view)"',
        }, { status: 403 });
      }
      return NextResponse.json({
        error: `ดึงข้อมูลจาก Google Sheet ล้มเหลว (HTTP ${response.status})`,
      }, { status: 502 });
    }

    const csvText = await response.text();

    if (csvText.includes('<!DOCTYPE html>') || csvText.includes('<html')) {
      return NextResponse.json({
        error: 'ลิงก์ Google Sheet ต้องการการล็อกอิน กรุณาตั้งค่าแชร์ไฟล์เป็น "ทุกคนที่มีลิงก์มีสิทธิ์อ่าน"',
      }, { status: 403 });
    }

    const questions = parseCSV(csvText);

    if (questions.length === 0) {
      return NextResponse.json({
        error: 'ไม่พบคำถามใน Google Sheet กรุณาตรวจสอบว่ามีหัวตาราง: ข้อ, คำถาม, ตัวเลือก ก, ตัวเลือก ข, ตัวเลือก ค, ตัวเลือก ง, เฉลย',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      questions,
      count: questions.length,
    });
  } catch (error: unknown) {
    console.error('Import Google Sheet error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `เกิดข้อผิดพลาดในการดึงข้อมูล: ${msg}` }, { status: 500 });
  }
}
