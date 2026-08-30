import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Bookmark, CheckCircle2, AlertCircle, Clock, Timer, RefreshCw, Award, BarChart3, X, Info, BookOpen } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ModalPortal from '../ModalPortal.jsx';

const QuizModal = ({ isOpen, onClose, quiz, sheetName, timeLimit, isTimed, isStudyMode }) => {
    const [view, setView] = useState('quiz'); // 'quiz', 'results'
    const [resultsTab, setResultsTab] = useState('all'); // 'all', 'correct', 'incorrect', 'skipped'
    const [sessionQuestions, setSessionQuestions] = useState([]);
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [questionStatus, setQuestionStatus] = useState({}); // { index: 'attempted' | 'skipped' | 'marked' }
    
    const [timeLeft, setTimeLeft] = useState(timeLimit || 0);
    const [initialTime, setInitialTime] = useState(timeLimit || 0);
    const [startTime, setStartTime] = useState(null);
    const [results, setResults] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null); // { type: 'exit' | 'submit', title, message, onConfirm }
    const timerRef = useRef(null);

    // Prevent accidental reloads
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isOpen && view === 'quiz') {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isOpen, view]);

    // Initialize Quiz
    useEffect(() => {
        if (isOpen && quiz && sheetName) {
            const initialQs = quiz.data[sheetName] || [];
            setSessionQuestions(initialQs);
            resetSession(initialQs);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isOpen, quiz, sheetName]);

    const resetSession = (qs, timeOverride = null) => {
        setView('quiz');
        setCurrentQuestionIndex(0);
        
        // Pre-fill answers in study mode
        if (isStudyMode) {
            const studyAnswers = {};
            qs.forEach((q, idx) => {
                studyAnswers[idx] = q.answer;
            });
            setUserAnswers(studyAnswers);
        } else {
            setUserAnswers({});
        }

        setQuestionStatus({});
        const newLimit = timeOverride !== null ? timeOverride : (timeLimit || 0);
        setTimeLeft(newLimit);
        setInitialTime(newLimit);
        setStartTime(Date.now());
        setResults(null);
        setResultsTab('all');

        if (timerRef.current) clearInterval(timerRef.current);
        if (!isStudyMode) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (isTimed) {
                        if (prev <= 1) {
                            clearInterval(timerRef.current);
                            submitFinal(qs);
                            return 0;
                        }
                        return prev - 1;
                    }
                    return prev + 1; // Count up if not timed
                });
            }, 1000);
        }
    };

    if (!isOpen || !quiz || !sheetName) return null;

    const questions = sessionQuestions;

    const handleSubmit = () => {
        setConfirmModal({
            type: 'submit',
            title: 'Finish & Submit?',
            message: 'Are you sure you want to end your quiz session? You will not be able to change your answers after this.',
            onConfirm: () => {
                setConfirmModal(null);
                submitFinal(questions);
            }
        });
    };

    const submitFinal = (qs) => {
        if (timerRef.current) clearInterval(timerRef.current);
        let score = 0;
        let correct = 0;
        let incorrect = 0;
        let total = qs.length;
        
        const details = qs.map((q, i) => {
            const userAns = userAnswers[i] || '';
            let isCorrect = String(userAns).toLowerCase().trim() === String(q.answer).toLowerCase().trim();
            
            // MSQ order-independent check
            if (q.type === 'msq') {
                const userArr = String(userAns).split(',').map(s => s.trim()).filter(Boolean).sort();
                const correctArr = String(q.answer).split(',').map(s => s.trim()).filter(Boolean).sort();
                isCorrect = userArr.length > 0 && userArr.join(',') === correctArr.join(',');
            }

            // Basic NAT range check if needed
            let finalCorrect = isCorrect;
            if (q.type === 'nat' && q.answer.includes('-')) {
                const [min, max] = q.answer.split('-').map(Number);
                const val = Number(userAns);
                finalCorrect = val >= min && val <= max;
            }

            if (finalCorrect) {
                score += q.score;
                correct++;
            } else if (userAns) {
                incorrect++;
            }
            return { ...q, userAns, isCorrect: finalCorrect };
        });

        setResults({
            score,
            totalScore: qs.reduce((acc, q) => acc + q.score, 0),
            correct,
            incorrect,
            skipped: total - (correct + incorrect),
            total,
            details,
            timeTaken: isTimed ? (initialTime - timeLeft) : timeLeft
        });
        setView('results');
    };

    const handleRetakeFiltered = () => {
        const filteredQs = results.details.filter(q => !q.isCorrect);
        if (filteredQs.length === 0) {
            toast.success("All questions are already correct!");
            return;
        }
        
        // Recalculate time limit for filtered questions if it was per-question
        let newTimeLimit = timeLimit;
        // This is a bit tricky because timeLimit in QuizModal is already the final total seconds.
        // If we want to be smart, we can scale it.
        if (isTimed && timeLimit > 0) {
            const timePerQ = timeLimit / questions.length;
            newTimeLimit = Math.ceil(timePerQ * filteredQs.length);
        }

        setSessionQuestions(filteredQs);
        resetSession(filteredQs, newTimeLimit);
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswerChange = (val) => {
        setUserAnswers({ ...userAnswers, [currentQuestionIndex]: val });
        setQuestionStatus({ ...questionStatus, [currentQuestionIndex]: 'attempted' });
    };

    const toggleMarkForReview = () => {
        const currentStatus = questionStatus[currentQuestionIndex];
        setQuestionStatus({
            ...questionStatus,
            [currentQuestionIndex]: currentStatus === 'marked' ? (userAnswers[currentQuestionIndex] ? 'attempted' : 'not_visited') : 'marked'
        });
    };

    const goToNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            updateStatusOnLeave(currentQuestionIndex);
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const goToPrev = () => { 
        if (currentQuestionIndex > 0) {
            updateStatusOnLeave(currentQuestionIndex);
            setCurrentQuestionIndex(currentQuestionIndex - 1); 
        }
    };

    const updateStatusOnLeave = (index) => {
        if (!userAnswers[index] && questionStatus[index] !== 'marked') {
            setQuestionStatus(prev => ({ ...prev, [index]: 'skipped' }));
        }
    };

    const handleNavigatorClick = (index) => {
        updateStatusOnLeave(currentQuestionIndex);
        setCurrentQuestionIndex(index);
    };

    const handleClose = () => {
        if (view === 'quiz') {
            setConfirmModal({
                type: 'exit',
                title: 'Exit Quiz?',
                message: 'Warning: Leaving now will lose all your progress and current session data. Are you sure you want to exit?',
                onConfirm: () => {
                    setConfirmModal(null);
                    onClose();
                }
            });
            return;
        }
        onClose();
    };

    const renderQuestionInput = () => {
        const q = questions[currentQuestionIndex];
        if (!q) return null;

        if (q.type === 'nat') {
            return (
                <div className="space-y-4 flex flex-col items-center w-full">
                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest">{isStudyMode ? 'Correct Numerical Answer' : 'Type your numerical answer'}</label>
                    <div className="relative w-full max-w-sm">
                        <input 
                            type="text" 
                            value={isStudyMode ? q.answer : (userAnswers[currentQuestionIndex] || '')} 
                            onChange={(e) => !isStudyMode && handleAnswerChange(e.target.value)} 
                            readOnly={isStudyMode}
                            placeholder="0.00" 
                            className={`w-full bg-surface-2 border-2 rounded-2xl px-8 py-5 text-[24px] font-black focus:outline-none transition-all text-center ${isStudyMode ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600' : 'border-slate-200 dark:border-white/10 focus:border-primary text-text'}`} 
                            autoFocus={!isStudyMode}
                        />
                        {isStudyMode && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return q.options.map((opt, i) => {
            const isSelected = q.type === 'msq' 
                ? (userAnswers[currentQuestionIndex] || '').split(',').includes(String(i + 1)) 
                : userAnswers[currentQuestionIndex] === String(i + 1);
            
            // Fix MSQ answer detection
            const isCorrect = q.type === 'msq'
                ? String(q.answer).split(',').map(s => s.trim()).includes(String(i + 1))
                : String(q.answer).trim() === String(i + 1);

            return (
                <button 
                    key={i} 
                    onClick={() => {
                        if (isStudyMode) return;
                        if (q.type === 'msq') {
                            const currentArr = (userAnswers[currentQuestionIndex] || '').split(',').filter(Boolean);
                            const val = String(i + 1);
                            const newArr = currentArr.includes(val) ? currentArr.filter(v => v !== val) : [...currentArr, val];
                            handleAnswerChange(newArr.join(','));
                        } else handleAnswerChange(String(i + 1));
                    }} 
                    className={`w-full flex items-center gap-6 p-5 rounded-2xl border-2 transition-all text-left group ${
                        isStudyMode 
                        ? (isCorrect 
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-sm' 
                            : 'bg-surface-2 border-slate-200 dark:border-white/5 text-text-muted opacity-50 cursor-default')
                        : (isSelected ? 'bg-primary/5 border-primary text-primary shadow-sm' : 'bg-surface-2 border-slate-200 dark:border-white/10 hover:border-primary/40 text-text')
                    }`}
                >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-black border-2 shrink-0 transition-colors ${
                        isStudyMode 
                        ? (isCorrect 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-slate-200 dark:border-white/5 text-text-muted bg-surface-3')
                        : (isSelected ? 'bg-primary border-primary text-white' : 'border-slate-200 dark:border-white/10 text-text-muted bg-surface-3')
                    }`}>{String.fromCharCode(65 + i)}</div>
                    <span className="text-[16px] font-medium">{opt}</span>
                    {isStudyMode && isCorrect && (
                        <div className="ml-auto px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg uppercase tracking-widest">Correct</div>
                    )}
                </button>
            );
        });
    };

    // Stats for Navigator
    const stats = {
        attempted: Object.values(questionStatus).filter(s => s === 'attempted').length,
        marked: Object.values(questionStatus).filter(s => s === 'marked').length,
        skipped: Object.values(questionStatus).filter(s => s === 'skipped').length,
        notVisited: questions.length - Object.keys(questionStatus).length
    };

    const filteredDetails = results?.details.filter(q => {
        if (resultsTab === 'all') return true;
        if (resultsTab === 'correct') return q.isCorrect;
        if (resultsTab === 'incorrect') return !q.isCorrect && q.userAns !== '';
        if (resultsTab === 'skipped') return q.userAns === '';
        return true;
    }) || [];

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[60] flex flex-col bg-surface overflow-hidden animate-in fade-in duration-300">
                <div className="relative w-full h-full bg-surface flex flex-col overflow-hidden">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-surface-2/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 shrink-0 sticky top-0 z-[100]">
                        <div className="flex items-center gap-6">
                            <button 
                                onClick={handleClose} 
                                className="p-2.5 hover:bg-surface-3 rounded-xl text-text-muted hover:text-red-400 transition-all border border-transparent hover:border-slate-400 dark:hover:border-white/20"
                                title="Exit Quiz"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-black text-text leading-tight tracking-tight">{quiz.name}</h3>
                                    <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">{sheetName}</span>
                                </div>
                            </div>
                        </div>

                        {/* Middle: Stats / Info */}
                        {view === 'quiz' && (
                            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
                                <div className="px-4 py-1.5 rounded-2xl bg-surface-3/50 border border-border/50 backdrop-blur-sm flex items-center gap-3 shadow-sm">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        <span className="text-[11px] font-black text-text uppercase tracking-widest">{questions[currentQuestionIndex]?.type}</span>
                                    </div>
                                    <div className="w-[1px] h-3 bg-border" />
                                    <div className="flex items-center gap-1.5">
                                        <Award className="w-3 h-3 text-amber-500" />
                                        <span className="text-[11px] font-black text-text-muted uppercase tracking-widest">{questions[currentQuestionIndex]?.score} Marks</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {view === 'quiz' && !isStudyMode && (
                            <div className="flex items-center gap-8">
                                <div className={`flex items-center gap-3 text-[18px] font-mono font-bold ${isTimed && timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-text'}`}>
                                    <Timer className="w-6 h-6 text-primary" /> {formatTime(timeLeft)}
                                </div>
                                <button onClick={handleSubmit} className="btn-primary px-8 py-3 rounded-xl text-[13px] font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Finish & Submit</button>
                            </div>
                        )}
                        {view === 'results' && (
                            <div className="flex items-center gap-3">
                                <button onClick={handleRetakeFiltered} className="px-6 py-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[12px] font-bold hover:bg-amber-500 hover:text-white transition-all flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4" /> Retake Errors & Skipped
                                </button>
                                <button onClick={onClose} className="btn-primary px-6 py-2.5 rounded-xl flex items-center gap-2 text-[12px] font-bold">
                                    <X className="w-4 h-4" /> Close session
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 overflow-hidden flex flex-col bg-surface">
                        {view === 'quiz' && (
                            <div className="flex flex-1 overflow-hidden">
                                <div className="flex-1 overflow-hidden">
                                    <div className={`h-full flex ${questions[currentQuestionIndex]?.paragraph ? 'flex-row' : 'flex-col items-center'} overflow-hidden`}>
                                        {questions[currentQuestionIndex]?.paragraph ? (
                                            <>
                                                {/* Left Side: Paragraph */}
                                                <div className="w-1/2 border-r border-slate-200 dark:border-white/10 bg-surface-2/30 overflow-y-auto p-12 custom-scrollbar relative">
                                                    <div className="max-w-2xl ml-auto">
                                                        <div className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                            <div className="w-8 h-[2px] bg-primary" /> Reference Passage
                                                        </div>
                                                        <div className="text-[17px] leading-[1.8] text-text font-medium italic whitespace-pre-wrap">
                                                            {questions[currentQuestionIndex].paragraph}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Right Side: Question & Options */}
                                                <div className="w-1/2 overflow-y-auto p-12 custom-scrollbar">
                                                    <div className="max-w-2xl mr-auto space-y-10 pb-20">
                                                        <div className="text-[22px] font-bold text-text leading-tight">
                                                            {questions[currentQuestionIndex]?.question}
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-4">
                                                            {renderQuestionInput()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            /* Standard Centered Layout */
                                            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar w-full">
                                                <div className="max-w-3xl mx-auto space-y-10 pb-20">
                                                    <div className="text-[24px] font-bold text-text leading-tight text-center">
                                                        {questions[currentQuestionIndex]?.question}
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {renderQuestionInput()}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="w-80 bg-surface-2 border-l border-slate-200 dark:border-white/10 flex flex-col shrink-0">
                                    <div className="p-6 border-b border-slate-200 dark:border-white/10 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[13px] font-black text-text uppercase tracking-wider">Navigator</h4>
                                            <span className="px-2 py-1 bg-primary/10 text-primary rounded text-[10px] font-black">{questions.length} TOTAL</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-3 rounded-xl bg-surface border border-slate-200 dark:border-white/10 flex flex-col items-center shadow-sm">
                                                <span className="text-[16px] font-black text-emerald-500">{stats.attempted}</span>
                                                <span className="text-[9px] font-bold text-text-muted uppercase">Answered</span>
                                            </div>
                                            <div className="p-3 rounded-xl bg-surface border border-slate-200 dark:border-white/10 flex flex-col items-center shadow-sm">
                                                <span className="text-[16px] font-black text-red-400">{stats.skipped}</span>
                                                <span className="text-[9px] font-bold text-text-muted uppercase">Skipped</span>
                                            </div>
                                            <div className="p-3 rounded-xl bg-surface border border-slate-200 dark:border-white/10 flex flex-col items-center shadow-sm">
                                                <span className="text-[16px] font-black text-amber-500">{stats.marked}</span>
                                                <span className="text-[9px] font-bold text-text-muted uppercase">Marked</span>
                                            </div>
                                            <div className="p-3 rounded-xl bg-surface border border-slate-200 dark:border-white/10 flex flex-col items-center shadow-sm">
                                                <span className="text-[16px] font-black text-text-muted">{stats.notVisited}</span>
                                                <span className="text-[9px] font-bold text-text-muted uppercase">Pending</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-3 max-h-[350px] overflow-y-auto custom-scrollbar px-1 py-2">
                                            {questions.map((_, i) => {
                                                const status = questionStatus[i];
                                                const isActive = i === currentQuestionIndex;
                                                
                                                let stateClass = 'bg-surface border border-slate-200 dark:border-white/10 text-text-muted';
                                                if (status === 'attempted') stateClass = 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
                                                else if (status === 'marked') stateClass = 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400';
                                                else if (status === 'skipped') stateClass = 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400';
                                                
                                                return (
                                                    <button 
                                                        key={i} 
                                                        onClick={() => handleNavigatorClick(i)} 
                                                        className={`aspect-square rounded-xl border-2 text-[13px] font-bold transition-all flex items-center justify-center relative ${stateClass} ${isActive ? 'border-text ring-2 ring-text/10 z-10' : 'hover:bg-surface-3'}`}
                                                    >
                                                        {i + 1}
                                                        {isActive && <div className="absolute top-1 right-1 w-2 h-2 bg-text rounded-full border-2 border-surface-2 shadow-sm" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 flex-1 flex flex-col justify-end space-y-3 bg-surface-2/20">
                                        {!isStudyMode && (
                                            <button onClick={toggleMarkForReview} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-amber-500/30 text-amber-500 text-[12px] font-black hover:bg-amber-500/10 transition-all uppercase tracking-widest"><Bookmark className="w-4 h-4" /> {questionStatus[currentQuestionIndex] === 'marked' ? 'Unmark Review' : 'Mark for Review'}</button>
                                        )}
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={goToPrev} disabled={currentQuestionIndex === 0} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface border border-slate-200 dark:border-white/10 text-text-muted text-[12px] font-black hover:bg-surface-3 disabled:opacity-30 transition-all uppercase tracking-widest"><ChevronLeft className="w-4 h-4" /> Prev</button>
                                            <button onClick={goToNext} disabled={currentQuestionIndex === questions.length - 1} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-[12px] font-black hover:shadow-lg hover:shadow-primary/20 disabled:opacity-30 transition-all uppercase tracking-widest">Next <ChevronRight className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {view === 'results' && results && (
                            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                                <div className="max-w-5xl mx-auto space-y-10 pb-20">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-white/10 flex flex-col items-center text-center bg-surface-2 shadow-sm">
                                            <Award className="w-12 h-12 text-primary mb-4" />
                                            <span className="text-[11px] font-black text-text-muted uppercase tracking-widest">Your Score</span>
                                            <div className="text-5xl font-black text-text mt-1">{results.score} / {results.totalScore}</div>
                                            <div className="w-full bg-surface-3 h-2.5 rounded-full mt-6 overflow-hidden border border-slate-200/50 dark:border-white/5">
                                                <div className="bg-primary h-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.3)]" style={{ width: `${(results.score / results.totalScore) * 100}%` }} />
                                            </div>
                                        </div>
                                        <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-white/10 flex flex-col items-center text-center bg-surface-2 shadow-sm">
                                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                                            <span className="text-[11px] font-black text-text-muted uppercase tracking-widest">Correct</span>
                                            <div className="text-5xl font-black text-emerald-500 mt-1">{results.correct}</div>
                                        </div>
                                        <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-white/10 flex flex-col items-center text-center bg-surface-2 shadow-sm">
                                            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                                            <span className="text-[11px] font-black text-text-muted uppercase tracking-widest">Incorrect</span>
                                            <div className="text-5xl font-black text-red-500 mt-1">{results.incorrect}</div>
                                        </div>
                                        <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-white/10 flex flex-col items-center text-center bg-surface-2 shadow-sm">
                                            <Clock className="w-12 h-12 text-amber-500 mb-4" />
                                            <span className="text-[11px] font-black text-text-muted uppercase tracking-widest">Time Taken</span>
                                            <div className="text-5xl font-black text-text mt-1">{formatTime(results.timeTaken)}</div>
                                        </div>
                                    </div>

                                    <div className="glass-panel rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden bg-surface-2 shadow-sm">
                                        <div className="px-10 py-8 border-b border-slate-200 dark:border-white/10 bg-surface-3 flex flex-col gap-6">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xl font-black text-text flex items-center gap-3">
                                                    <BarChart3 className="w-6 h-6 text-primary" /> Question Review
                                                </h3>
                                                <div className="flex items-center gap-6 text-[11px] font-black uppercase tracking-wider">
                                                    <span className="flex items-center gap-2 text-emerald-500"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Correct</span>
                                                    <span className="flex items-center gap-2 text-red-500"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> Incorrect</span>
                                                    <span className="flex items-center gap-2 text-text-muted"><div className="w-2.5 h-2.5 rounded-full bg-text-muted opacity-30" /> Skipped</span>
                                                </div>
                                            </div>

                                            {/* Tabs */}
                                            <div className="flex items-center gap-2 p-1 bg-surface-2 border border-slate-200 dark:border-white/5 rounded-2xl w-fit">
                                                {[
                                                    { id: 'all', label: 'All Questions', count: results.total },
                                                    { id: 'correct', label: 'Correct', count: results.correct },
                                                    { id: 'incorrect', label: 'Incorrect', count: results.incorrect },
                                                    { id: 'skipped', label: 'Skipped', count: results.skipped }
                                                ].map(tab => (
                                                    <button
                                                        key={tab.id}
                                                        onClick={() => setResultsTab(tab.id)}
                                                        className={`px-5 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center gap-2 ${
                                                            resultsTab === tab.id 
                                                            ? 'bg-primary text-white shadow-md shadow-primary/20' 
                                                            : 'text-text-muted hover:text-text hover:bg-surface-3'
                                                        }`}
                                                    >
                                                        {tab.label}
                                                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${resultsTab === tab.id ? 'bg-white/20 text-white' : 'bg-surface-3 text-text-muted'}`}>
                                                            {tab.count}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="divide-y divide-slate-200 dark:divide-white/10 min-h-[300px]">
                                            {filteredDetails.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20 text-text-muted">
                                                    <Info className="w-10 h-10 opacity-20 mb-4" />
                                                    <p className="text-[14px] font-medium">No questions found in this category</p>
                                                </div>
                                            ) : (
                                                filteredDetails.map((q, i) => (
                                                    <div key={i} className="p-10 hover:bg-slate-50/30 dark:hover:bg-surface-2/30 transition-all animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="flex items-start gap-8">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[18px] font-black shrink-0 ${
                                                                q.userAns === '' ? 'bg-slate-100 text-text-muted opacity-40' : (q.isCorrect ? 'bg-emerald-500 text-white shadow-md' : 'bg-red-500 text-white shadow-md')
                                                            }`}>
                                                                {results.details.indexOf(q) + 1}
                                                            </div>
                                                            <div className="flex-1 space-y-6">
                                                                {q.paragraph && (
                                                                    <div className="p-6 bg-surface-2 border border-slate-200 dark:border-white/10 rounded-2xl text-[13px] leading-relaxed text-text-muted italic shadow-sm">
                                                                        {q.paragraph}
                                                                    </div>
                                                                )}
                                                                <div className="text-[18px] text-text font-bold leading-tight">{q.question}</div>
                                                                <div className="grid grid-cols-2 gap-6">
                                                                    <div className="p-5 rounded-2xl bg-surface-3 border border-slate-200 dark:border-white/10">
                                                                        <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Your Answer</div>
                                                                        <div className={`text-[15px] font-bold ${q.isCorrect ? 'text-emerald-500' : (q.userAns ? 'text-red-500' : 'text-text-muted')}`}>
                                                                            {q.userAns || 'Not Answered'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-5 rounded-2xl bg-surface-3 border border-slate-200 dark:border-white/10">
                                                                        <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Correct Answer</div>
                                                                        <div className="text-[15px] font-bold text-emerald-500">{q.answer}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Custom Confirmation Modal */}
                {confirmModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setConfirmModal(null)} />
                        <div className="relative w-full max-w-md bg-surface-2 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${confirmModal.type === 'exit' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                                {confirmModal.type === 'exit' ? <AlertCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                            </div>
                            <h3 className="text-xl font-bold text-text mb-2">{confirmModal.title}</h3>
                            <p className="text-text-muted text-[14px] leading-relaxed mb-8">{confirmModal.message}</p>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setConfirmModal(null)}
                                    className="flex-1 py-3.5 rounded-2xl bg-surface-3 border border-slate-200 dark:border-white/5 text-text text-[13px] font-bold hover:bg-surface-2 transition-all"
                                >
                                    Go Back
                                </button>
                                <button 
                                    onClick={confirmModal.onConfirm}
                                    className={`flex-1 py-3.5 rounded-2xl text-white text-[13px] font-bold shadow-lg transition-all active:scale-[0.98] ${
                                        confirmModal.type === 'exit' ? 'bg-red-500 shadow-red-500/20' : 'bg-primary shadow-primary/20'
                                    }`}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ModalPortal>
    );
};

export default QuizModal;
