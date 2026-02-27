import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subjectsApi, analyticsApi } from '../api/index.js';
import SubjectCard from '../components/SubjectCard.jsx';
import SubjectModal from '../components/modals/SubjectModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import toast from 'react-hot-toast';
import { BookOpen, Target, Activity, CheckCircle2, AlertTriangle, PlusCircle, LayoutDashboard, TrendingUp, ArrowUpRight } from 'lucide-react';

/* ── Mini sparkline-style progress bar ─────────────────────── */
const MiniProgressBar = ({ value, max, colorClass = 'bg-primary' }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-3">
            <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
};

/* ── Stat Card ─────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, icon: Icon, colorClass, delayClass, trend, progressValue, progressMax, progressColor }) => (
    <div className={`glass-card glass p-6 min-h-[150px] flex flex-col justify-between fade-in ${delayClass} relative overflow-hidden group`}>
        {/* Subtle Background Glow */}
        <div className={`absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-3xl opacity-[0.07] group-hover:opacity-[0.14] transition-opacity duration-500 ${colorClass.split(' ')[0].replace('text-', 'bg-')}`} />

        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-3 rounded-xl border border-white/5 bg-white/[0.04] shadow-inner ${colorClass}`}>
                <Icon className="w-5 h-5" strokeWidth={2.2} />
            </div>
            {trend && (
                <div className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${trend.startsWith('+') ? 'text-emerald-400 bg-emerald-500/10' : trend === '--' ? 'text-slate-500 bg-white/5' : 'text-red-400 bg-red-500/10'}`}>
                    {trend !== '--' && <ArrowUpRight className="w-3 h-3" />}
                    {trend}
                </div>
            )}
        </div>
        <div className="relative z-10">
            <p className="text-3xl font-heading font-bold text-slate-100 tracking-tight">{value}</p>
            <p className="text-[13px] font-medium text-slate-400 mt-1">{label}</p>
            {sub && <p className="text-[11px] font-medium text-slate-500 mt-1.5 uppercase tracking-wider">{sub}</p>}
            {progressValue != null && progressMax != null && (
                <MiniProgressBar value={progressValue} max={progressMax} colorClass={progressColor || 'bg-primary'} />
            )}
        </div>
    </div>
);

