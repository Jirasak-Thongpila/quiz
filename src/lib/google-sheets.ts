import { QuizSubmission } from '@/types/quiz';

/**
 * Payload sent to Google Apps Script Webhook
 */
export interface GoogleSheetsPayload {
  timestamp: string;
  studentId: string;
  fullName: string;
  quizTitle: string;
  score: number;
  totalScore: number;
  percentage: number;
  timeTakenFormatted: string;
  tabSwitchCount: number;
}

/**
 * Sends student submission results to a Google Apps Script Webhook URL
 */
export async function sendSubmissionToGoogleSheets(
  webhookUrl: string,
  submission: QuizSubmission
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
    return { success: false, error: 'URL Webhook ไม่ถูกต้องหรือไม่ได้รับค่า' };
  }

  const payload: GoogleSheetsPayload = {
    timestamp: submission.submittedAt,
    studentId: submission.studentId,
    fullName: submission.fullName,
    quizTitle: submission.quizTitle,
    score: submission.score,
    totalScore: submission.totalScore,
    percentage: submission.percentage,
    timeTakenFormatted: submission.timeTakenFormatted,
    tabSwitchCount: submission.tabSwitchCount,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: 'follow', // Google Apps Script redirects on return
    });

    clearTimeout(timeoutId);

    if (!response.ok && response.type !== 'opaque') {
      return {
        success: false,
        error: `Google Sheets ตอบกลับสถานะ HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Google Sheets sync error:', message);
    return { success: false, error: message };
  }
}

/**
 * Ready-to-copy Google Apps Script code for teachers
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// -------------------------------------------------------------
// Google Apps Script สำหรับรับผลคะแนนจากระบบ Quiz System (แบบรวมไฟล์เดียว)
// นำโค้ดนี้ไปวางใน Google Sheets: ส่วนขยาย (Extensions) > Apps Script
//
// จุดเด่น: 
// 1. แยกแท็บ (Tab) ชีตย่อยตามชื่อชุดข้อสอบให้อัตโนมัติในไฟล์เดียว!
// 2. นำ URL ไปใส่ใน .env.local ที่ DEFAULT_GOOGLE_SHEETS_WEBHOOK เพียงครั้งเดียว
//    ต่อจากนี้ออกข้อสอบใหม่กี่ชุด ก็ไม่ต้องต่อ Google Sheet ใหม่อีกเลย!
//
// ขั้นตอน:
// 1. กด การทำให้ใช้งานได้ (Deploy) > การทำให้ใช้งานได้ใหม่ (New deployment)
// 2. เลือกประเภท: เว็บแอป (Web app)
// 3. การเข้าถึง (Who has access): ทุกคน (Anyone)
// 4. คัดลอก URL เว็บแอป ไปใส่ใน .env.local:
//    DEFAULT_GOOGLE_SHEETS_WEBHOOK=https://script.google.com/macros/s/.../exec
// -------------------------------------------------------------

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // ป้องกันการเขียนทับซ้อนกรณีส่งพร้อมกัน

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);

    // ทำความสะอาดชื่อชุดข้อสอบเพื่อใช้เป็นชื่อชีตย่อย (Tab)
    var rawTitle = data.quizTitle ? String(data.quizTitle).trim() : "คะแนนสอบ";
    // ชื่อแท็บใน Google Sheets ห้ามมีตัวอักษร \\ / ? * : [ ] และยาวไม่เกิน 90 ตัวอักษร
    var safeTabName = rawTitle.replace(/[\\\\/?*:\\[\\]]/g, "_").substring(0, 90);

    // หาชีตย่อยตามชื่อชุดข้อสอบ หรือสร้างแท็บใหม่ทันทีหากยังไม่มี
    var sheet = ss.getSheetByName(safeTabName);
    if (!sheet) {
      sheet = ss.insertSheet(safeTabName);
    }

    // ตรวจสอบว่ามีแถวหัวตารางหรือยัง หากยังไม่มีให้สร้างอัตโนมัติ
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "วันที่-เวลาที่ส่ง",
        "รหัสนักศึกษา",
        "ชื่อ - นามสกุล",
        "ชุดข้อสอบ",
        "คะแนนที่ได้",
        "คะแนนเต็ม",
        "คิดเป็นร้อยละ (%)",
        "เวลาที่ใช้",
        "สลับแท็บ (ครั้ง)"
      ]);

      // ตกแต่งหัวตาราง
      var headerRange = sheet.getRange(1, 1, 1, 9);
      headerRange.setBackground("#18181b");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // เพิ่มข้อมูลนักศึกษา (ใส่เครื่องหมาย ' หน้าเลขรหัส เพื่อไม่ให้ 0 ด้านหน้าหาย)
    sheet.appendRow([
      data.timestamp || new Date().toLocaleString("th-TH"),
      "'" + (data.studentId || ""),
      data.fullName || "",
      data.quizTitle || "",
      data.score !== undefined ? data.score : 0,
      data.totalScore !== undefined ? data.totalScore : 0,
      (data.percentage !== undefined ? data.percentage : 0) + "%",
      data.timeTakenFormatted || "",
      data.tabSwitchCount !== undefined ? data.tabSwitchCount : 0
    ]);

    // จัดกึ่งกลางคอลัมน์รหัส, คะแนน, ร้อยละ, และการสลับแท็บ
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 2).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 5, 1, 5).setHorizontalAlignment("center");

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      sheet: safeTabName,
      row: lastRow
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}
`;
