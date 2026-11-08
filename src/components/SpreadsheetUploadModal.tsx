import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ArrowRight, 
  Sparkles, 
  Download, 
  RefreshCw,
  Layers,
  ChevronDown
} from 'lucide-react';
import { StudentScoreBoard, ScoreItem } from '../types';
import { 
  parseScoreBoardSpreadsheet, 
  parseSingleTaskSpreadsheet,
  convertParsedRowToScoreBoard, 
  downloadAskISkiSampleTemplate, 
  downloadSingleTaskTemplate,
  generateDemoBatchRows,
  ParsedSpreadsheetRow,
  ParsedSingleTaskRow,
  UploadScope 
} from '../services/spreadsheetService';
import { saveBatchScoreBoards } from '../services/dbService';
import confetti from 'canvas-confetti';

interface SpreadsheetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  classCode: string;
  subjectName: string;
  teacherName?: string;
  existingScoreboards?: StudentScoreBoard[];
  initialScope?: UploadScope;
}

export const SpreadsheetUploadModal: React.FC<SpreadsheetUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  classCode,
  subjectName,
  teacherName = 'Prof. Tanjosell',
  existingScoreboards = [],
  initialScope = 'ALL',
}) => {
  const [scope, setScope] = useState<UploadScope>(initialScope);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedSpreadsheetRow[]>([]);
  const [parsedSingleRows, setParsedSingleRows] = useState<ParsedSingleTaskRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setParsedSingleRows([]);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    setScope(initialScope);
    handleReset();
  }, [initialScope, isOpen]);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (scope === 'ALL') {
        const result = await parseScoreBoardSpreadsheet(file, classCode, subjectName);
        setParsedRows(result.rows);
        setParsedSingleRows([]);
      } else {
        const result = await parseSingleTaskSpreadsheet(file, scope, classCode, subjectName);
        setParsedSingleRows(result.rows);
        setParsedRows([]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not parse spreadsheet. Please verify file format.');
      setParsedRows([]);
      setParsedSingleRows([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleQuickLoadDemo = () => {
    if (scope === 'ALL') {
      const demoRows = generateDemoBatchRows(classCode);
      setParsedRows(demoRows);
      setParsedSingleRows([]);
      setSelectedFile(new File([''], `ASKI_SKI_${classCode}_Full_Record.xlsx`));
    } else {
      const demoSingle: ParsedSingleTaskRow[] = [
        { studentNumber: '2024-0001', studentName: 'Adriano, Jiro De Guzman', lrn: '102938475601', classCode, score: 24, status: 'valid' },
        { studentNumber: '2024-0002', studentName: 'Agunoy, Ichiro Villanueva', lrn: '102938475602', classCode, score: 22, status: 'valid' },
        { studentNumber: '2024-0003', studentName: 'Bulanadi, Calvin Joshua Villaseñor', lrn: '102938475603', classCode, score: 21, status: 'valid' },
        { studentNumber: '2024-0004', studentName: 'Bustamante, Rio Franklin A.', lrn: '102938475604', classCode, score: 24, status: 'valid' },
        { studentNumber: '2024-0005', studentName: 'Corpuz, Ariel V.', lrn: '102938475605', classCode, score: 25, status: 'valid' },
      ];
      setParsedSingleRows(demoSingle);
      setParsedRows([]);
      setSelectedFile(new File([''], `ASKI_SKI_${classCode}_${scope}_Scores.xlsx`));
    }
    setErrorMessage(null);
  };

  const handleDownloadTemplate = () => {
    if (scope === 'ALL') {
      downloadAskISkiSampleTemplate();
    } else {
      // Pass existing learners for this class if available
      const classLearners = existingScoreboards
        .filter((s) => s.classCode.toUpperCase() === classCode.toUpperCase())
        .map((s) => ({ name: s.studentName, lrn: s.lrn, studentNumber: s.studentNumber }));
      downloadSingleTaskTemplate(scope, classCode, subjectName, classLearners);
    }
  };

  const handleCommitUpload = async () => {
    setIsUploading(true);
    setErrorMessage(null);

    try {
      if (scope === 'ALL') {
        const validRows = parsedRows.filter((r) => r.status === 'valid');
        if (validRows.length === 0) {
          throw new Error('No valid student rows found to commit.');
        }

        const scoreboards: StudentScoreBoard[] = validRows.map((r) =>
          convertParsedRowToScoreBoard(r, teacherName)
        );

        await saveBatchScoreBoards(scoreboards);
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        } catch (e) {}

        onSuccess(scoreboards.length);
      } else {
        // Single Task Mode: Update only the specific task score per student!
        const validRows = parsedSingleRows.filter((r) => r.status === 'valid');
        if (validRows.length === 0) {
          throw new Error('No valid student single-task rows found to commit.');
        }

        const updatedScoreboards: StudentScoreBoard[] = [];
        const classSBs = existingScoreboards.filter((s) => s.classCode.toUpperCase() === classCode.toUpperCase());

        for (const row of validRows) {
          // Find matching existing scoreboard
          let matched = classSBs.find(
            (s) =>
              (row.lrn && s.lrn && s.lrn.trim() === row.lrn.trim()) ||
              (row.studentNumber && s.studentNumber && s.studentNumber.trim() === row.studentNumber.trim()) ||
              (s.studentName.toLowerCase().trim() === row.studentName.toLowerCase().trim())
          );

          if (matched) {
            // Clone and mutate specific item
            const cloned: StudentScoreBoard = JSON.parse(JSON.stringify(matched));

            if (scope.startsWith('WW')) {
              const idx = parseInt(scope.replace('WW', ''), 10) - 1;
              if (!cloned.writtenWorks) cloned.writtenWorks = [];
              while (cloned.writtenWorks.length <= idx) {
                cloned.writtenWorks.push({
                  id: `ww-${cloned.writtenWorks.length + 1}`,
                  title: `Written Work ${cloned.writtenWorks.length + 1}`,
                  score: 0,
                  maxScore: cloned.writtenWorks.length < 2 ? 25 : 20,
                });
              }
              cloned.writtenWorks[idx].score = row.score;
            } else if (scope.startsWith('PT')) {
              const idx = parseInt(scope.replace('PT', ''), 10) - 1;
              if (!cloned.performanceTasks) cloned.performanceTasks = [];
              while (cloned.performanceTasks.length <= idx) {
                cloned.performanceTasks.push({
                  id: `pt-${cloned.performanceTasks.length + 1}`,
                  title: `Performance Task ${cloned.performanceTasks.length + 1}`,
                  score: 0,
                  maxScore: 30,
                });
              }
              cloned.performanceTasks[idx].score = row.score;
            } else if (scope === 'ST1') {
              if (!cloned.summativeTests) cloned.summativeTests = [];
              if (!cloned.summativeTests[0]) {
                cloned.summativeTests[0] = { id: 'st-1', title: 'Summative Test 1', score: row.score, maxScore: 30 };
              } else {
                cloned.summativeTests[0].score = row.score;
              }
            } else if (scope === 'ST2') {
              if (!cloned.summativeTests) cloned.summativeTests = [];
              if (!cloned.summativeTests[1]) {
                cloned.summativeTests[1] = { id: 'st-2', title: 'Summative Test 2', score: row.score, maxScore: 30 };
              } else {
                cloned.summativeTests[1].score = row.score;
              }
            } else if (scope === 'TE') {
              if (!cloned.termExam) {
                cloned.termExam = { id: 'term-1', title: 'Quarterly Term Exam', score: row.score, maxScore: 60 };
              } else {
                cloned.termExam.score = row.score;
              }
            }

            cloned.updatedAt = new Date().toISOString();
            updatedScoreboards.push(cloned);
          } else {
            // Create a brand new scoreboard with defaults and this specific task set
            const newSB = convertParsedRowToScoreBoard(
              {
                studentNumber: row.studentNumber || `2024-${Math.floor(1000 + Math.random() * 9000)}`,
                studentName: row.studentName,
                studentEmail: row.studentEmail,
                lrn: row.lrn,
                classCode,
                subjectName,
                wwScores: scope === 'WW1' ? [row.score, 20, 18] : scope === 'WW2' ? [20, row.score, 18] : [20, 20, 18],
                ptScores: scope === 'PT1' ? [row.score, 25, 25] : scope === 'PT2' ? [25, row.score, 25] : [25, 25, 25],
                stScores: scope === 'ST1' ? [row.score, 25] : scope === 'ST2' ? [25, row.score] : [25, 25],
                termScore: scope === 'TE' ? row.score : 50,
                status: 'valid',
              },
              teacherName
            );
            updatedScoreboards.push(newSB);
          }
        }

        await saveBatchScoreBoards(updatedScoreboards);
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        } catch (e) {}

        onSuccess(updatedScoreboards.length);
      }

      handleReset();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sync scoreboards to database.');
    } finally {
      setIsUploading(false);
    }
  };


  const isSingle = scope !== 'ALL';
  const totalCount = isSingle ? parsedSingleRows.length : parsedRows.length;
  const validCount = isSingle
    ? parsedSingleRows.filter((r) => r.status === 'valid').length
    : parsedRows.filter((r) => r.status === 'valid').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
      <div className="apple-glass rounded-3xl shadow-2xl border border-white/60 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden bg-white/95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#0051A8] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Upload Electronic Grading Sheet</span>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-[#007AFF] border border-blue-200/60">
                  {classCode}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {subjectName} • Upload full e-class records or update a single assessment task.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="apple-tap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition"
              title="Download Excel template matching the current upload scope"
            >
              <Download className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>Download Template (.xlsx)</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scope Selector Bar */}
        <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">Upload Target / Scope:</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as UploadScope);
                handleReset();
              }}
              className="apple-bubble px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
            >
              <option value="ALL">Full Class Record (All Components)</option>
              <optgroup label="Written / Oral Works (WW)">
                <option value="WW1">Written Work 1 (WW1)</option>
                <option value="WW2">Written Work 2 (WW2)</option>
                <option value="WW3">Written Work 3 (WW3)</option>
                <option value="WW4">Written Work 4 (WW4)</option>
                <option value="WW5">Written Work 5 (WW5)</option>
              </optgroup>
              <optgroup label="Performance Tasks (PT)">
                <option value="PT1">Performance Task 1 (PT1)</option>
                <option value="PT2">Performance Task 2 (PT2)</option>
                <option value="PT3">Performance Task 3 (PT3)</option>
              </optgroup>
              <optgroup label="Examinations">
                <option value="ST1">Summative Test 1 (ST1)</option>
                <option value="ST2">Summative Test 2 (ST2)</option>
                <option value="TE">Quarterly / Term Exam (TE)</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {totalCount === 0 ? (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-[#007AFF] bg-blue-50/50 scale-[0.99]'
                    : 'border-slate-300 hover:border-[#007AFF] hover:bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-50 to-indigo-50 text-[#007AFF] flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-inner">
                  {isProcessing ? <RefreshCw className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                </div>

                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  {isSingle
                    ? `Upload Excel for ${scope} only (.xlsx, .csv)`
                    : 'Drag and drop your ASKI-SKI electronic class record (.xlsx, .csv)'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  {isSingle
                    ? `Only updating ${scope} scores for students in ${classCode}. Other task scores will stay unchanged.`
                    : "Columns matched: Learners' Names, WW1-WW3, PT1-PT3, ST1, ST2, and Term Exam (TE)."}
                </p>

                <div className="flex items-center justify-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-blue-50 text-[#007AFF] border border-blue-200/60">
                    {isSingle ? `Target: ${scope}` : 'Full Class Record'}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                    Excel / CSV Format
                  </span>
                </div>
              </div>

              {/* 1-Click quick test option */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                    <Sparkles className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950">
                      {isSingle ? `Quick test with demo batch for ${scope}?` : 'Want to test with the actual learners from the uploaded school sheet?'}
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      Loads scores for Jiro Adriano, Ichiro Agunoy, Calvin Bulanadi, Rio Bustamante, and Ariel Corpuz.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleQuickLoadDemo}
                  className="apple-bubble-primary px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow transition"
                >
                  Load Demo Batch
                </button>
              </div>
            </div>
          ) : (
            /* Parsed rows preview */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#007AFF]" />
                  <span className="font-bold text-slate-900">
                    {selectedFile?.name || 'Class Record Spreadsheet'}
                  </span>
                  <span className="text-slate-500">
                    ({totalCount} learners detected • Scope: {scope === 'ALL' ? 'Full Record' : scope})
                  </span>
                </div>

                <button
                  onClick={handleReset}
                  className="apple-tap px-2.5 py-1 rounded-xl border border-slate-200 text-[11px] hover:bg-slate-100 transition"
                >
                  Change File
                </button>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="max-h-72 overflow-y-auto">
                  {isSingle ? (
                    /* Single Task Table */
                    <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                      <thead className="bg-[#0b3b60] text-white uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-3 py-2.5">Learners' Names</th>
                          <th className="px-3 py-2.5">LRN / ID</th>
                          <th className="px-3 py-2.5 text-center">{scope} Score</th>
                          <th className="px-3 py-2.5">Update Scope</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedSingleRows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-bold text-[#0b3b60]">
                              {r.studentName}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-500">
                              {r.lrn || r.studentNumber || '—'}
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-[#007AFF]">
                              {r.score}
                            </td>
                            <td className="px-3 py-2 text-slate-500 text-[11px]">
                              Update only <span className="font-bold text-slate-800">{scope}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    /* Full Record Table */
                    <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                      <thead className="bg-[#0b3b60] text-white uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-3 py-2.5">Learners' Names</th>
                          <th className="px-3 py-2.5 text-center">WW (20%)</th>
                          <th className="px-3 py-2.5 text-center">PT (50%)</th>
                          <th className="px-3 py-2.5 text-center">ST1 & ST2</th>
                          <th className="px-3 py-2.5 text-center">TE (60)</th>
                          <th className="px-3 py-2.5">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedRows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-bold text-[#0b3b60]">
                              {r.studentName}
                              <span className="block text-[10px] font-normal text-slate-400">{r.studentNumber}</span>
                            </td>
                            <td className="px-3 py-2 text-center font-mono">
                              {r.wwScores.join(', ')} ({r.wwScores.reduce((a, b) => a + b, 0)} pts)
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-emerald-700 font-semibold">
                              {r.ptScores.join(', ')} ({r.ptScores.reduce((a, b) => a + b, 0)} pts)
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-amber-700 font-semibold">
                              {r.stScores.join(', ')}
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-black text-[#0b3b60]">
                              {r.termScore}
                            </td>
                            <td className="px-3 py-2 text-slate-500 text-[11px] truncate max-w-xs">
                              {r.remarks || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 border-t border-slate-200/60">
          <button
            onClick={onClose}
            className="apple-tap px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition"
          >
            Cancel
          </button>

          {totalCount > 0 && (
            <button
              onClick={handleCommitUpload}
              disabled={isUploading || validCount === 0}
              className="apple-bubble-primary inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md shadow-blue-500/25 transition"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Publishing Scoreboards...</span>
                </>
              ) : (
                <>
                  <span>
                    {isSingle
                      ? `Update ${validCount} Learners for ${scope}`
                      : `Commit ${validCount} Learner Scoreboards`}
                  </span>
                  <ArrowRight className="w-4 h-4 text-amber-300" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
