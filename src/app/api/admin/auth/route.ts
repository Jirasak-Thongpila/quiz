import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { secretKey } = await req.json();
    const serverSecret = process.env.ADMIN_SECRET_KEY || 'admin1234';

    if (secretKey === serverSecret) {
      return NextResponse.json({
        success: true,
        hasGlobalWebhook: Boolean(process.env.DEFAULT_GOOGLE_SHEETS_WEBHOOK),
      });
    } else {
      return NextResponse.json({ success: false, message: 'รหัสผ่าน Admin ไม่ถูกต้อง' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' }, { status: 500 });
  }
}
