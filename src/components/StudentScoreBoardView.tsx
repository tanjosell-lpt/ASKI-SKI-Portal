import React, { useRef, useState, useMemo } from 'react';
import { StudentScoreBoard, ClassSubject, calculateScoreBoardTotals } from '../types';
import { useAuth } from '../context/AuthContext';
import { AskiLogo } from './AskiLogo';
import { Printer, Clock, FileText, Camera, BookOpen } from 'lucide-react';

interface StudentScoreBoardViewProps {
  scoreBoards: StudentScoreBoard[];
  classes: ClassSubject[];
}

export const StudentScoreBoardView: React.FC<StudentScoreBoardViewProps> = ({ 
  scoreBoards,
  classes 
}) => {
  const { currentUser, updateUserAvatar } = useAuth();
  const printAreaRef = useRef<HTMLDivElement>(null);
  const studentPhotoRef = useRef<HTMLInputElement>(null);

  // Filter student-specific scoreboards
  const myScoreBoards = useMemo(() => {
    if (!currentUser) return [];
    return scoreBoards.filter((sb) => {
      const matchId = sb.studentId === currentUser.id;
      const matchEmail = sb.studentEmail && sb.studentEmail.toLowerCase() === currentUser.email?.toLowerCase();
      const matchStuNum = currentUser.studentNumber && sb.studentNumber === currentUser.studentNumber;
      const matchLastName = currentUser.classCode && sb.classCode === currentUser.classCode &&
        sb.studentName.toLowerCase().includes((currentUser.lastName || '').toLowerCase());
      return matchId || matchEmail || matchStuNum || matchLastName;
    });
  }, [scoreBoards, currentUser]);

  // Combine available subjects from registered classes and any existing scoreboards
  const availableSubjects = useMemo(() => {
    const list: { subjectName: string; classCode: string; section?: string }[] = [];
    const seen = new Set<string>();

    // Add from classes first
    classes.forEach((c) => {
      const key = `${c.subjectName}__${c.classCode}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ subjectName: c.subjectName, classCode: c.classCode, section: c.section });
      }
    });

    // Add any others from scoreboards
    myScoreBoards.forEach((sb) => {
      const key = `${sb.subjectName}__${sb.classCode}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ subjectName: sb.subjectName, classCode: sb.classCode, section: sb.section });
      }
    });

    return list;
  }, [classes, myScoreBoards]);

  // Selected subject state
  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string>(
    availableSubjects[0] ? `${availableSubjects[0].subjectName}__${availableSubjects[0].classCode}` : 'Mathematics 10__SKI-10A'
  );

  const activeSubjectInfo = availableSubjects.find(
    (s) => `${s.subjectName}__${s.classCode}` === selectedSubjectKey
  ) || availableSubjects[0] || { subjectName: 'Mathematics 10', classCode: 'SKI-10A', section: 'Grade 10' };

  // Current active scoreboard for selected subject
  const currentScoreBoard = useMemo(() => {
    // 1. Try finding one matching exact subject & classCode
    const found = myScoreBoards.find(
      (sb) => sb.subjectName.toLowerCase() === activeSubjectInfo.subjectName.toLowerCase()
    );
    if (found) return found;

    // 2. If student has only 1 scoreboard and it's the default, use it as template
    if (myScoreBoards.length > 0) {
      return myScoreBoards[0];
    }
    return scoreBoards[0] || null;
  }, [myScoreBoards, activeSubjectInfo, scoreBoards]);

  const handleStudentPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      const reader = new FileReader();
      reader.onload = () => {
        updateUserAvatar(currentUser.id, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // If student registration is still pending approval
  if (currentUser?.status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white border border-amber-200 rounded-3xl p-8 sm:p-12 text-center shadow-lg shadow-amber-950/5 space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border-2 border-amber-200">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Registration Pending Admin Approval
            </span>
            <h1 className="text-2xl font-black text-[#0b3b60] mt-3">
              Kumusta, {currentUser.displayName}!
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
              Your registration for Class Code <strong className="text-[#0b3b60] font-mono">{currentUser.classCode || 'SKI-10A'}</strong> has been received by ASKI-SKI and is awaiting Administrator verification.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-left max-w-sm mx-auto space-y-1.5 text-slate-600">
            <div>• <strong className="text-slate-800">Learner Name:</strong> {currentUser.displayName}</div>
            {currentUser.lrn && (
              <div>• <strong className="text-slate-800">LRN:</strong> <span className="font-mono font-bold text-[#0b3b60]">{currentUser.lrn}</span></div>
            )}
            <div>• <strong className="text-slate-800">Email:</strong> {currentUser.email}</div>
            <div>• <strong className="text-slate-800">Class Code:</strong> {currentUser.classCode || 'SKI-10A'}</div>
            <div>• <strong className="text-slate-800">Status:</strong> <span className="text-amber-600 font-bold">Pending Administrator Approval</span></div>
          </div>

          <p className="text-[11px] text-slate-400">
            Once an administrator accepts your request, your live score board will be immediately accessible here.
          </p>
        </div>
      </div>
    );
  }

  const studentDisplayName = currentUser?.displayName || currentScoreBoard?.studentName || 'Learner';
  const studentLrn = currentUser?.lrn || currentScoreBoard?.lrn || '102938475601';
  const totals = currentScoreBoard ? calculateScoreBoardTotals(currentScoreBoard) : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar (hidden when printing) - Photo, Student Name, Subject Tabs, and Print button */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Student Circle Photo with Upload ability */}
            <div className="relative group">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-amber-400 bg-white/10 shrink-0 shadow-md flex items-center justify-center">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={studentDisplayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-black text-xl text-[#0b3b60]">
                    {studentDisplayName.charAt(0)}
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                ref={studentPhotoRef}
                onChange={handleStudentPhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => studentPhotoRef.current?.click()}
                className="absolute bottom-0 right-0 p-1 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs border border-white transition hover:scale-110"
                title="Upload / Change Photo"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 mt-0.5">
                <h1 className="text-xl sm:text-2xl font-black text-[#0b3b60]">
                  {studentDisplayName}
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0b3b60] border border-blue-200">
                  LRN: {studentLrn}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Class Code: <span className="font-mono font-bold text-[#0b3b60]">{currentUser?.classCode || activeSubjectInfo.classCode}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b3b60] hover:bg-[#092c4c] text-white text-xs font-bold shadow-md shadow-blue-950/20 transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Score Board</span>
          </button>
        </div>

        {/* iOS-style Subject Selection Segmented Control */}
        <div className="pt-3 border-t border-slate-100">
          <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center gap-1 backdrop-blur-xl border border-black/[0.04] overflow-x-auto">
            {availableSubjects.map((subj) => {
              const key = `${subj.subjectName}__${subj.classCode}`;
              const isSelected = key === selectedSubjectKey;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedSubjectKey(key)}
                  className={`apple-tap px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-2 ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{subj.subjectName}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-slate-100 text-[#007AFF]' : 'bg-slate-200/80 text-slate-500'
                  }`}>
                    {subj.classCode}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Official Score Board Document (Written Works 20%, Performance Tasks 50%, Examinations 30%) */}
      {!currentScoreBoard ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0b3b60] flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#0b3b60]">
            Scores Not Yet Posted for {activeSubjectInfo.subjectName}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your teacher has not uploaded the score record for {activeSubjectInfo.subjectName} ({activeSubjectInfo.classCode}) yet. Please check back shortly.
          </p>
        </div>
      ) : (
        <div 
          ref={printAreaRef}
          className="bg-white text-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-md space-y-6 font-sans print:p-0 print:border-none print:shadow-none"
        >
          {/* Institutional Header with Official School Logo */}
          <div className="border-b-2 border-[#0b3b60] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <AskiLogo size="lg" showText={false} />
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-[#0b3b60] uppercase">
                  ASKI SKILLS AND KNOWLEDGE INSTITUTE, INC.
                </h2>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                  Transformation • Discipline • Excellence
                </p>
                <p className="text-[11px] text-slate-500 font-serif">
                  Talavera, Nueva Ecija • Quarterly Score Sheet
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs">
              <div className="text-slate-400 uppercase text-[10px] font-bold tracking-wider">Academic Assessment</div>
              <div className="font-bold text-[#0b3b60] text-sm">Official Score Board</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Subject: <strong className="text-slate-800">{activeSubjectInfo.subjectName}</strong>
              </div>
            </div>
          </div>

          {/* Learner & Class Metadata Strip including Circle Photo & LRN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-400 bg-white shrink-0 shadow-xs">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt={studentDisplayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#0b3b60] text-amber-300 flex items-center justify-center font-bold text-xs">
                    {studentDisplayName.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Learner's Name</span>
                <span className="text-sm font-black text-[#0b3b60] block uppercase tracking-wide">
                  {studentDisplayName}
                </span>
                <span className="text-[10px] font-mono font-semibold text-slate-500 block">
                  LRN: {studentLrn}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Subject / Course</span>
              <span className="text-xs font-bold text-slate-800 block mt-0.5">
                {activeSubjectInfo.subjectName}
              </span>
              <span className="text-[10px] text-slate-500 block">
                Quarter 1 Record
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Section & Code</span>
              <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                {activeSubjectInfo.section || currentScoreBoard.section || 'Grade 10'} • <span className="font-mono font-bold text-[#0b3b60]">{activeSubjectInfo.classCode}</span>
              </span>
              <span className="text-[10px] text-slate-500 block">
                Regular Academic Track
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Subject Teacher</span>
              <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                {currentScoreBoard.teacherName || 'Prof. Tanjosell'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                Faculty Instructor
              </span>
            </div>
          </div>

          {/* Detailed Score Tables (WW 20%, PT 50%, Exams 30%) */}
          {totals && (
            <div className="space-y-6">
              {/* Component 1: Written/Oral Works (20%) - 2 to 5 items */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-[#0b3b60] text-white px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold uppercase tracking-wider">
                  <span>Written / Oral Works (20%)</span>
                  <span className="text-amber-300 font-mono text-[11px] sm:text-xs">
                    Total Score: {totals.wwTotal} / {totals.wwMax} ({totals.wwPct}%)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5 whitespace-nowrap">Task #</th>
                        <th className="px-4 py-2.5 whitespace-nowrap">Description</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Score Obtained</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Highest Possible Score</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">% Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {currentScoreBoard.writtenWorks.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="px-4 py-2 font-mono font-bold text-[#0b3b60] whitespace-nowrap">WW {idx + 1}</td>
                          <td className="px-4 py-2 text-slate-800 font-medium whitespace-nowrap">{item.title}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{item.score}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{item.maxScore}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-700 font-semibold whitespace-nowrap">
                            {Math.round((item.score / Math.max(item.maxScore, 1)) * 100)}%
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/80 font-bold">
                        <td colSpan={2} className="px-4 py-2 text-slate-700 uppercase text-[10px] whitespace-nowrap">Total Written / Oral Works</td>
                        <td className="px-4 py-2 text-right font-mono text-[#0b3b60] whitespace-nowrap">{totals.wwTotal}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-600 whitespace-nowrap">{totals.wwMax}</td>
                        <td className="px-4 py-2 text-right font-mono text-[#0b3b60] whitespace-nowrap">{totals.wwPct}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Component 2: Product / Performance Tasks (50%) - Required 3 items */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-[#15803d] text-white px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold uppercase tracking-wider">
                  <span>Product / Performance Tasks (50%)</span>
                  <span className="text-emerald-200 font-mono text-[11px] sm:text-xs">
                    Total Score: {totals.ptTotal} / {totals.ptMax} ({totals.ptPct}%)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5 whitespace-nowrap">Task #</th>
                        <th className="px-4 py-2.5 whitespace-nowrap">Description</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Score Obtained</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Highest Possible Score</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">% Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {currentScoreBoard.performanceTasks.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="px-4 py-2 font-mono font-bold text-emerald-700 whitespace-nowrap">PT {idx + 1}</td>
                          <td className="px-4 py-2 text-slate-800 font-medium whitespace-nowrap">{item.title}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{item.score}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{item.maxScore}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-700 font-semibold whitespace-nowrap">
                            {Math.round((item.score / Math.max(item.maxScore, 1)) * 100)}%
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/80 font-bold">
                        <td colSpan={2} className="px-4 py-2 text-slate-700 uppercase text-[10px] whitespace-nowrap">Total Performance Tasks</td>
                        <td className="px-4 py-2 text-right font-mono text-emerald-800 whitespace-nowrap">{totals.ptTotal}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-600 whitespace-nowrap">{totals.ptMax}</td>
                        <td className="px-4 py-2 text-right font-mono text-emerald-800 whitespace-nowrap">{totals.ptPct}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Component 3: Examination (30%) - 2 Summative Tests + 1 Term Examination */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-[#b45309] text-white px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold uppercase tracking-wider">
                  <span>Examinations (30%) • 2 Summative Tests + 1 Term Examination</span>
                  <span className="text-amber-200 font-mono text-[11px] sm:text-xs">
                    Total Score: {totals.examTotal} / {totals.examMax} ({totals.examPct}%)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5 whitespace-nowrap">Category</th>
                        <th className="px-4 py-2.5 whitespace-nowrap">Description</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Score Obtained</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Highest Possible Score</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">% Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {currentScoreBoard.summativeTests.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="px-4 py-2 font-mono font-bold text-amber-700 whitespace-nowrap">ST{idx + 1}</td>
                          <td className="px-4 py-2 text-slate-800 font-medium whitespace-nowrap">{item.title}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{item.score}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{item.maxScore}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-700 font-semibold whitespace-nowrap">
                            {Math.round((item.score / Math.max(item.maxScore, 1)) * 100)}%
                          </td>
                        </tr>
                      ))}
                      {/* 1 Term Examination */}
                      <tr className="bg-amber-50/40">
                        <td className="px-4 py-2.5 font-mono font-black text-[#0b3b60] whitespace-nowrap">TE</td>
                        <td className="px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                          {currentScoreBoard.termExam?.title || 'Quarterly Term Examination'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                          {currentScoreBoard.termExam?.score || 0}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-600 whitespace-nowrap">
                          {currentScoreBoard.termExam?.maxScore || 60}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-black text-[#0b3b60] whitespace-nowrap">
                          {Math.round(((currentScoreBoard.termExam?.score || 0) / Math.max(currentScoreBoard.termExam?.maxScore || 60, 1)) * 100)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
