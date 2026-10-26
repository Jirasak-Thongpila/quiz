import { Quiz, QuizSubmission } from '@/types/quiz';

/**
 * Detailed question answer breakdown sent to Google Sheets
 */
export interface QuestionResultItem {
  number: number;
  question: string;
  selectedKey: string; // e.g. "ก", "ข", or "ไม่ได้ตอบ"
  correctKey: string;  // e.g. "ก"
  isCorrect: boolean;
}

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
  questionResults?: QuestionResultItem[];
}

/**
 * Sends student submission results to a Google Apps Script Webhook URL
 */
export async function sendSubmissionToGoogleSheets(
  webhookUrl: string,
  submission: QuizSubmission,
  quiz?: Quiz | null
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
    return { success: false, error: 'URL Webhook ไม่ถูกต้องหรือไม่ได้รับค่า' };
  }

  // Build question results breakdown if quiz questions exist
  const questionResults: QuestionResultItem[] = quiz?.questions
    ? quiz.questions.map((q) => {
        const selected = (submission.answers && submission.answers[q.id]) || '';
        const isCorrect = Boolean(
          selected && selected.trim() === q.correctAnswerKey.trim()
        );
        return {
          number: q.number,
          question: q.question,
          selectedKey: selected ? selected.trim() : 'ไม่ได้ตอบ',
          correctKey: q.correctAnswerKey.trim(),
          isCorrect,
        };
      })
    : [];

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
    questionResults,
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
 * Automatically creates individual sheet tabs per quiz and records question-by-question answers!
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// -------------------------------------------------------------
// Google Apps Script สำหรับรับผลคะแนนจากระบบ Quiz System (แบบรวมไฟล์เดียว)
// นำโค้ดนี้ไปวางใน Google Sheets: ส่วนขยาย (Extensions) > Apps Script
//
// จุดเด่น: 
// 1. แยกแท็บ (Tab) ชีตย่อยตามชื่อชุดข้อสอบให้อัตโนมัติในไฟล์เดียว!
// 2. บันทึกคำตอบ "รายข้อ" (บอกว่าผู้สอบตอบข้อไหน และ ถูก ✓ / ผิด ✗ พร้อมเฉลย)
// 3. นำ URL ไปใส่ใน .env.local ที่ DEFAULT_GOOGLE_SHEETS_WEBHOOK เพียงครั้งเดียว
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

    var questionResults = data.questionResults || [];
    var isNewSheet = sheet.getLastRow() === 0;

    // ตรวจสอบว่ามีแถวหัวตารางหรือยัง หากยังไม่มีให้สร้างอัตโนมัติ
    if (isNewSheet) {
      var headerRow = [
        "วันที่-เวลาที่ส่ง",
        "รหัสนักศึกษา",
        "ชื่อ - นามสกุล",
        "ชุดข้อสอบ",
        "คะแนนที่ได้",
        "คะแนนเต็ม",
        "คิดเป็นร้อยละ (%)",
        "เวลาที่ใช้",
        "สลับแท็บ (ครั้ง)"
      ];

      // เพิ่มคอลัมน์คำตอบรายข้อ: "ข้อ 1 (เฉลย: ข)", "ข้อ 2 (เฉลย: ก)", ...
      for (var i = 0; i < questionResults.length; i++) {
        var qr = questionResults[i];
        headerRow.push("ข้อ " + qr.number + " (เฉลย: " + qr.correctKey + ")");
      }

      sheet.appendRow(headerRow);

      // ตกแต่งหัวตาราง
      var headerRange = sheet.getRange(1, 1, 1, headerRow.length);
      headerRange.setBackground("#18181b");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    } else {
      // กรณีชีตเดิมมี 9 คอลัมน์หลักอยู่แล้ว แต่ยังไม่มีคอลัมน์รายข้อ ให้เพิ่มหัวตารางให้ครบ
      var currentCols = sheet.getLastColumn();
      var neededCols = 9 + questionResults.length;
      if (currentCols < neededCols && questionResults.length > 0) {
        for (var k = currentCols; k < neededCols; k++) {
          var qIndex = k - 9;
          var qItem = questionResults[qIndex];
          var cell = sheet.getRange(1, k + 1);
          cell.setValue("ข้อ " + qItem.number + " (เฉลย: " + qItem.correctKey + ")");
          cell.setBackground("#18181b").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
        }
      }
    }

    // เตรียมข้อมูลนักศึกษา
    var studentRow = [
      data.timestamp || new Date().toLocaleString("th-TH"),
      "'" + (data.studentId || ""),
      data.fullName || "",
      data.quizTitle || "",
      data.score !== undefined ? data.score : 0,
      data.totalScore !== undefined ? data.totalScore : 0,
      (data.percentage !== undefined ? data.percentage : 0) + "%",
      data.timeTakenFormatted || "",
      data.tabSwitchCount !== undefined ? data.tabSwitchCount : 0
    ];

    // บันทึกคำตอบแต่ละข้อ: "✓ ก" หรือ "✗ ข (เฉลย: ก)"
    for (var j = 0; j < questionResults.length; j++) {
      var ans = questionResults[j];
      if (ans.isCorrect) {
        studentRow.push("✓ " + ans.selectedKey);
      } else {
        if (ans.selectedKey === "ไม่ได้ตอบ") {
          studentRow.push("- ไม่ได้ตอบ (เฉลย: " + ans.correctKey + ")");
        } else {
          studentRow.push("✗ " + ans.selectedKey + " (เฉลย: " + ans.correctKey + ")");
        }
      }
    }

    sheet.appendRow(studentRow);

    // จัดกึ่งกลางคอลัมน์รหัส, คะแนน, ร้อยละ, การสลับแท็บ และคำตอบรายข้อ
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 2).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 5, 1, studentRow.length - 4).setHorizontalAlignment("center");

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
