import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { QuizQuestion, QuestionOption } from '@/types/quiz';

/**
 * Normalizes text for matching headers or keys
 */
function clean(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str).trim();
}

/**
 * Maps Thai choice keys (ก, ข, ค, ง) or letters (A, B, C, D) or numbers (1, 2, 3, 4)
 */
function normalizeKey(key: string): string {
  const k = key.trim().toUpperCase();
  if (k === '1' || k === 'A' || k === 'ก') return 'ก';
  if (k === '2' || k === 'B' || k === 'ข') return 'ข';
  if (k === '3' || k === 'C' || k === 'ค') return 'ค';
  if (k === '4' || k === 'D' || k === 'ง') return 'ง';
  if (k === '5' || k === 'E' || k === 'จ') return 'จ';
  return key.trim();
}

/**
 * Parses raw 2D array or object array into structured QuizQuestion list
 */
export function parseRawRowsToQuestions(rows: Record<string, unknown>[]): QuizQuestion[] {
  if (!rows || rows.length === 0) return [];

  const questions: QuizQuestion[] = [];

  rows.forEach((row, index) => {
    // Find column keys by fuzzy matching
    const rowKeys = Object.keys(row);

    const findVal = (patterns: string[]): string => {
      for (const pattern of patterns) {
        const foundKey = rowKeys.find(k => clean(k).toLowerCase().includes(pattern.toLowerCase()));
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
          return clean(row[foundKey]);
        }
      }
      return '';
    };

    const questionNo = findVal(['ข้อ', 'ลำดับ', 'no', 'number', 'num']) || String(index + 1);
    const questionText = findVal(['คำถาม', 'โจทย์', 'question', 'title']);

    if (!questionText) return; // Skip empty rows

    // Options ก, ข, ค, ง / A, B, C, D
    const optA = findVal(['ตัวเลือก ก', 'ตัวเลือกก', 'ตัวเลือก a', 'option a', 'choice a', 'ตัวเลือก 1', 'ก.']);
    const optB = findVal(['ตัวเลือก ข', 'ตัวเลือกข', 'ตัวเลือก b', 'option b', 'choice b', 'ตัวเลือก 2', 'ข.']);
    const optC = findVal(['ตัวเลือก ค', 'ตัวเลือกค', 'ตัวเลือก c', 'option c', 'choice c', 'ตัวเลือก 3', 'ค.']);
    const optD = findVal(['ตัวเลือก ง', 'ตัวเลือกง', 'ตัวเลือก d', 'option d', 'choice d', 'ตัวเลือก 4', 'ง.']);
    const optE = findVal(['ตัวเลือก จ', 'ตัวเลือกจ', 'ตัวเลือก e', 'option e', 'choice e', 'ตัวเลือก 5', 'จ.']);

    const rawAnswerKey = findVal(['เฉลย', 'คำตอบ', 'answer', 'correct', 'key']);
    const rawAnswerText = findVal(['คำตอบที่ถูก', 'คำตอบที่ถูกต้อง', 'correct answer', 'solution']);

    const options: QuestionOption[] = [];
    if (optA) options.push({ key: 'ก', text: optA });
    if (optB) options.push({ key: 'ข', text: optB });
    if (optC) options.push({ key: 'ค', text: optC });
    if (optD) options.push({ key: 'ง', text: optD });
    if (optE) options.push({ key: 'จ', text: optE });

    // Fallback: If options weren't found by named columns, inspect row entries
    if (options.length === 0) {
      // Maybe headerless or generic columns
      const values = Object.values(row).map(clean).filter(Boolean);
      // If values >= 5: [no, question, opt1, opt2, opt3, opt4, ansKey]
      if (values.length >= 6) {
        options.push({ key: 'ก', text: values[2] });
        options.push({ key: 'ข', text: values[3] });
        options.push({ key: 'ค', text: values[4] });
        options.push({ key: 'ง', text: values[5] });
      }
    }

    // Determine normalized answer key and text
    let correctKey = normalizeKey(rawAnswerKey);
    let correctText = rawAnswerText;

    // If answer key matched one of the options
    const matchedOptByKey = options.find(o => normalizeKey(o.key) === correctKey);
    if (matchedOptByKey) {
      correctKey = matchedOptByKey.key;
      if (!correctText) correctText = matchedOptByKey.text;
    } else if (rawAnswerText) {
      // Try to find which option text matches rawAnswerText
      const matchedOptByText = options.find(o => clean(o.text).toLowerCase() === clean(rawAnswerText).toLowerCase());
      if (matchedOptByText) {
        correctKey = matchedOptByText.key;
        correctText = matchedOptByText.text;
      }
    }

    // If still no correct key found, default to first option
    if (!correctKey && options.length > 0) {
      correctKey = options[0].key;
      correctText = options[0].text;
    }

    questions.push({
      id: `q_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
      number: parseInt(questionNo, 10) || index + 1,
      question: questionText,
      options,
      correctAnswerKey: correctKey,
      correctAnswerText: correctText,
      points: 1,
    });
  });

  return questions;
}

/**
 * Parses CSV text into QuizQuestion array
 */
export function parseCSV(csvContent: string): QuizQuestion[] {
  const result = Papa.parse<Record<string, unknown>>(csvContent.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  });

  if (result.data && result.data.length > 0) {
    return parseRawRowsToQuestions(result.data);
  }

  // Fallback to array of arrays
  const arrayResult = Papa.parse<string[]>(csvContent.trim(), {
    header: false,
    skipEmptyLines: true,
  });

  if (arrayResult.data && arrayResult.data.length > 1) {
    const headers = arrayResult.data[0].map(h => h.trim());
    const rows = arrayResult.data.slice(1).map(row => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    });
    return parseRawRowsToQuestions(rows);
  }

  return [];
}

/**
 * Parses Excel (.xlsx, .xls) buffer into QuizQuestion array
 */
export function parseExcel(buffer: ArrayBuffer | Buffer): QuizQuestion[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

  return parseRawRowsToQuestions(jsonRows);
}

/**
 * Extracts Google Sheet CSV export link from standard Google Sheet URL
 */
export function extractGoogleSheetCsvUrl(sheetUrl: string): string | null {
  const trimmed = sheetUrl.trim();
  
  // Pattern 1: https://docs.google.com/spreadsheets/d/{ID}/edit...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    const id = match[1];
    // Check if there is a specific gid
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gidParam}`;
  }

  // Pattern 2: published to web URL: https://docs.google.com/spreadsheets/d/e/{ID}/pubhtml...
  const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)\//);
  if (pubMatch && pubMatch[1]) {
    return `https://docs.google.com/spreadsheets/d/e/${pubMatch[1]}/pub?output=csv`;
  }

  return null;
}

/**
 * Returns sample CSV content identical to user's example
 */
export function getSampleCSV(): string {
  return `"ข้อ","คำถาม","ตัวเลือก ก","ตัวเลือก ข","ตัวเลือก ค","ตัวเลือก ง","เฉลย","คำตอบที่ถูก"
"1","แบบจำลองของอินเทอร์เน็ต (TCP/IP protocol suite) แบ่งการทำงานออกเป็นกี่เลเยอร์","4 เลเยอร์","5 เลเยอร์","6 เลเยอร์","7 เลเยอร์","ข","5 เลเยอร์"
"2","แบบจำลอง OSI แบ่งการทำงานออกเป็นกี่เลเยอร์","4 เลเยอร์","5 เลเยอร์","6 เลเยอร์","7 เลเยอร์","ง","7 เลเยอร์"
"3","แบบจำลอง OSI (Open Systems Interconnection) ถูกพัฒนาขึ้นโดยองค์กรใด","IEEE","ITU-T","ISO","ANSI","ค","ISO"
"4","เลเยอร์ใดบ้างที่มีในแบบจำลอง OSI แต่ไม่มีในแบบจำลองของอินเทอร์เน็ต","Session และ Presentation","Network และ Transport","Data link และ Physical","Application และ Session","ก","Session และ Presentation"
"5","ที่เครื่องต้นทาง ข้อมูลจะเคลื่อนผ่านเลเยอร์ต่าง ๆ ในลักษณะใด","จากเลเยอร์ล่างสุดขึ้นไปเลเยอร์บนสุด","จากเลเยอร์บนสุดลงมาเลเยอร์ล่างสุด","ส่งตรงจากเลเยอร์ 5 ไปยังสื่อโดยไม่ผ่านเลเยอร์อื่น","เริ่มจากเลเยอร์ 3 แล้วกระจายขึ้นและลง","ข","จากเลเยอร์บนสุดลงมาเลเยอร์ล่างสุด"`;
}

/**
 * Generates sample Excel buffer for download
 */
export function getSampleExcelBuffer(): Buffer {
  const data = [
    ["ข้อ", "คำถาม", "ตัวเลือก ก", "ตัวเลือก ข", "ตัวเลือก ค", "ตัวเลือก ง", "เฉลย", "คำตอบที่ถูก"],
    ["1", "แบบจำลองของอินเทอร์เน็ต (TCP/IP protocol suite) แบ่งการทำงานออกเป็นกี่เลเยอร์", "4 เลเยอร์", "5 เลเยอร์", "6 เลเยอร์", "7 เลเยอร์", "ข", "5 เลเยอร์"],
    ["2", "แบบจำลอง OSI แบ่งการทำงานออกเป็นกี่เลเยอร์", "4 เลเยอร์", "5 เลเยอร์", "6 เลเยอร์", "7 เลเยอร์", "ง", "7 เลเยอร์"],
    ["3", "แบบจำลอง OSI (Open Systems Interconnection) ถูกพัฒนาขึ้นโดยองค์กรใด", "IEEE", "ITU-T", "ISO", "ANSI", "ค", "ISO"],
    ["4", "เลเยอร์ใดบ้างที่มีในแบบจำลอง OSI แต่ไม่มีในแบบจำลองของอินเทอร์เน็ต", "Session และ Presentation", "Network และ Transport", "Data link และ Physical", "Application และ Session", "ก", "Session และ Presentation"],
    ["5", "ที่เครื่องต้นทาง ข้อมูลจะเคลื่อนผ่านเลเยอร์ต่าง ๆ ในลักษณะใด", "จากเลเยอร์ล่างสุดขึ้นไปเลเยอร์บนสุด", "จากเลเยอร์บนสุดลงมาเลเยอร์ล่างสุด", "ส่งตรงจากเลเยอร์ 5 ไปยังสื่อโดยไม่ผ่านเลเยอร์อื่น", "เริ่มจากเลเยอร์ 3 แล้วกระจายขึ้นและลง", "ข", "จากเลเยอร์บนสุดลงมาเลเยอร์ล่างสุด"]
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  // Set column widths
  ws['!cols'] = [
    { wch: 6 },
    { wch: 50 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 8 },
    { wch: 25 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ข้อสอบ");
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
