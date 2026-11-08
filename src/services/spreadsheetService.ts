import * as XLSX from 'xlsx';
import { StudentScoreBoard, ScoreItem } from '../types';

export type UploadScope = 
  | 'ALL'
  | 'WW1' | 'WW2' | 'WW3' | 'WW4' | 'WW5'
  | 'PT1' | 'PT2' | 'PT3'
  | 'ST1' | 'ST2'
  | 'TE';

export interface ParsedSingleTaskRow {
  studentNumber?: string;
  studentName: string;
  studentEmail?: string;
  lrn?: string;
  classCode: string;
  score: number;
  status: 'valid' | 'invalid';
  errors?: string[];
}

export interface ParsedSpreadsheetRow {
  studentNumber: string;
  studentName: string;
  studentEmail?: string;
  lrn?: string;
  classCode: string;
  subjectName: string;
  section?: string;
  wwScores: number[]; // 2 to 5 items
  ptScores: number[]; // 3 items
  stScores: number[]; // 2 items
  termScore: number;
  remarks?: string;
  status: 'valid' | 'invalid';
  errors?: string[];
}

export function parseScoreBoardSpreadsheet(
  file: File, 
  defaultClassCode = 'SKI-10A', 
  defaultSubject = 'Mathematics 10'
): Promise<{
  rows: ParsedSpreadsheetRow[];
  headers: string[];
  validCount: number;
  invalidCount: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('Spreadsheet appears to be empty or has no readable rows.');
        }

        const headers = Object.keys(rawJson[0] || {});
        const parsedRows = mapAndValidateSpreadsheetRows(rawJson, defaultClassCode, defaultSubject);

        const validCount = parsedRows.filter((r) => r.status === 'valid').length;
        const invalidCount = parsedRows.length - validCount;

        resolve({
          rows: parsedRows,
          headers,
          validCount,
          invalidCount,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse spreadsheet file'));
      }
    };

    reader.onerror = () => reject(new Error('File reading error.'));
    reader.readAsArrayBuffer(file);
  });
}

function findKey(row: any, candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const found = keys.find((k) => 
      k.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === c.toLowerCase().replace(/[^a-z0-9]/g, '')
    );
    if (found) return found;
  }
  return undefined;
}

function getNumericVal(val: any, fallback = 0): number {
  if (val === '' || val === null || val === undefined) return fallback;
  const num = Number(val);
  return isNaN(num) || num < 0 ? fallback : num;
}

