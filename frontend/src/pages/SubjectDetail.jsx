import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { subjectsApi, topicsApi, sessionsApi, questionsApi, notesApi } from '../api/index.js';
import TopicTree from '../components/TopicTree.jsx';
import SessionCard from '../components/SessionCard.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import RichTextRenderer from '../components/RichTextRenderer.jsx';
import toast from 'react-hot-toast';
import { ArrowLeft, PlusCircle, BarChart3, Wand2, BookOpen, Layers, Activity, HelpCircle, FileText, Image as ImageIcon, Trash2, Link2 as LinkIcon, ChevronDown, ChevronRight } from 'lucide-react';
import ManageSyllabusModal from '../components/modals/ManageSyllabusModal.jsx';
import AddQuestionModal from '../components/modals/AddQuestionModal.jsx';
import AddNoteModal from '../components/modals/AddNoteModal.jsx';
import ViewNoteModal from '../components/modals/ViewNoteModal.jsx';
import CreateSessionModal from '../components/modals/CreateSessionModal.jsx';
import EditSessionModal from '../components/modals/EditSessionModal.jsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';

const preprocessMarkdown = (text) => {
    if (!text) return '';
    return text
        .replace(/\\\[/g, '$$$$')
        .replace(/\\\]/g, '$$$$')
        .replace(/\\\(/g, '$')
        .replace(/\\\)/g, '$')
        .replace(/\\bottom([a-zA-Z])/g, '\\bot $1')
        .replace(/\\bottom/g, '\\bot');
};

const SubjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [subject, setSubject] = useState(null);
    const [topics, setTopics] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('topics');
    const [showTopicModal, setShowTopicModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [viewingNote, setViewingNote] = useState(null);
    const [selectedQuestionIdForNote, setSelectedQuestionIdForNote] = useState(null);
    const [generatingAINoteId, setGeneratingAINoteId] = useState(null);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [confirmDeleteSession, setConfirmDeleteSession] = useState({ open: false, session: null });
    const [confirmDeleteQuestion, setConfirmDeleteQuestion] = useState({ open: false, questionId: null });
    const [confirmDeleteNote, setConfirmDeleteNote] = useState({ open: false, note: null });
    const [editingSession, setEditingSession] = useState(null);
    const [fetchingImageId, setFetchingImageId] = useState(null);
    const [fetchedImages, setFetchedImages] = useState({});

    // Toggle state for grouped questions
    const [expandedGroups, setExpandedGroups] = useState({});

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    useEffect(() => {
        const load = async () => {
            try {
                const [subRes, topRes, sesRes, qsRes, notesRes] = await Promise.all([
                    subjectsApi.get(id),
                    topicsApi.list(id),
                    sessionsApi.list(id),
                    questionsApi.list(id),
                    notesApi.list(id),
                ]);
                setSubject(subRes.subject);
                setTopics(topRes.topics);
                setSessions(sesRes.sessions);
                setQuestions(qsRes.questions || []);
                setNotes(notesRes.notes || []);
            } catch {
                navigate('/subjects');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, navigate]);

    const handleTopicDeleted = (topicId) => {
        const removeFromTree = (nodes) =>
            nodes
                .filter((n) => n.id !== topicId)
                .map((n) => ({ ...n, children: removeFromTree(n.children || []) }));
        setTopics((prev) => removeFromTree(prev));
    };

    const handleQuestionAdded = (newQuestions) => {
        // newQuestions is always an array (may contain 1 or more)
        setQuestions((prev) => [...newQuestions, ...prev]);
    };

    const handleNoteAdded = (newNote) => {
        setNotes((prev) => [newNote, ...prev]);
    };

    const handleSessionCreated = (newSession) => {
        setSessions((prev) => [newSession, ...prev]);
        navigate(`/subjects/${id}/sessions/${newSession.id}`);
    };

    // ─── Session CRUD handlers ───────────────────────────────
    const handleDeleteSession = async () => {
        const session = confirmDeleteSession.session;
        if (!session) return;
        const loadingToast = toast.loading(`Deleting "${session.title}"...`);
        try {
            await sessionsApi.delete(id, session.id);
            setSessions((prev) => prev.filter((s) => s.id !== session.id));
            toast.success(`Session deleted`, { id: loadingToast });
        } catch {
            toast.error('Failed to delete session', { id: loadingToast });
        }
    };



    // ─── Question Handlers ───────────────────────────────

    const handleFetchImage = async (questionId) => {
        // Check if we already have the image (or a sibling's image) cached
        const question = questions.find(q => q.id === questionId);
        const sourceId = question?.source_image_id || questionId;

        // If the source image is already cached, reuse it
        if (fetchedImages[sourceId]) {
            setFetchedImages((prev) => ({ ...prev, [questionId]: prev[sourceId] }));
            return;
        }

        try {
            setFetchingImageId(questionId);
            const res = await questionsApi.getImage(id, questionId);
            if (res.content) {
                // Cache the image under both the question's own ID and source ID
                setFetchedImages((prev) => ({
                    ...prev,
                    [questionId]: res.content,
                    [sourceId]: res.content,
                }));
            }
        } catch {
            toast.error('Failed to load image');
        } finally {
            setFetchingImageId(null);
        }
    };

    const handleDeleteQuestion = async () => {
        const questionId = confirmDeleteQuestion.questionId;
        if (!questionId) return;
        const loadingToast = toast.loading('Deleting question...');
        try {
            await questionsApi.delete(id, questionId);
            setQuestions((prev) => prev.filter((q) => q.id !== questionId));
            toast.success('Question deleted', { id: loadingToast });
        } catch {
            toast.error('Failed to delete', { id: loadingToast });
        } finally {
            setConfirmDeleteQuestion({ open: false, questionId: null });
        }
    };

    const handleDeleteNote = async () => {
        const note = confirmDeleteNote.note;
        if (!note) return;
        const loadingToast = toast.loading('Deleting note...');
        try {
            await notesApi.delete(id, note.id);
            setNotes((prev) => prev.filter((n) => n.id !== note.id));
            toast.success('Note deleted', { id: loadingToast });
        } catch {
            toast.error('Failed to delete note', { id: loadingToast });
        } finally {
            setConfirmDeleteNote({ open: false, note: null });
        }
    };

    const navigateToQuestion = (questionId) => {
        setActiveTab('questions');
        setTimeout(() => {
            let el = document.getElementById(`question-${questionId}`);
            if (!el) {
                // If the element is hidden inside a collapsed group, expand it
                const group = groupedQuestions.find(g => g.questions.some(q => q.id === questionId));
                if (group && !expandedGroups[group.rootId]) {
                    setExpandedGroups(prev => ({ ...prev, [group.rootId]: true }));
                }
            }

            setTimeout(() => {
                el = document.getElementById(`question-${questionId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Optional styling ping
                    el.style.transition = 'box-shadow 0.3s ease';
                    el.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)';
                    setTimeout(() => el.style.boxShadow = 'none', 2000);
                }
            }, 100);
        }, 100);
    };

    const handleGenerateAINote = async (questionId) => {
        // If an AI note exists for this question, just navigate to it
        const existingNote = notes.find(n => n.question_id === questionId && n.title?.startsWith('AI Note'));
        if (existingNote) {
            setActiveTab('notes');
            setTimeout(() => {
                const el = document.getElementById(`note-${existingNote.id}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.style.transition = 'box-shadow 0.3s ease';
                    el.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)';
                    setTimeout(() => el.style.boxShadow = 'none', 2000);
                }
            }, 100);
            return;
        }

        setGeneratingAINoteId(questionId);
        const loadingToast = toast.loading('Generating AI note...');
        try {
            const res = await notesApi.create(id, { questionId });
            setNotes((prev) => [res.note, ...prev]);
            toast.success('AI Note generated!', { id: loadingToast });
        } catch (error) {
            toast.error(error.message || 'Failed to generate AI note', { id: loadingToast });
        } finally {
            setGeneratingAINoteId(null);
        }
    };

    // Group questions by source
    const groupedQuestions = React.useMemo(() => {
        const groups = {};
        // First pass: identify all potential roots and initialize groups
        questions.forEach(q => {
            const rootId = q.source_image_id || q.id;
            if (!groups[rootId]) {
                groups[rootId] = [];
            }
        });

        // Second pass: assign questions to groups
        // We want to preserve the overall order of questions by their newest member
        questions.forEach(q => {
            const rootId = q.source_image_id || q.id;
            groups[rootId].push(q);
        });

        // Sort questions within groups by created_at ascending (if they have source_image_id) 
        // or just keep them as they are. Usually q.id is the root, others are siblings.
        Object.keys(groups).forEach(rootId => {
            groups[rootId].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });

        // Convert to array of groups and sort by newest question in each group
        return Object.entries(groups).map(([rootId, qs]) => ({
            rootId,
            questions: qs,
            isGroup: qs.length > 1,
            newestAt: new Date(Math.max(...qs.map(q => new Date(q.created_at))))
        })).sort((a, b) => b.newestAt - a.newestAt);
    }, [questions]);

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto animate-pulse">
                {/* Skeleton Header Navigation */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-24 h-9 bg-surface-2 rounded-lg border border-white/[0.06]" />
                </div>

                {/* Skeleton Subject Header */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="h-8 bg-surface-2 rounded-lg w-1/3 mb-3" />
                            <div className="h-4 bg-surface-2 rounded-lg w-2/3" />
                        </div>
                        <div className="w-32 h-10 bg-surface-2 rounded-lg md:mt-1" />
                    </div>
                </div>

                {/* Skeleton Gradient separator */}
                <div className="h-px bg-white/[0.08] mb-8" />

                {/* Skeleton Tabs Area */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex gap-1 p-1 bg-surface-2/50 rounded-xl border border-white/[0.06] w-fit">
                        <div className="w-32 h-10 bg-surface-3/50 rounded-lg" />
                        <div className="w-32 h-10 bg-surface-3/50 rounded-lg" />
                        <div className="w-32 h-10 bg-surface-3/50 rounded-lg" />
                    </div>
                    <div className="w-36 h-10 bg-surface-2 rounded-lg" />
                </div>

                {/* Skeleton Main Content Area */}
                <div className="flex flex-col gap-5">
                    <div className="h-8 bg-surface-2 rounded-lg w-24 mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="h-48 bg-surface-2/40 rounded-2xl border border-white/[0.06]" />
                        <div className="h-48 bg-surface-2/40 rounded-2xl border border-white/[0.06]" />
                        <div className="h-48 bg-surface-2/40 rounded-2xl border border-white/[0.06]" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in max-w-6xl mx-auto">
            {/* Confirm Delete Session */}
            <ConfirmDialog
                isOpen={confirmDeleteSession.open}
                title="Delete Session"
                message={`Are you sure you want to delete "${confirmDeleteSession.session?.title}"? This will also remove all entries in this session.`}
                onConfirm={handleDeleteSession}
                onCancel={() => setConfirmDeleteSession({ open: false, session: null })}
            />

            {/* Confirm Delete Question */}
            <ConfirmDialog
                isOpen={confirmDeleteQuestion.open}
                title="Delete Question"
                message="Are you sure you want to delete this question? This action cannot be undone."
                onConfirm={handleDeleteQuestion}
                onCancel={() => setConfirmDeleteQuestion({ open: false, questionId: null })}
            />

            {/* Confirm Delete Note */}
            <ConfirmDialog
                isOpen={confirmDeleteNote.open}
                title="Delete Note"
                message={`Are you sure you want to delete "${confirmDeleteNote.note?.title}"? This action cannot be undone.`}
                onConfirm={handleDeleteNote}
                onCancel={() => setConfirmDeleteNote({ open: false, note: null })}
            />

            <ManageSyllabusModal
                isOpen={showTopicModal}
                onClose={() => setShowTopicModal(false)}
                subjectId={id}
                onTopicsUpdated={setTopics}
            />

            <AddQuestionModal
                isOpen={showQuestionModal}
                onClose={() => setShowQuestionModal(false)}
                subjectId={id}
                onQuestionAdded={handleQuestionAdded}
            />

            <AddNoteModal
                isOpen={showNoteModal}
                onClose={() => {
                    setShowNoteModal(false);
                    setSelectedQuestionIdForNote(null);
                }}
                subjectId={id}
                onNoteAdded={handleNoteAdded}
                questionId={selectedQuestionIdForNote}
            />

            <CreateSessionModal
                isOpen={showSessionModal}
                onClose={() => setShowSessionModal(false)}
                subjectId={id}
                onSessionCreated={handleSessionCreated}
            />

            <EditSessionModal
                isOpen={!!editingSession}
                onClose={() => setEditingSession(null)}
                subjectId={id}
                session={editingSession}
                onSessionUpdated={(updated) => {
                    setSessions((prev) =>
                        prev.map((s) =>
                            s.id === updated.id
                                ? { ...s, title: updated.title, notes: updated.notes, sessionDate: updated.session_date }
                                : s
                        )
                    );
                }}
            />

            <ViewNoteModal
                isOpen={!!viewingNote}
                onClose={() => setViewingNote(null)}
                note={viewingNote}
                onNavigateToQuestion={navigateToQuestion}
            />

            {/* Header Navigation */}
            <div className="flex items-center gap-3 mb-4">
                <Link
                    to="/subjects"
                    className="flex items-center gap-2 text-[13px] font-semibold text-slate-400 hover:text-white transition-all hover:bg-white/[0.06] px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.1]"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </Link>
            </div>

            {/* Subject Header (Identity) */}
            <div className="flex flex-col gap-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] md:text-[24px] font-heading font-semibold text-white tracking-tight leading-tight mb-1.5">
                            {subject?.name}
                        </h1>
                        {subject?.description && (
                            <p className="text-slate-500 text-[14px] max-w-2xl leading-[1.6]">{subject.description}</p>
                        )}
                    </div>
                    <Link
                        to={`/subjects/${id}/reports`}
                        className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shrink-0 md:mt-1 cursor-pointer border border-white/[0.08] bg-surface-3/50 text-slate-300 hover:text-white hover:bg-surface-3 hover:border-white/[0.12] group"
                    >
                        <BarChart3 className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" strokeWidth={2} />
                        <span>View Analytics</span>
                    </Link>
                </div>

                {/* Gradient separator */}
                <div className="h-px bg-gradient-to-r from-white/[0.08] via-white/[0.06] to-transparent" />

                {/* Controls (Sub-Nav + Action) — single row, vertically aligned */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Segmented Tabs */}
                    <div className="flex gap-1 p-1 bg-surface-2/50 backdrop-blur-md rounded-xl border border-white/[0.06] w-fit">
                        {['topics', 'sessions', 'questions', 'notes'].map((tab) => {
                            const count = tab === 'topics' ? topics.length : tab === 'sessions' ? sessions.length : tab === 'questions' ? questions.length : notes.length;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex items-center gap-3 px-5 py-2.5 rounded-lg text-[13px] font-semibold capitalize transition-all duration-200 cursor-pointer
                                        ${activeTab === tab
                                            ? 'bg-primary text-white shadow-[0_2px_12px_rgba(139,92,246,0.35)]'
                                            : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]'
                                        }`}
                                >
                                    {tab}
                                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold leading-none
                                        ${activeTab === tab
                                            ? 'bg-white/20 text-white'
                                            : 'bg-white/[0.06] text-slate-500'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Action Bar — same row height as tabs */}
                    <div className="flex items-center gap-3">
                        {activeTab === 'sessions' && (
                            <button
                                onClick={() => setShowSessionModal(true)}
                                className="btn-primary flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer hover:shadow-[0_4px_20px_rgba(139,92,246,0.35)] active:scale-[0.98]"
                            >
                                <PlusCircle className="w-4 h-4" strokeWidth={2} />
                                <span>New Session</span>
                            </button>
                        )}

                        {activeTab === 'questions' && (
                            <button
                                onClick={() => setShowQuestionModal(true)}
                                className="btn-primary flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer hover:shadow-[0_4px_20px_rgba(139,92,246,0.35)] active:scale-[0.98]"
                            >
                                <PlusCircle className="w-4 h-4" strokeWidth={2} />
                                <span>Add Question</span>
                            </button>
                        )}

                        {activeTab === 'notes' && (
                            <button
                                onClick={() => setShowNoteModal(true)}
                                className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer active:scale-[0.98]"
                            >
                                <PlusCircle className="w-4 h-4" strokeWidth={2} />
                                <span>Add Note</span>
                            </button>
                        )}

                        {activeTab === 'topics' && (
                            <button
                                onClick={() => setShowTopicModal(true)}
                                className="btn-primary flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer hover:shadow-[0_4px_20px_rgba(139,92,246,0.35)] active:scale-[0.98]"
                            >
                                <PlusCircle className="w-4 h-4" strokeWidth={2} />
                                <span>Manage Syllabus</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {activeTab === 'topics' && (
                <div className="fade-in">
                    <div className="flex items-center justify-between mb-6 border-b border-white/[0.08] pb-4">
                        <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Syllabus</h3>
                    </div>
                    <TopicTree
                        topics={topics}
                        subjectId={id}
                        onTopicDeleted={handleTopicDeleted}
                        onTopicsChanged={setTopics}
                    />
                </div>
            )}

            {activeTab === 'sessions' && (
                <div className="fade-in">
                    <div className="flex items-center justify-between mb-6 border-b border-white/[0.08] pb-4">
                        <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Study Sessions</h3>
                    </div>

                    {sessions.length === 0 ? (
                        <div className="glass-panel p-12 text-center rounded-2xl border-dashed border-white/10 max-w-2xl mx-auto mt-8">
                            <div className="w-20 h-20 rounded-xl bg-surface-3 mx-auto flex items-center justify-center mb-6 shadow-inner border border-white/5">
                                <Activity className="w-8 h-8 text-primary opacity-80" />
                            </div>
                            <h3 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">No learning sessions</h3>
                            <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-md mx-auto">
                                You haven't recorded any sessions for this subject yet. Start a session to log your correct and incorrect topics.
                            </p>
                            <button
                                onClick={() => setShowSessionModal(true)}
                                className="btn-primary flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-lg transition-all mx-auto w-fit cursor-pointer"
                            >
                                <PlusCircle className="w-4 h-4" />
                                <span>Record First Session</span>
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {sessions.map((s) => (
                                <SessionCard
                                    key={s.id}
                                    session={s}
                                    subjectId={id}
                                    onDelete={(session) => setConfirmDeleteSession({ open: true, session })}
                                    onEdit={(session) => setEditingSession(session)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'questions' && (
                <div className="fade-in">
                    {/* Header for Questions */}
                    <div className="flex items-center justify-between mb-6 border-b border-white/[0.08] pb-4">
                        <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Question Bank</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-6 items-start">
                        {/* Form moved to Modal */}

                        {/* Questions List (Full Width) */}
                        <div className="w-full">
                            {questions.length === 0 ? (
                                <div className="glass p-16 text-center rounded-xl border-dashed border-white/10 flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mb-6 shadow-inner border border-white/5 rotate-3">
                                        <HelpCircle className="w-10 h-10 text-slate-500" />
                                    </div>
                                    <h3 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">Your question bank is empty</h3>
                                    <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-8">
                                        Start adding questions from your books or notes. AI will automatically format them for better readability.
                                    </p>
                                    <button
                                        onClick={() => setShowQuestionModal(true)}
                                        className="btn-primary flex items-center gap-2 px-6 py-3 rounded-lg transition-all cursor-pointer"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        <span>Add Your First Question</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-7">
                                    {groupedQuestions.map((group) => {
                                        const isExpanded = expandedGroups[group.rootId];
                                        const rootQ = group.questions[0];

                                        if (!group.isGroup) {
                                            const q = rootQ;
                                            const existingAINote = notes.find(n => n.question_id === q.id && n.title?.startsWith('AI Note'));
                                            return (
                                                <div key={q.id} id={`question-${q.id}`} className="question-card group">
                                                    {/* Card Header — question number + metadata */}
                                                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.06]">
                                                        <span className="text-[15px] font-heading font-bold text-primary tracking-tight">
                                                            Q
                                                        </span>
                                                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-3/80 text-slate-300 rounded-md text-[12px] font-semibold border border-white/5">
                                                            {q.type === 'image' ? <ImageIcon className="w-4 h-4 text-indigo-400" /> : <FileText className="w-4 h-4 text-emerald-400" />}
                                                            {q.type === 'image' ? 'Image' : 'Text'}
                                                        </span>
                                                        <span className="text-[12px] text-slate-500 ml-auto font-medium">
                                                            {new Date(q.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>

                                                        <div className="flex items-center gap-1 ml-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedQuestionIdForNote(q.id);
                                                                    setShowNoteModal(true);
                                                                }}
                                                                className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all cursor-pointer"
                                                                title="Manual Note"
                                                            >
                                                                <FileText className="w-[18px] h-[18px]" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleGenerateAINote(q.id)}
                                                                disabled={generatingAINoteId === q.id}
                                                                className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                                                title={existingAINote ? "View AI Note" : "AI Note"}
                                                            >
                                                                {generatingAINoteId === q.id ? (
                                                                    <div className="w-[18px] h-[18px] border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                                                                ) : existingAINote ? (
                                                                    <BookOpen className="w-[18px] h-[18px]" />
                                                                ) : (
                                                                    <Wand2 className="w-[18px] h-[18px]" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDeleteQuestion({ open: true, questionId: q.id })}
                                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all cursor-pointer"
                                                                title="Delete Question"
                                                            >
                                                                <Trash2 className="w-[18px] h-[18px]" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Card Body — question content */}
                                                    <div className="prose prose-invert prose-lg max-w-none text-slate-200 text-[15px] leading-[1.7]">
                                                        {q.formatted_content ? (
                                                            <RichTextRenderer content={q.formatted_content} />
                                                        ) : (
                                                            <p className="whitespace-pre-wrap">{q.content}</p>
                                                        )}
                                                    </div>

                                                    {q.type === 'image' && (
                                                        <div className="mt-5">
                                                            {fetchedImages[q.id] || fetchedImages[q.source_image_id] ? (
                                                                <div className="rounded-xl overflow-hidden border border-white/10 inline-block bg-black/40 group/img relative">
                                                                    <img
                                                                        src={fetchedImages[q.id] || fetchedImages[q.source_image_id]}
                                                                        alt="Original Question"
                                                                        className="max-h-80 object-contain transition-all group-hover/img:opacity-50"
                                                                    />
                                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
                                                                        <span className="bg-black/60 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border border-white/10">
                                                                            Original Attachment
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleFetchImage(q.id)}
                                                                    disabled={fetchingImageId === q.id}
                                                                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold bg-surface-3/80 text-slate-300 hover:text-white hover:bg-surface-3 transition-all border border-white/5 shadow-sm disabled:opacity-50 cursor-pointer"
                                                                >
                                                                    {fetchingImageId === q.id ? (
                                                                        <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                                                                    ) : (
                                                                        <ImageIcon className="w-4 h-4 text-indigo-400" />
                                                                    )}
                                                                    <span>
                                                                        {fetchingImageId === q.id ? 'Loading...' : 'Show Source Image'}
                                                                    </span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}


                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={group.rootId} className="flex flex-col gap-3">
                                                {/* Group Header */}
                                                <div
                                                    onClick={() => toggleGroup(group.rootId)}
                                                    className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-white/[0.06] cursor-pointer hover:bg-surface-3 transition-colors group/header"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                                            {rootQ.type === 'image' ? <ImageIcon className="w-5 h-5 text-indigo-400" /> : <FileText className="w-5 h-5 text-emerald-400" />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-3">
                                                                <h4 className="text-[15px] font-heading font-bold text-white tracking-tight">
                                                                    {rootQ.type === 'image' ? 'Image' : 'Text'} Collection
                                                                </h4>
                                                                <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                                    {group.questions.length} Items
                                                                </span>
                                                            </div>
                                                            <p className="text-[12px] text-slate-500 mt-0.5">
                                                                Uploaded {new Date(group.newestAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg bg-white/[0.03] text-slate-500 group-hover/header:text-white transition-all ${isExpanded ? 'rotate-180' : ''}`}>
                                                            <ChevronDown className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Group Content */}
                                                {isExpanded && (
                                                    <div className="flex flex-col gap-5 pl-8 border-l-2 border-white/[0.06] mt-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        {group.questions.map((q, qidx) => {
                                                            const existingAINote = notes.find(n => n.question_id === q.id && n.title?.startsWith('AI Note'));
                                                            return (
                                                                <div key={q.id} id={`question-${q.id}`} className="question-card group">
                                                                    {/* Card Header — question number + metadata */}
                                                                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.06]">
                                                                        <span className="text-[15px] font-heading font-bold text-primary tracking-tight">
                                                                            #{qidx + 1}
                                                                        </span>
                                                                        <span className="text-[12px] text-slate-500 ml-auto font-medium">
                                                                            {new Date(q.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                        </span>

                                                                        <div className="flex items-center gap-1 ml-2">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedQuestionIdForNote(q.id);
                                                                                    setShowNoteModal(true);
                                                                                }}
                                                                                className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all cursor-pointer"
                                                                                title="Manual Note"
                                                                            >
                                                                                <FileText className="w-[18px] h-[18px]" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleGenerateAINote(q.id)}
                                                                                disabled={generatingAINoteId === q.id}
                                                                                className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                                                                title={existingAINote ? "View AI Note" : "AI Note"}
                                                                            >
                                                                                {generatingAINoteId === q.id ? (
                                                                                    <div className="w-[18px] h-[18px] border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                                                                                ) : existingAINote ? (
                                                                                    <BookOpen className="w-[18px] h-[18px]" />
                                                                                ) : (
                                                                                    <Wand2 className="w-[18px] h-[18px]" />
                                                                                )}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setConfirmDeleteQuestion({ open: true, questionId: q.id })}
                                                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all cursor-pointer"
                                                                                title="Delete Question"
                                                                            >
                                                                                <Trash2 className="w-[18px] h-[18px]" />
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Card Body — question content */}
                                                                    <div className="prose prose-invert prose-lg max-w-none text-slate-200 text-[15px] leading-[1.7]">
                                                                        {q.formatted_content ? (
                                                                            <RichTextRenderer content={q.formatted_content} />
                                                                        ) : (
                                                                            <p className="whitespace-pre-wrap">{q.content}</p>
                                                                        )}
                                                                    </div>

                                                                    {q.type === 'image' && qidx === 0 && (
                                                                        <div className="mt-5">
                                                                            {fetchedImages[q.id] || fetchedImages[q.source_image_id] ? (
                                                                                <div className="rounded-xl overflow-hidden border border-white/10 inline-block bg-black/40 group/img relative">
                                                                                    <img
                                                                                        src={fetchedImages[q.id] || fetchedImages[q.source_image_id]}
                                                                                        alt="Original Question"
                                                                                        className="max-h-80 object-contain transition-all group-hover/img:opacity-50"
                                                                                    />
                                                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
                                                                                        <span className="bg-black/60 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border border-white/10">
                                                                                            Source Image
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => handleFetchImage(q.id)}
                                                                                    disabled={fetchingImageId === q.id}
                                                                                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold bg-surface-3/80 text-slate-300 hover:text-white hover:bg-surface-3 transition-all border border-white/5 shadow-sm disabled:opacity-50 cursor-pointer"
                                                                                >
                                                                                    {fetchingImageId === q.id ? (
                                                                                        <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                                                                                    ) : (
                                                                                        <ImageIcon className="w-4 h-4 text-indigo-400" />
                                                                                    )}
                                                                                    <span>
                                                                                        {fetchingImageId === q.id ? 'Loading...' : 'Show Shared Source Image'}
                                                                                    </span>
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}


                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'notes' && (
                <div className="fade-in">
                    <div className="flex items-center justify-between mb-6 border-b border-white/[0.08] pb-4">
                        <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Notes</h3>
                    </div>

                    <div className="w-full">
                        {notes.length === 0 ? (
                            <div className="glass p-16 text-center rounded-xl border-dashed border-white/10 flex flex-col items-center">
                                <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mb-6 shadow-inner border border-white/5 -rotate-3">
                                    <FileText className="w-10 h-10 text-emerald-500/70" />
                                </div>
                                <h3 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">No notes yet</h3>
                                <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-8">
                                    Add your first note to start building your knowledge base.
                                </p>
                                <button
                                    onClick={() => setShowNoteModal(true)}
                                    className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 flex items-center gap-2 px-6 py-3 rounded-lg transition-all cursor-pointer font-semibold"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    <span>Add Your First Note</span>
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {notes.map((note) => (
                                    <div
                                        key={note.id}
                                        id={`note-${note.id}`}
                                        className="glass-panel p-5 rounded-xl border border-white/[0.06] hover:border-emerald-500/30 hover:bg-white/[0.02] cursor-pointer transition-all flex flex-col group relative overflow-hidden"
                                        onClick={() => setViewingNote(note)}
                                    >
                                        {/* Optional background glow */}
                                        <div className="absolute -right-10 -top-10 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full"></div>

                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                            <div className="flex items-start gap-3 mt-1">
                                                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <h4 className="text-[15px] font-heading font-bold text-white leading-snug break-words">
                                                    {note.title}
                                                </h4>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDeleteNote({ open: true, note });
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer shrink-0 ml-2"
                                                title="Delete Note"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="text-sm text-slate-300 line-clamp-5 leading-relaxed mb-5 flex-1 relative z-10 overflow-hidden">
                                            <div className="prose prose-sm prose-invert max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mt-0 prose-p:mb-2 prose-headings:font-bold prose-headings:text-white prose-headings:m-0 prose-headings:mb-1.5 prose-h1:text-[15px] prose-h2:text-[14px] prose-h3:text-[13px] prose-a:text-indigo-400 prose-code:text-emerald-300 prose-code:bg-emerald-500/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm, remarkMath]}
                                                    rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }]]}
                                                >
                                                    {preprocessMarkdown(note.content)}
                                                </ReactMarkdown>
                                            </div>
                                        </div>



                                        <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between pt-3 border-t border-white/[0.06] mt-auto relative z-10">
                                            <span>
                                                {new Date(note.created_at).toLocaleDateString(undefined, {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                            {note.question_id && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigateToQuestion(note.question_id);
                                                    }}
                                                    className="flex items-center gap-1 hover:text-indigo-400 transition-colors cursor-pointer text-[12px]"
                                                >
                                                    <LinkIcon className="w-3.5 h-3.5" />
                                                    <span>Source Question</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubjectDetail;