const Dashboard = () => {
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [statsMap, setStatsMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, name: '' });

    useEffect(() => {
        const load = async () => {
            try {
                const { subjects: subs } = await subjectsApi.list();
                setSubjects(subs);

                const entries = await Promise.allSettled(
                    subs.map(async (s) => {
                        const data = await analyticsApi.overview(s.id);
                        return [s.id, data.overview];
                    }),
                );

                const map = {};
                entries.forEach((r) => {
                    if (r.status === 'fulfilled') {
                        const [id, stats] = r.value;
                        map[id] = stats;
                    }
                });
                setStatsMap(map);
            } catch {
                // silently fail
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSubjectSaved = (subject, isEditing) => {
        if (isEditing) {
            setSubjects((prev) => prev.map((s) => (s.id === subject.id ? subject : s)));
        } else {
            setSubjects((prev) => [subject, ...prev]);
        }
    };

    const handleDelete = async () => {
        const { id, name } = confirmDelete;
        const loadingToast = toast.loading(`Deleting ${name}...`);
        try {
            await subjectsApi.delete(id);
            setSubjects((prev) => prev.filter((s) => s.id !== id));
            toast.success(`${name} deleted`, { id: loadingToast });
        } catch {
            toast.error('Failed to delete subject', { id: loadingToast });
        } finally {
            setConfirmDelete({ open: false, id: null, name: '' });
        }
    };

    const totalSessions = Object.values(statsMap).reduce((a, s) => a + (s?.totalSessions || 0), 0);
    const totalQuestions = Object.values(statsMap).reduce((a, s) => a + (s?.totalQuestions || 0), 0);
    const totalCorrect = Object.values(statsMap).reduce((a, s) => a + (s?.totalCorrect || 0), 0);
    const globalAccuracy = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(1) : '--';

    const weakSubjects = subjects
        .filter((s) => statsMap[s.id]?.accuracy != null && statsMap[s.id].totalQuestions > 0 && statsMap[s.id].accuracy < 75)
        .sort((a, b) => (statsMap[a.id]?.accuracy ?? 100) - (statsMap[b.id]?.accuracy ?? 100))
        .slice(0, 3);

    return (
        <div className="fade-in max-w-6xl mx-auto">
            <ConfirmDialog
                isOpen={confirmDelete.open}
                title="Delete Subject"
                message={`Are you sure you want to delete "${confirmDelete.name}"? This will permanently remove all topics, sessions, and performance data associated with it.`}
                confirmText="Delete Subject"
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete({ open: false, id: null, name: '' })}
            />

            <SubjectModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                editingSubject={editingSubject}
                onSubjectSaved={handleSubjectSaved}
            />

            {/* Header */}
            <div className="flex items-end justify-between mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <LayoutDashboard className="w-5 h-5 text-primary" />
                        <span className="text-[11px] font-bold tracking-widest text-primary uppercase">Overview</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-heading font-bold text-white tracking-tight">Dashboard</h1>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">Your learning performance at a glance.</p>
                </div>
            </div>

            {/* Global Stats Grid — 4 even columns */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                <StatCard
                    delayClass="stagger-1"
                    label="Total Subjects"
                    value={subjects.length}
                    icon={BookOpen}
                    colorClass="text-primary"
                    trend={subjects.length > 0 ? `${subjects.length} active` : '--'}
                    progressValue={subjects.length}
                    progressMax={Math.max(subjects.length, 5)}
                    progressColor="bg-primary"
                />
                <StatCard
                    delayClass="stagger-2"
                    label="Study Sessions"
                    value={totalSessions}
                    icon={Activity}
                    colorClass="text-blue-400"
                    trend={totalSessions > 0 ? `${totalSessions} total` : '--'}
                    progressValue={totalSessions}
                    progressMax={Math.max(totalSessions, 10)}
                    progressColor="bg-blue-400"
                />
                <StatCard
                    delayClass="stagger-3"
                    label="Questions Attempted"
                    value={totalQuestions}
                    icon={Target}
                    colorClass="text-indigo-400"
                    trend={totalQuestions > 0 ? `${totalCorrect} correct` : '--'}
                    progressValue={totalCorrect}
                    progressMax={Math.max(totalQuestions, 1)}
                    progressColor="bg-indigo-400"
                />
                <StatCard
                    delayClass="stagger-4"
                    label="Global Accuracy"
                    value={globalAccuracy === '--' ? '--' : `${globalAccuracy}%`}
                    sub={totalQuestions > 0 ? `${totalCorrect} correct answers` : null}
                    icon={CheckCircle2}
                    colorClass={globalAccuracy >= 75 ? 'text-emerald-400' : globalAccuracy >= 50 ? 'text-amber-400' : 'text-red-400'}
                    progressValue={totalCorrect}
                    progressMax={Math.max(totalQuestions, 1)}
                    progressColor={globalAccuracy >= 75 ? 'bg-emerald-400' : globalAccuracy >= 50 ? 'bg-amber-400' : 'bg-red-400'}
                />
            </div>

            {/* Weak areas spotlight with amber glow */}
            {weakSubjects.length > 0 && (
                <div className="mb-10 fade-in stagger-3">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                        </div>
                        <h2 className="text-xl font-heading font-bold text-white tracking-tight">Needs Attention</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 rounded-2xl border border-amber-500/10 bg-amber-500/[0.02]">
                        {weakSubjects.map((s) => (
                            <SubjectCard
                                key={s.id}
                                subject={s}
                                stats={statsMap[s.id]}
                                variant="attention"
                                onEdit={(subj) => {
                                    setEditingSubject(subj);
                                    setShowModal(true);
                                }}
                                onDelete={(subj) => setConfirmDelete({ open: true, id: subj.id, name: subj.name })}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* All subjects */}
            <div className="fade-in stagger-4 pb-12">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-heading font-bold text-white tracking-tight">Active Subjects</h2>
                </div>
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="glass p-6 animate-pulse h-[140px] rounded-xl border-white/5" />
                        ))}
                    </div>
                ) : subjects.length === 0 ? (
                    <div className="glass-panel rounded-xl p-12 text-center border-dashed border-primary/30 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-primary/20 pulse-ring">
                            <BookOpen className="w-10 h-10 text-primary" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">No subjects yet</h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                            Create your first subject to start tracking your revision performance and unlocking AI insights.
                        </p>
                        <button
                            onClick={() => navigate('/subjects?new=1')}
                            className="btn-primary flex items-center gap-2 mx-auto px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer"
                        >
                            <PlusCircle className="w-4 h-4" />
                            <span>Create Subject</span>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {subjects.map((s) => (
                            <SubjectCard
                                key={s.id}
                                subject={s}
                                stats={statsMap[s.id]}
                                onEdit={(subj) => {
                                    setEditingSubject(subj);
                                    setShowModal(true);
                                }}
                                onDelete={(subj) => setConfirmDelete({ open: true, id: subj.id, name: subj.name })}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
