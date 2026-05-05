import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileSpreadsheet, Play, Trash2, Edit2, ChevronLeft, ChevronRight, Bookmark, CheckCircle2, Circle, AlertCircle, Clock, Info, Check, X, Search, LayoutGrid, List, BarChart3, Timer, RefreshCw, Award, PieChart, BookOpen } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import ModalPortal from '../ModalPortal.jsx';
import QuizModal from '../modals/QuizModal.jsx';
import { quizSetsApi } from '../../api';

const QuizGeneratorTool = () => {
    const [view, setView] = useState('list'); // 'list', 'sheets', 'quiz', 'results'
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null); // id
    const [sheetToDelete, setSheetToDelete] = useState(null); // sheetName
    const [renameModal, setRenameModal] = useState(null); // { type, id, name, oldName }
    const [sheetToEdit, setSheetToEdit] = useState(null); // sheetName
    
    // Config
    const [quizConfig, setQuizConfig] = useState(() => {
        const saved = localStorage.getItem('quiz_generator_config');
        return saved ? JSON.parse(saved) : { 
            mode: 'none', 
            timeLimit: 30, 
            perQsSeconds: 120,
            shuffleQs: false,
            shuffleOptions: false
        };
    }); 

    useEffect(() => {
        localStorage.setItem('quiz_generator_config', JSON.stringify(quizConfig));
    }, [quizConfig]);

    const [pendingStart, setPendingStart] = useState(null); // { sheetName, qsCount }
    const [activeQuizSession, setActiveQuizSession] = useState(null); // { quiz, sheetName, timeLimit, isTimed }

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        setLoading(true);
        try {
            const data = await quizSetsApi.list();
            setQuizzes(data);
        } catch (err) {
            console.error("Failed to fetch quizzes:", err);
            toast.error("Failed to fetch quizzes");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const loadingToast = toast.loading("Parsing Excel file...");
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const sheetsData = {};
                
                wb.SheetNames.forEach(sheetName => {
                    const ws = wb.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
                    if (rows.length < 2) return;

                    const headerRow = rows[0];
                    const findIdx = (names) => headerRow.findIndex(h => 
                        names.some(name => String(h || '').toLowerCase().trim() === name.toLowerCase())
                    );

                    const idxs = {
                        type: findIdx(['type']),
                        paragraph: findIdx(['paragraph', 'para']),
                        q: findIdx(['q', 'question', 'qs']),
                        opt1: findIdx(['1', 'option1', 'a']),
                        opt2: findIdx(['2', 'option2', 'b']),
                        opt3: findIdx(['3', 'option3', 'c']),
                        opt4: findIdx(['4', 'option4', 'd']),
                        ans: findIdx(['a', 'answer', 'ans']),
                        score: findIdx(['score', 'marks'])
                    };

                    if (idxs.q === -1 && idxs.paragraph === -1) return;

                    const parsedSheet = rows.slice(1).map((row, rIdx) => {
                        const val = (idx) => idx !== -1 ? String(row[idx] || '').trim() : '';
                        const type = val(idxs.type).toLowerCase() || 'mcq';
                        const paragraph = val(idxs.paragraph) || null;
                        const question = val(idxs.q);
                        const options = [val(idxs.opt1), val(idxs.opt2), val(idxs.opt3), val(idxs.opt4)].filter(Boolean);
                        let answer = val(idxs.ans);
                        
                        // Normalize MSQ answers: remove spaces between commas
                        if (type === 'msq' && answer.includes(',')) {
                            answer = answer.split(',').map(s => s.trim()).filter(Boolean).join(',');
                        }

                        const score = Number(val(idxs.score)) || 1;
                        if (!question && !paragraph) return null;
                        return { id: rIdx, type, paragraph, question, options, answer, score };
                    }).filter(Boolean);

                    if (parsedSheet.length > 0) sheetsData[sheetName] = parsedSheet;
                });

                if (Object.keys(sheetsData).length === 0) throw new Error("No valid question data found.");

                const quizName = file.name.replace(/\.[^/.]+$/, "");
                await quizSetsApi.create({ name: quizName, data: sheetsData });
                toast.success("Quiz saved to database!", { id: loadingToast });
                fetchQuizzes();
            } catch (err) {
                toast.error(err.message || "Failed to process Excel file", { id: loadingToast });
            }
        };
        reader.readAsBinaryString(file);
    };

    const openQuizSheets = async (quizId) => {
        setLoading(true);
        try {
            const quiz = await quizSetsApi.getById(quizId);
            const data = typeof quiz.data === 'string' ? JSON.parse(quiz.data) : quiz.data;
            setActiveQuiz({ ...quiz, data });
            setView('sheets');
        } catch (err) {
            toast.error("Failed to load quiz sheets");
        } finally {
            setLoading(false);
        }
    };

    const filteredQuizzes = quizzes.filter(q => q.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const deleteQuiz = async (id) => {
        setDeleteConfirm(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;
        setLoading(true);
        try {
            await quizSetsApi.delete(deleteConfirm);
            toast.success("Quiz deleted successfully");
            fetchQuizzes();
        } catch (err) {
            toast.error("Failed to delete quiz");
        } finally {
            setLoading(false);
            setDeleteConfirm(null);
        }
    };

    const handleRename = async () => {
        if (!renameModal || !renameModal.name.trim()) return;
        setLoading(true);
        try {
            if (renameModal.type === 'quiz') {
                await quizSetsApi.update(renameModal.id, { name: renameModal.name });
                toast.success("Quiz renamed");
                fetchQuizzes();
            } else {
                // Renaming a sheet inside the JSON data
                const updatedData = { ...activeQuiz.data };
                const sheetData = updatedData[renameModal.oldName];
                delete updatedData[renameModal.oldName];
                updatedData[renameModal.name] = sheetData;
                
                await quizSetsApi.update(activeQuiz.id, { data: updatedData });
                setActiveQuiz({ ...activeQuiz, data: updatedData });
                toast.success("Sheet renamed");
            }
            setRenameModal(null);
        } catch (err) {
            toast.error("Failed to rename");
        } finally {
            setLoading(false);
        }
    };

    const confirmDeleteSheet = async () => {
        if (!sheetToDelete) return;
        setLoading(true);
        try {
            const updatedData = { ...activeQuiz.data };
            delete updatedData[sheetToDelete];
            await quizSetsApi.update(activeQuiz.id, { data: updatedData });
            setActiveQuiz({ ...activeQuiz, data: updatedData });
            toast.success("Sheet deleted");
        } catch (err) {
            toast.error("Failed to delete sheet");
        } finally {
            setLoading(false);
            setSheetToDelete(null);
        }
    };

    const shuffleArray = (array) => {
        const newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    };

    const startSession = (isStudy = false) => {
        let finalLimit = 0;
        if (quizConfig.mode === 'total') finalLimit = quizConfig.timeLimit * 60;
        else if (quizConfig.mode === 'perQs') finalLimit = pendingStart.qsCount * quizConfig.perQsSeconds;
        
        startSessionLogic(pendingStart.sheetName, isStudy, finalLimit, quizConfig.mode !== 'none');
        setPendingStart(null);
    };

    const startSessionDirectly = (sheetName, isStudy = false) => {
        startSessionLogic(sheetName, isStudy, 0, false);
    };

    const startSessionLogic = (sheetName, isStudy, timeLimit, isTimed) => {
        let questions = [...activeQuiz.data[sheetName]];
        
        if (quizConfig.shuffleQs && !isStudy) {
            questions = shuffleArray(questions);
        }
        
        if (quizConfig.shuffleOptions && !isStudy) {
            questions = questions.map(q => {
                if (q.type === 'nat') return q;
                const originalOptions = [...q.options];
                const originalAnswer = q.answer; 
                
                const indexedOptions = originalOptions.map((opt, idx) => ({ text: opt, isCorrect: String(idx + 1) === String(originalAnswer) }));
                const shuffledIndexed = shuffleArray(indexedOptions);
                
                const newOptions = shuffledIndexed.map(o => o.text);
                const newAnswer = String(shuffledIndexed.findIndex(o => o.isCorrect) + 1);
                
                return { ...q, options: newOptions, answer: newAnswer };
            });
        }

        setActiveQuizSession({
            quiz: { ...activeQuiz, data: { [sheetName]: questions } },
            sheetName: sheetName,
            timeLimit: isStudy ? 0 : timeLimit,
            isTimed: isStudy ? false : isTimed,
            isStudyMode: isStudy
        });
    };

    // --- RENDER ---
    return (
        <div className="space-y-8">
            {view === 'sheets' && activeQuiz ? (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setView('list')} className="p-2.5 rounded-xl bg-white dark:bg-surface-2 border border-border text-text-muted hover:text-primary transition-all">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h2 className="text-2xl font-bold text-text">{activeQuiz.name}</h2>
                                <p className="text-text-muted text-[13px]">Select a sheet to begin your quiz session</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(activeQuiz.data).map(([sheetName, qs]) => (
                            <div key={sheetName} className="glass-panel group relative overflow-hidden rounded-[24px] border border-border hover:border-primary/40 transition-all bg-white dark:bg-surface-1/50 p-1">
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                                            <List className="w-6 h-6" />
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSheetToEdit(sheetName); }}
                                                className="p-2 hover:bg-primary/10 rounded-lg text-text-muted hover:text-primary transition-all shadow-sm"
                                                title="Edit Sheet"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSheetToDelete(sheetName); }}
                                                className="p-2 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-400 transition-all shadow-sm"
                                                title="Delete Sheet"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-0.5 mb-5">
                                        <h3 className="text-[16px] font-bold text-text group-hover:text-primary transition-colors line-clamp-1">{sheetName}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-md bg-surface-3 border border-border text-[9px] font-black text-primary uppercase tracking-tighter">
                                                {qs.length} Questions
                                            </span>
                                            <div className="w-1 h-1 rounded-full bg-border" />
                                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Available</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => {
                                                startSessionDirectly(sheetName, true);
                                            }}
                                            className="flex-1 group/btn relative flex items-center justify-center gap-2 bg-surface-3 hover:bg-amber-500/10 text-text hover:text-amber-500 py-3 rounded-xl text-[12px] font-bold transition-all border border-border hover:border-amber-500/30 overflow-hidden"
                                        >
                                            <BookOpen className="w-4 h-4" /> Study
                                        </button>
                                        <button 
                                            onClick={() => setPendingStart({ sheetName, qsCount: qs.length })}
                                            className="flex-[2] group/btn relative flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl text-[12px] font-bold transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                                        >
                                            <Play className="w-4 h-4 fill-current" /> Start Quiz
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-1">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
                            {/* Search */}
                            <div className="relative group flex-1 md:max-w-xs">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="Search worksheets..." 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                    className="w-full bg-surface-2 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-[13px] focus:outline-none focus:border-primary/40 focus:bg-surface-2 transition-all shadow-sm" 
                                />
                            </div>

                            {/* Shuffle Controls */}
                            <div className="flex items-center p-1 bg-surface-2/50 border border-border rounded-xl shadow-sm">
                                <button 
                                    onClick={() => setQuizConfig({ ...quizConfig, shuffleQs: !quizConfig.shuffleQs })}
                                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                                        quizConfig.shuffleQs 
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                        : 'text-text-muted hover:bg-surface-3 hover:text-text'
                                    }`}
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${quizConfig.shuffleQs ? 'animate-spin-slow' : ''}`} />
                                    <span>Shuffle Qs</span>
                                </button>
                                <div className="w-px h-4 bg-border mx-1" />
                                <button 
                                    onClick={() => setQuizConfig({ ...quizConfig, shuffleOptions: !quizConfig.shuffleOptions })}
                                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                                        quizConfig.shuffleOptions 
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                        : 'text-text-muted hover:bg-surface-3 hover:text-text'
                                    }`}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                    <span>Shuffle Options</span>
                                </button>
                            </div>
                        </div>
                        
                        {/* Upload Button */}
                        <label className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl text-[13px] font-bold hover:shadow-xl hover:shadow-primary/30 transition-all cursor-pointer group active:scale-[0.98] shadow-lg shadow-primary/10 self-center sm:self-auto">
                            <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" /> 
                            <span className="whitespace-nowrap">Upload XLSX</span>
                            <input type="file" className="hidden" accept=".xlsx" onChange={handleFileUpload} />
                        </label>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
                    ) : filteredQuizzes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-surface-2/50 rounded-3xl border-2 border-dashed border-border/50">
                            <div className="w-16 h-16 bg-surface-3 rounded-2xl flex items-center justify-center mb-4 border border-border"><FileSpreadsheet className="w-8 h-8 text-text-muted" /></div>
                            <h3 className="text-[16px] font-bold text-text">No quizzes found</h3>
                            <p className="text-[13px] text-text-muted mt-1">Upload an Excel file to get started</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredQuizzes.map(quiz => (
                                <div key={quiz.id} onClick={() => openQuizSheets(quiz.id)} className="group glass-panel rounded-3xl p-6 border border-border hover:border-primary/30 transition-all cursor-pointer hover:shadow-xl hover:shadow-primary/5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><FileSpreadsheet className="w-6 h-6 text-primary" /></div>
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setRenameModal({ type: 'quiz', id: quiz.id, name: quiz.name }); }} 
                                                className="p-2 hover:bg-primary/10 rounded-xl text-text-muted hover:text-primary transition-all"
                                                title="Rename Quiz"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteQuiz(quiz.id); }} className="p-2 hover:bg-red-500/10 rounded-xl text-text-muted hover:text-red-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    <h3 className="text-[16px] font-bold text-text mb-1 line-clamp-1">{quiz.name}</h3>
                                    <div className="flex items-center gap-3 text-[11px] font-bold text-text-muted uppercase tracking-tighter">
                                        <div className="flex items-center gap-1"><LayoutGrid className="w-3 h-3" /> {quiz.sheetsCount} Sheets</div>
                                        <div className="flex items-center gap-1"><List className="w-3 h-3" /> {quiz.totalQuestions} Qs</div>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                                        <div className="text-[11px] text-text-muted flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(quiz.created_at).toLocaleDateString()}</div>
                                        <div className="text-[12px] font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">Explore Sheets <ChevronRight className="w-4 h-4" /></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Time Config Modal */}
            {pendingStart && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div 
                            className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" 
                            onClick={() => setPendingStart(null)} 
                        />
                        <div className="relative w-full max-w-md bg-surface-2 border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-3/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Timer className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-[15px] font-bold text-text">Session Setup</h4>
                                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{pendingStart.sheetName}</p>
                                    </div>
                                </div>
                                <button onClick={() => setPendingStart(null)} className="p-2 text-text-muted hover:text-text hover:bg-surface-3 rounded-lg transition-all cursor-pointer">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-6">
                                {/* Mode Selection */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Timing Strategy</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            { id: 'none', label: 'Practice Mode', icon: Play, desc: 'Untimed session with stopwatch' },
                                            { id: 'total', label: 'Total Duration', icon: Timer, desc: 'Set a fixed countdown for all' },
                                            { id: 'perQs', label: 'Adaptive Timing', icon: Clock, desc: 'Time calculated per question' }
                                        ].map(mode => (
                                            <button
                                                key={mode.id}
                                                onClick={() => setQuizConfig({ ...quizConfig, mode: mode.id })}
                                                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all group ${
                                                    quizConfig.mode === mode.id 
                                                    ? 'bg-primary/5 border-primary shadow-sm' 
                                                    : 'bg-surface-3/30 border-border hover:border-primary/30 hover:bg-surface-3/50'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                                    quizConfig.mode === mode.id 
                                                    ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                                                    : 'bg-surface-3 text-text-muted border border-border group-hover:border-primary/30'
                                                }`}>
                                                    <mode.icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className={`text-[13px] font-bold ${quizConfig.mode === mode.id ? 'text-primary' : 'text-text'}`}>{mode.label}</div>
                                                    <div className="text-[10px] text-text-muted leading-tight">{mode.desc}</div>
                                                </div>
                                                {quizConfig.mode === mode.id && (
                                                    <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center animate-in zoom-in">
                                                        <Check className="w-2.5 h-2.5 text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Config Inputs */}
                                <div className="animate-in slide-in-from-top-2 duration-300">
                                    {quizConfig.mode === 'total' && (
                                        <div className="p-4 rounded-xl bg-surface-3/50 border border-border space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Duration (Minutes)</label>
                                                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-[9px] font-bold text-primary">FULL SESSION</span>
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    value={quizConfig.timeLimit} 
                                                    onChange={(e) => setQuizConfig({...quizConfig, timeLimit: Number(e.target.value)})}
                                                    className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-[20px] font-bold text-text text-center focus:outline-none focus:border-primary/40 transition-all"
                                                    autoFocus
                                                />
                                                <div className="absolute inset-y-0 right-3 flex items-center text-text-muted text-[11px] font-bold pointer-events-none">MIN</div>
                                            </div>
                                        </div>
                                    )}

                                    {quizConfig.mode === 'perQs' && (
                                        <div className="p-4 rounded-xl bg-surface-3/50 border border-border space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Seconds Per Item</label>
                                                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-[9px] font-bold text-primary">{pendingStart.qsCount} Qs</span>
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    value={quizConfig.perQsSeconds} 
                                                    onChange={(e) => setQuizConfig({...quizConfig, perQsSeconds: Number(e.target.value)})}
                                                    className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-[20px] font-bold text-text text-center focus:outline-none focus:border-primary/40 transition-all"
                                                    autoFocus
                                                />
                                                <div className="absolute inset-y-0 right-3 flex items-center text-text-muted text-[11px] font-bold pointer-events-none">SEC</div>
                                            </div>
                                            <div className="flex items-center justify-between pt-3 border-t border-border/20">
                                                <span className="text-[10px] font-bold text-text-muted uppercase">Final Time</span>
                                                <span className="text-[14px] font-bold text-primary">
                                                    {Math.floor((pendingStart.qsCount * quizConfig.perQsSeconds) / 60)}m {(pendingStart.qsCount * quizConfig.perQsSeconds) % 60}s
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {quizConfig.mode === 'none' && (
                                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                <Award className="w-4 h-4" />
                                            </div>
                                            <p className="text-[11px] text-emerald-500/80 font-medium leading-tight">Focus mode active. No time pressure active.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Shuffle Toggles */}
                                <div className="space-y-3 pt-3 border-t border-border/20">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Randomization</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={() => setQuizConfig({ ...quizConfig, shuffleQs: !quizConfig.shuffleQs })}
                                            className={`group flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                                quizConfig.shuffleQs ? 'bg-primary/5 border-primary shadow-sm' : 'bg-surface-3/30 border-border hover:border-primary/20'
                                            }`}
                                        >
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                                quizConfig.shuffleQs ? 'bg-primary text-white shadow-lg' : 'bg-surface-3 text-text-muted border border-border'
                                            }`}>
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <div className={`text-[12px] font-bold ${quizConfig.shuffleQs ? 'text-primary' : 'text-text'}`}>Questions</div>
                                                <div className="text-[8px] text-text-muted uppercase font-bold tracking-tighter">Random Order</div>
                                            </div>
                                        </button>

                                        <button 
                                            onClick={() => setQuizConfig({ ...quizConfig, shuffleOptions: !quizConfig.shuffleOptions })}
                                            className={`group flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                                quizConfig.shuffleOptions ? 'bg-primary/5 border-primary shadow-sm' : 'bg-surface-3/30 border-border hover:border-primary/20'
                                            }`}
                                        >
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                                quizConfig.shuffleOptions ? 'bg-primary text-white shadow-lg' : 'bg-surface-3 text-text-muted border border-border'
                                            }`}>
                                                <LayoutGrid className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <div className={`text-[12px] font-bold ${quizConfig.shuffleOptions ? 'text-primary' : 'text-text'}`}>Options</div>
                                                <div className="text-[8px] text-text-muted uppercase font-bold tracking-tighter">Random A-D</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 bg-surface-3/30 border-t border-border flex items-center gap-3">
                                <button 
                                    onClick={() => setPendingStart(null)}
                                    className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-text-muted hover:text-text hover:bg-surface-3 transition-all cursor-pointer border border-border"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => startSession(false)}
                                    className="flex-[2] py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all hover:brightness-110 flex items-center justify-center gap-2"
                                >
                                    <Play className="w-4 h-4 fill-current" /> Start Quiz
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            <QuizModal 
                isOpen={!!activeQuizSession}
                onClose={() => setActiveQuizSession(null)}
                quiz={activeQuizSession?.quiz}
                sheetName={activeQuizSession?.sheetName}
                timeLimit={activeQuizSession?.timeLimit}
                isTimed={activeQuizSession?.isTimed}
                isStudyMode={activeQuizSession?.isStudyMode}
            />

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setDeleteConfirm(null)} />
                        <div className="relative w-full max-w-sm bg-surface-2 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                            <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-6">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-text mb-2">Delete Worksheet?</h3>
                            <p className="text-text-muted text-[14px] leading-relaxed mb-8">This action is permanent and cannot be undone. All questions in this set will be lost.</p>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-xl bg-surface-3 border border-slate-200 dark:border-white/5 text-text text-[13px] font-bold hover:bg-surface-2 transition-all">Cancel</button>
                                <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-[13px] font-bold shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all">Delete Now</button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Sheet Delete Confirmation Modal */}
            {sheetToDelete && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSheetToDelete(null)} />
                        <div className="relative w-full max-w-sm bg-surface-2 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                            <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-6">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-text mb-2">Delete Sheet?</h3>
                            <p className="text-text-muted text-[14px] leading-relaxed mb-8">Are you sure you want to delete "{sheetToDelete}"? All questions in this sheet will be permanently removed.</p>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSheetToDelete(null)} className="flex-1 py-3 rounded-xl bg-surface-3 border border-slate-200 dark:border-white/5 text-text text-[13px] font-bold hover:bg-surface-2 transition-all">Cancel</button>
                                <button onClick={confirmDeleteSheet} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-[13px] font-bold shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all">Delete Sheet</button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Rename Modal */}
            {renameModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setRenameModal(null)} />
                        <div className="relative w-full max-w-md bg-surface-2 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-8 pt-8 pb-4">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                                    <Edit2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-text mb-2">Rename {renameModal.type === 'quiz' ? 'Worksheet' : 'Sheet'}</h3>
                                <p className="text-text-muted text-[14px] mb-8">Enter a new descriptive name for this {renameModal.type === 'quiz' ? 'quiz set' : 'individual sheet'}.</p>
                                
                                <div className="space-y-4">
                                    <input 
                                        type="text" 
                                        value={renameModal.name} 
                                        onChange={(e) => setRenameModal({ ...renameModal, name: e.target.value })}
                                        className="w-full bg-surface-3 border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 text-[16px] font-bold text-text focus:outline-none focus:border-primary transition-all"
                                        placeholder="Enter new name..."
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                    />
                                </div>
                            </div>
                            <div className="px-8 py-6 bg-surface-3/30 border-t border-slate-200 dark:border-white/5 flex items-center gap-3">
                                <button onClick={() => setRenameModal(null)} className="flex-1 py-3.5 rounded-2xl text-[13px] font-bold text-text-muted hover:text-text transition-all">Cancel</button>
                                <button onClick={handleRename} className="flex-1 py-3.5 rounded-2xl bg-primary text-white text-[13px] font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Sheet Editor Modal */}
            {sheetToEdit && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSheetToEdit(null)} />
                        <div className="relative w-full max-w-2xl bg-surface-2 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-surface-3/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Edit2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-[16px] font-bold text-text">Edit Sheet: {sheetToEdit}</h4>
                                        <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider">{activeQuiz.data[sheetToEdit]?.length || 0} Questions</p>
                                    </div>
                                </div>
                                <button onClick={() => setSheetToEdit(null)} className="p-2 text-text-muted hover:text-text hover:bg-surface-3 rounded-xl transition-all cursor-pointer">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <div className="space-y-4">
                                    {activeQuiz.data[sheetToEdit]?.map((q, idx) => (
                                        <div key={idx} className="p-4 rounded-2xl bg-surface-3/30 border border-border space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-[10px] font-bold text-primary uppercase">Q{idx + 1} • {q.type}</span>
                                                <span className="text-[10px] font-bold text-text-muted">SCORE: {q.score}</span>
                                            </div>
                                            <p className="text-[13px] text-text font-medium leading-relaxed">{q.question}</p>
                                            {q.options?.length > 0 && (
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    {q.options.map((opt, oIdx) => (
                                                        <div key={oIdx} className={`px-3 py-2 rounded-lg text-[11px] border ${String(oIdx + 1) === String(q.answer) ? 'bg-primary/10 border-primary/30 text-primary font-bold' : 'bg-surface-2 border-border text-text-muted'}`}>
                                                            {opt}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="px-8 py-6 bg-surface-3/30 border-t border-border flex items-center justify-end gap-3">
                                <button 
                                    onClick={() => {
                                        const sheetName = sheetToEdit;
                                        setSheetToEdit(null);
                                        setTimeout(() => {
                                            setRenameModal({ type: 'sheet', id: activeQuiz.id, oldName: sheetName, name: sheetName });
                                        }, 100);
                                    }}
                                    className="px-6 py-2.5 rounded-xl border border-border text-[13px] font-bold text-text-muted hover:text-primary hover:border-primary/30 transition-all"
                                >
                                    Rename Sheet
                                </button>
                                <button onClick={() => setSheetToEdit(null)} className="px-8 py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">Close</button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
};

export default QuizGeneratorTool;