export function mapAndValidateSpreadsheetRows(
  rawRows: any[],
  defaultClassCode = 'SKI-10A',
  defaultSubject = 'Mathematics 10'
): ParsedSpreadsheetRow[] {
  return rawRows.map((row, index) => {
    const errors: string[] = [];

    const stuNumKey = findKey(row, ['no', 'studentid', 'studentnumber', 'id', 'student_id']);
    const lrnKey = findKey(row, ['lrn', 'learnerreferencenumber', 'lrnno', 'learner_reference_number', 'depedlrn']);
    const nameKey = findKey(row, ['learnersnames', 'learnernames', 'studentname', 'name', 'fullname', 'learnersname']);
    const emailKey = findKey(row, ['email', 'studentemail']);
    const classCodeKey = findKey(row, ['classcode', 'code', 'sectioncode']);
    const subjectKey = findKey(row, ['subject', 'subjectname', 'course']);
    const sectionKey = findKey(row, ['section', 'gradelevel']);
    const remarksKey = findKey(row, ['remarks', 'feedback', 'comments']);

    const rawName = String(row[nameKey || ''] || '').trim();
    // Skip empty summary/gender label rows like "MALE" or "HIGHEST POSSIBLE SCORE"
    if (rawName.toUpperCase() === 'MALE' || rawName.toUpperCase() === 'FEMALE' || rawName.includes('HIGHEST')) {
      return {
        studentNumber: '',
        studentName: '',
        classCode: defaultClassCode,
        subjectName: defaultSubject,
        wwScores: [0, 0],
        ptScores: [0, 0, 0],
        stScores: [0, 0],
        termScore: 0,
        status: 'invalid' as const,
        errors: ['Header/category row skipped'],
      };
    }

    const studentNumber = String(row[stuNumKey || ''] || `2024-${String(index + 1).padStart(4, '0')}`).trim();
    const lrn = lrnKey ? String(row[lrnKey]).trim() : undefined;
    const studentName = rawName || `Learner ${index + 1}`;
    const studentEmail = emailKey ? String(row[emailKey]).trim() : undefined;
    const classCode = String(row[classCodeKey || ''] || defaultClassCode).trim().toUpperCase();
    const subjectName = String(row[subjectKey || ''] || defaultSubject).trim();
    const section = sectionKey ? String(row[sectionKey]).trim() : 'Grade 10 - St. Jude';
    const remarks = remarksKey ? String(row[remarksKey]).trim() : undefined;

    if (!rawName) {
      errors.push('Missing Student / Learner Name');
    }

    // 1. Written Works (1, 2, 3... up to 5)
    const ww1Key = findKey(row, ['ww1', 'writtenoralworks1', 'written1', '1']);
    const ww2Key = findKey(row, ['ww2', 'writtenoralworks2', 'written2', '2']);
    const ww3Key = findKey(row, ['ww3', 'writtenoralworks3', 'written3', '3']);
    const ww4Key = findKey(row, ['ww4', 'writtenoralworks4', 'written4', '4']);
    const ww5Key = findKey(row, ['ww5', 'writtenoralworks5', 'written5', '5']);

    const ww1 = getNumericVal(row[ww1Key || ''], 20);
    const ww2 = getNumericVal(row[ww2Key || ''], 20);
    const ww3 = getNumericVal(row[ww3Key || ''], 18);
    const wwScores: number[] = [ww1, ww2, ww3];

    if (ww4Key && row[ww4Key] !== '') wwScores.push(getNumericVal(row[ww4Key]));
    if (ww5Key && row[ww5Key] !== '') wwScores.push(getNumericVal(row[ww5Key]));

    // 2. Product / Performance Tasks (PT1, PT2, PT3)
    const pt1Key = findKey(row, ['pt1', 'productperformancetasks1', 'performancetasks1', 'ptask1']);
    const pt2Key = findKey(row, ['pt2', 'productperformancetasks2', 'performancetasks2', 'ptask2']);
    const pt3Key = findKey(row, ['pt3', 'productperformancetasks3', 'performancetasks3', 'ptask3']);

    const pt1 = getNumericVal(row[pt1Key || ''], 25);
    const pt2 = getNumericVal(row[pt2Key || ''], 26);
    const pt3 = getNumericVal(row[pt3Key || ''], 27);
    const ptScores = [pt1, pt2, pt3];

    // 3. Examinations (ST1, ST2, TE)
    const st1Key = findKey(row, ['st1', 'summativetest1', 'st130']);
    const st2Key = findKey(row, ['st2', 'summativetest2', 'st230']);
    const termKey = findKey(row, ['te', 'termexam', 'termexamination', 'te60', 'quarterlyexam']);

    const st1 = getNumericVal(row[st1Key || ''], 24);
    const st2 = getNumericVal(row[st2Key || ''], 25);
    const stScores = [st1, st2];

    const termScore = getNumericVal(row[termKey || ''], 50);

    return {
      studentNumber,
      lrn,
      studentName,
      studentEmail,
      classCode,
      subjectName,
      section,
      wwScores,
      ptScores,
      stScores,
      termScore,
      remarks,
      status: (errors.length === 0 ? 'valid' : 'invalid') as 'valid' | 'invalid',
      errors: errors.length > 0 ? errors : undefined,
    };
  }).filter((r) => r.studentName !== '');
}

export function convertParsedRowToScoreBoard(
  row: ParsedSpreadsheetRow,
  teacherName = 'Prof. Tanjosell'
): StudentScoreBoard {
  const writtenWorks: ScoreItem[] = row.wwScores.map((score, i) => ({
    id: `ww-${i + 1}`,
    title: `Written/Oral Work ${i + 1}`,
    score,
    maxScore: i < 2 ? 25 : 20,
  }));

  const performanceTasks: ScoreItem[] = row.ptScores.map((score, i) => ({
    id: `pt-${i + 1}`,
    title: `Product/Performance Task ${i + 1}`,
    score,
    maxScore: 30,
  }));

  const summativeTests: ScoreItem[] = row.stScores.map((score, i) => ({
    id: `st-${i + 1}`,
    title: `Summative Test ${i + 1} (ST${i + 1})`,
    score,
    maxScore: 30,
  }));

  const termExam: ScoreItem = {
    id: 'term-1',
    title: 'Quarterly Term Examination (TE)',
    score: row.termScore,
    maxScore: 60,
  };

  return {
    id: `sb-${row.studentNumber || Math.random().toString(36).substring(2, 7)}-${row.classCode.toLowerCase()}`,
    studentId: `stu-${row.studentNumber || Math.random().toString(36).substring(2, 7)}`,
    studentNumber: row.studentNumber,
    lrn: row.lrn,
    studentName: row.studentName,
    studentEmail: row.studentEmail,
    classCode: row.classCode,
    subjectName: row.subjectName,
    section: row.section || 'Grade 10 - St. Jude',
    teacherName,
    writtenWorks,
    performanceTasks,
    summativeTests,
    termExam,
    remarks: row.remarks || 'Commendable effort and participation in ASKI-SKI academic activities.',
    updatedAt: new Date().toISOString(),
  };
}

// --- Single-Task / Specific-Part Parsing & Templates ---
export function parseSingleTaskSpreadsheet(
  file: File,
  scope: UploadScope,
  defaultClassCode = 'SKI-10A',
  defaultSubject = 'Mathematics 10'
): Promise<{
  rows: ParsedSingleTaskRow[];
  headers: string[];
  validCount: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('Spreadsheet appears to be empty or has no readable rows.');
        }

        const headers = Object.keys(rawJson[0] || {});
        const parsedRows: ParsedSingleTaskRow[] = [];

        rawJson.forEach((row, index) => {
          const nameKey = findKey(row, ['learnersnames', 'learnernames', 'studentname', 'name', 'fullname', 'learnersname']);
          const rawName = String(row[nameKey || ''] || '').trim();

          if (!rawName || rawName.toUpperCase() === 'MALE' || rawName.toUpperCase() === 'FEMALE' || rawName.includes('HIGHEST')) {
            return;
          }

          const stuNumKey = findKey(row, ['no', 'studentid', 'studentnumber', 'id', 'student_id']);
          const lrnKey = findKey(row, ['lrn', 'learnerreferencenumber', 'lrnno', 'learner_reference_number', 'depedlrn']);
          const emailKey = findKey(row, ['email', 'studentemail']);
          const classCodeKey = findKey(row, ['classcode', 'code', 'sectioncode']);

          const studentNumber = String(row[stuNumKey || ''] || `2024-${String(index + 1).padStart(4, '0')}`).trim();
          const lrn = lrnKey ? String(row[lrnKey]).trim() : undefined;
          const studentEmail = emailKey ? String(row[emailKey]).trim() : undefined;
          const classCode = String(row[classCodeKey || ''] || defaultClassCode).trim().toUpperCase();

          // Search for specific scope column or fallback to 'score' or any numeric column
          const scopeKey = findKey(row, [
            scope.toLowerCase(),
            `${scope.toLowerCase()}score`,
            `score`,
            `points`,
            `mark`,
            `grade`
          ]);

          let score = 0;
          if (scopeKey && row[scopeKey] !== '') {
            score = getNumericVal(row[scopeKey], 0);
          } else {
            // Find first numeric column that is not 'no' or 'id' or 'lrn'
            const candidateKeys = Object.keys(row).filter((k) => {
              const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
              return lower !== 'no' && lower !== 'id' && lower !== 'lrn' && lower !== 'studentid' && !lower.includes('name');
            });
            for (const ck of candidateKeys) {
              const val = row[ck];
              if (val !== '' && !isNaN(Number(val))) {
                score = Number(val);
                break;
              }
            }
          }

          parsedRows.push({
            studentNumber,
            studentName: rawName,
            studentEmail,
            lrn,
            classCode,
            score,
            status: 'valid',
          });
        });

        resolve({
          rows: parsedRows,
          headers,
          validCount: parsedRows.length,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse single-task spreadsheet'));
      }
    };

    reader.onerror = () => reject(new Error('File reading error.'));
    reader.readAsArrayBuffer(file);
  });
}

export function downloadSingleTaskTemplate(
  scope: UploadScope,
  classCode = 'SKI-10A',
  subjectName = 'Mathematics 10',
  learners?: { name: string; lrn?: string; studentNumber?: string }[]
) {
  const defaultLearners = [
    { name: 'Adriano, Jiro De Guzman', lrn: '102938475601', studentNumber: '2024-0001' },
    { name: 'Agunoy, Ichiro Villanueva', lrn: '102938475602', studentNumber: '2024-0002' },
    { name: 'Bulanadi, Calvin Joshua Villaseñor', lrn: '102938475603', studentNumber: '2024-0003' },
    { name: 'Bustamante, Rio Franklin A.', lrn: '102938475604', studentNumber: '2024-0004' },
    { name: 'Corpuz, Ariel V.', lrn: '102938475605', studentNumber: '2024-0005' },
  ];

  const sourceList = learners && learners.length > 0 ? learners : defaultLearners;

  const data = sourceList.map((item, idx) => ({
    'NO.': idx + 1,
    "LEARNERS' NAMES": item.name,
    'LRN': item.lrn || '',
    'CLASS CODE': classCode,
    [`SCORE (${scope})`]: scope.startsWith('WW') ? 22 : scope.startsWith('PT') ? 27 : scope.startsWith('ST') ? 25 : 52,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${scope}_Scores`);
  XLSX.writeFile(wb, `ASKI_SKI_${classCode}_${scope}_Scores.xlsx`);
}

// Download template styled precisely after the uploaded school sheet
export function downloadAskISkiSampleTemplate() {
  const sampleData = [
    {
      'NO.': 1,
      "LEARNERS' NAMES": 'Adriano, Jiro De Guzman',
      'GENDER': 'MALE',
      'CLASS CODE': 'SKI-10A',
      'WW1 (max 25)': 24,
      'WW2 (max 25)': 23,
      'WW3 (max 20)': 19,
      'PT1 (max 30)': 28,
      'PT2 (max 30)': 29,
      'PT3 (max 30)': 27,
      'ST1 (max 30)': 28,
      'ST2 (max 30)': 27,
      'TE (max 60)': 55,
      'REMARKS': 'Consistent high marks in oral works.',
    },
    {
      'NO.': 2,
      "LEARNERS' NAMES": 'Agunoy, Ichiro Villanueva',
      'GENDER': 'MALE',
      'CLASS CODE': 'SKI-10A',
      'WW1 (max 25)': 22,
      'WW2 (max 25)': 21,
      'WW3 (max 20)': 18,
      'PT1 (max 30)': 27,
      'PT2 (max 30)': 26,
      'PT3 (max 30)': 28,
      'ST1 (max 30)': 24,
      'ST2 (max 30)': 25,
      'TE (max 60)': 51,
      'REMARKS': 'Solid mathematical intuition.',
    },
    {
      'NO.': 3,
      "LEARNERS' NAMES": 'Bulanadi, Calvin Joshua Villaseñor',
      'GENDER': 'MALE',
      'CLASS CODE': 'SKI-10A',
      'WW1 (max 25)': 21,
      'WW2 (max 25)': 20,
      'WW3 (max 20)': 17,
      'PT1 (max 30)': 25,
      'PT2 (max 30)': 26,
      'PT3 (max 30)': 26,
      'ST1 (max 30)': 22,
      'ST2 (max 30)': 24,
      'TE (max 60)': 48,
      'REMARKS': 'Active participant in group tasks.',
    },
    {
      'NO.': 4,
      "LEARNERS' NAMES": 'Bustamante, Rio Franklin A.',
      'GENDER': 'MALE',
      'CLASS CODE': 'SKI-10A',
      'WW1 (max 25)': 23,
      'WW2 (max 25)': 22,
      'WW3 (max 20)': 19,
      'PT1 (max 30)': 27,
      'PT2 (max 30)': 28,
      'PT3 (max 30)': 27,
      'ST1 (max 30)': 24,
      'ST2 (max 30)': 25,
      'TE (max 60)': 52,
      'REMARKS': 'Exemplary homework execution.',
    },
    {
      'NO.': 5,
      "LEARNERS' NAMES": 'Corpuz, Ariel V.',
      'GENDER': 'MALE',
      'CLASS CODE': 'SKI-10A',
      'WW1 (max 25)': 24,
      'WW2 (max 25)': 24,
      'WW3 (max 20)': 19,
      'PT1 (max 30)': 29,
      'PT2 (max 30)': 28,
      'PT3 (max 30)': 29,
      'ST1 (max 30)': 26,
      'ST2 (max 30)': 26,
      'TE (max 60)': 56,
      'REMARKS': 'Top performer in unit assessments.',
    },
    {
      'NO.': 6,
      "LEARNERS' NAMES": 'Eduardo, Euan Edward Rivera',
      'GENDER': 'MALE',
      'CLASS CODE': 'SKI-10A',
      'WW1 (max 25)': 22,
      'WW2 (max 25)': 23,
      'WW3 (max 20)': 18,
      'PT1 (max 30)': 26,
      'PT2 (max 30)': 27,
      'PT3 (max 30)': 28,
      'ST1 (max 30)': 24,
      'ST2 (max 30)': 25,
      'TE (max 60)': 50,
      'REMARKS': 'Shows great dedication and focus.',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ASKI_SKI_E_Record');
  XLSX.writeFile(wb, 'ASKI_SKI_Class_Score_Record.xlsx');
}

// Download live class record formatted for easy offline editing in Excel and re-uploading
export function exportClassRecordSpreadsheet(
  scoreboards: StudentScoreBoard[],
  classCode: string,
  subjectName: string
) {
  const filtered = scoreboards.filter((sb) => sb.classCode.toUpperCase() === classCode.toUpperCase());
  const rows = filtered.map((sb, idx) => {
    const row: Record<string, any> = {
      'NO.': idx + 1,
      "LEARNERS' NAMES": sb.studentName,
      'LRN': sb.lrn || '',
      'STUDENT ID': sb.studentNumber || '',
      'CLASS CODE': sb.classCode || classCode,
      'SUBJECT': sb.subjectName || subjectName,
      'SECTION': sb.section || 'Grade 10',
    };

    (sb.writtenWorks || []).forEach((w, i) => {
      row[`WW${i + 1} (max ${w.maxScore})`] = w.score;
    });

    (sb.performanceTasks || []).forEach((p, i) => {
      row[`PT${i + 1} (max ${p.maxScore})`] = p.score;
    });

    (sb.summativeTests || []).forEach((s, i) => {
      row[`ST${i + 1} (max ${s.maxScore})`] = s.score;
    });

    row[`TE (max ${sb.termExam?.maxScore || 60})`] = sb.termExam?.score || 0;
    row['REMARKS'] = sb.remarks || 'Consistent academic performance.';

    return row;
  });

  const exportData = rows.length > 0 ? rows : [
    {
      'NO.': 1,
      "LEARNERS' NAMES": 'Sample Learner Name',
      'LRN': '102938475601',
      'STUDENT ID': '2024-0001',
      'CLASS CODE': classCode,
      'SUBJECT': subjectName,
      'SECTION': 'Grade 10',
      'WW1 (max 25)': 23,
      'WW2 (max 25)': 22,
      'WW3 (max 20)': 18,
      'PT1 (max 30)': 28,
      'PT2 (max 30)': 27,
      'PT3 (max 30)': 28,
      'ST1 (max 30)': 25,
      'ST2 (max 30)': 26,
      'TE (max 60)': 52,
      'REMARKS': 'Consistent academic performance.',
    }
  ];

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Class_Record');
  XLSX.writeFile(wb, `ASKI_SKI_${classCode}_Class_Record.xlsx`);
}

export function generateDemoBatchRows(classCode = 'SKI-10A'): ParsedSpreadsheetRow[] {
  return [
    {
      studentNumber: '2024-0001',
      studentName: 'Adriano, Jiro De Guzman',
      studentEmail: 'jiro.adriano@aski-ski.edu.ph',
      classCode,
      subjectName: 'Mathematics 10',
      section: 'Grade 10 - St. Jude',
      wwScores: [24, 23, 19],
      ptScores: [28, 29, 27],
      stScores: [28, 27],
      termScore: 55,
      remarks: 'Consistent demonstration of high academic excellence.',
      status: 'valid',
    },
    {
      studentNumber: '2024-0002',
      studentName: 'Agunoy, Ichiro Villanueva',
      studentEmail: 'ichiro.agunoy@aski-ski.edu.ph',
      classCode,
      subjectName: 'Mathematics 10',
      section: 'Grade 10 - St. Jude',
      wwScores: [22, 21, 18],
      ptScores: [27, 26, 28],
      stScores: [24, 25],
      termScore: 51,
      remarks: 'Very satisfactory performance and class contribution.',
      status: 'valid',
    },
    {
      studentNumber: '2024-0003',
      studentName: 'Bulanadi, Calvin Joshua Villaseñor',
      studentEmail: 'calvin.bulanadi@aski-ski.edu.ph',
      classCode,
      subjectName: 'Mathematics 10',
      section: 'Grade 10 - St. Jude',
      wwScores: [21, 20, 17],
      ptScores: [25, 26, 26],
      stScores: [22, 24],
      termScore: 48,
      remarks: 'Good progress and consistent attendance.',
      status: 'valid',
    },
    {
      studentNumber: '2024-0004',
      studentName: 'Bustamante, Rio Franklin A.',
      studentEmail: 'rio.bustamante@aski-ski.edu.ph',
      classCode,
      subjectName: 'Mathematics 10',
      section: 'Grade 10 - St. Jude',
      wwScores: [23, 22, 19],
      ptScores: [27, 28, 27],
      stScores: [24, 25],
      termScore: 52,
      remarks: 'Exemplary project presentation.',
      status: 'valid',
    },
    {
      studentNumber: '2024-0005',
      studentName: 'Corpuz, Ariel V.',
      studentEmail: 'ariel.corpuz@aski-ski.edu.ph',
      classCode,
      subjectName: 'Mathematics 10',
      section: 'Grade 10 - St. Jude',
      wwScores: [24, 24, 19],
      ptScores: [29, 28, 29],
      stScores: [26, 26],
      termScore: 56,
      remarks: 'Top score in summative tests.',
      status: 'valid',
    },
  ];
}
