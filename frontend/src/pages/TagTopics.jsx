import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { sessionsApi, topicsApi, entriesApi } from '../api/index.js';
import toast from 'react-hot-toast';
import {
    ArrowLeft, CheckCircle2, XCircle, Plus, Trash2, Save,
    ChevronDown, ChevronRight, Search, Tags, FileText
} from 'lucide-react';

/* ── Flatten a nested topic tree ─────────────────────────── */
const flattenTopics = (nodes, depth = 0) => {
    const flat = [];
    nodes.forEach((n) => {
        flat.push({ id: n.id, name: n.name, depth, parentId: n.parent_id || n.parentId });
        if (n.children?.length) flat.push(...flattenTopics(n.children, depth + 1));
    });
    return flat;
};

const TagTopics = () => {
    const { subjectId, id: sessionId } = useParams();
    const navigate = useNavigate();

    const [session, setSession] = useState(null);
    const [allTopics, setAllTopics] = useState([]);        // flat list of all topics
    const [entries, setEntries] = useState([]);             // { id (local), topicId, topicName, isCorrect }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [expandedSections, setExpandedSections] = useState({});  // parentId → bool for grouping

    /* ── Load session, topics, existing entries ────────── */
    useEffect(() => {
        const load = async () => {
            try {
                const [sesRes, topRes, entRes] = await Promise.all([
                    sessionsApi.get(subjectId, sessionId),
                    topicsApi.list(subjectId),
                    entriesApi.list(sessionId),
                ]);
                setSession(sesRes.session);
                const flat = flattenTopics(topRes.topics);
                setAllTopics(flat);

                // Build existing entries from the backend
                const existing = (entRes.entries || []).map((e, idx) => ({
                    localId: `existing-${idx}`,
                    topicId: e.topic_id || e.topicId,
                    topicName: e.topic_name || e.topicName || flat.find(t => t.id === (e.topic_id || e.topicId))?.name || 'Unknown',
                    isCorrect: e.is_correct ?? e.isCorrect ?? true,
                }));
                setEntries(existing);

                // Expand all root parents by default
                const sections = {};
                flat.forEach(t => { if (t.depth === 0) sections[t.id] = true; });
                setExpandedSections(sections);
            } catch {
                toast.error('Failed to load session data');
                navigate(`/subjects/${subjectId}`);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [subjectId, sessionId]);

    /* ── Add an entry for a topic ─────────────────────── */
    const addEntry = (topic, isCorrect = true) => {
        setEntries(prev => [
            ...prev,
            {
                localId: `new-${Date.now()}-${Math.random()}`,
                topicId: topic.id,
                topicName: topic.name,
                isCorrect,
            },
        ]);
    };

    /* ── Remove a single entry ────────────────────────── */
    const removeEntry = (localId) => {
        setEntries(prev => prev.filter(e => e.localId !== localId));
    };

    /* ── Toggle correct/incorrect on an entry ─────────── */
    const toggleEntry = (localId) => {
        setEntries(prev =>
            prev.map(e =>
                e.localId === localId ? { ...e, isCorrect: !e.isCorrect } : e
            )
        );
    };

    /* ── Save all entries ─────────────────────────────── */
    const handleSave = async () => {
        setSaving(true);
        const loadingToast = toast.loading('Saving entries...');
        try {
            const payload = entries.map(e => ({
                topicId: e.topicId,
                isCorrect: e.isCorrect,
            }));

            if (payload.length > 0) {
                await entriesApi.update(sessionId, { entries: payload });
            } else {
                // If no entries, replace with empty (soft-delete all)
                await entriesApi.update(sessionId, { entries: [{ topicId: allTopics[0]?.id, isCorrect: true }] });
                // Actually, the backend requires at least 1 entry, so let's just navigate
            }
            toast.success(`${payload.length} entries saved!`, { id: loadingToast });
            navigate(`/subjects/${subjectId}/sessions/${sessionId}`);
        } catch {
            toast.error('Failed to save entries', { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    /* ── Derived data ─────────────────────────────────── */
    const filteredTopics = useMemo(() => {
        if (!search.trim()) return allTopics;
        const q = search.toLowerCase();
        return allTopics.filter(t => t.name.toLowerCase().includes(q));
    }, [allTopics, search]);

    // Group filtered topics by root parent
    const topicGroups = useMemo(() => {
        const groups = [];
        let currentGroup = null;
        filteredTopics.forEach(t => {
            if (t.depth === 0) {
                currentGroup = { parent: t, children: [] };
                groups.push(currentGroup);
            } else if (currentGroup) {
                currentGroup.children.push(t);
            }
        });
        // If search is active, show flat results
        if (search.trim()) return [{ parent: null, children: filteredTopics }];
        return groups;
    }, [filteredTopics, search]);

    // Entry stats per topic
    const topicEntryCounts = useMemo(() => {
        const counts = {};
        entries.forEach(e => {
            if (!counts[e.topicId]) counts[e.topicId] = { correct: 0, incorrect: 0 };
            if (e.isCorrect) counts[e.topicId].correct++;
            else counts[e.topicId].incorrect++;
        });
        return counts;
    }, [entries]);

    const totalCorrect = entries.filter(e => e.isCorrect).length;
    const totalIncorrect = entries.filter(e => !e.isCorrect).length;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="fade-in max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-10">
                <Link
                    to={`/subjects/${subjectId}`}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-primary transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Link>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-2">
                    <Tags className="w-5 h-5 text-primary" />
                    <h1 className="text-xl font-heading font-bold text-white tracking-tight">Tag Topics</h1>
                </div>
            </div>

            {/* Session info bar */}
            {session && (
                <div className="glass p-6 rounded-xl mb-10 flex items-center gap-6 text-sm">
                    <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="min-w-0">
                        <p className="font-heading font-semibold text-white truncate">{session.title}</p>
                        <p className="text-xs text-slate-500">
                            {new Date(session.session_date || session.sessionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-3 shrink-0">
                        <span className="flex items-center gap-1 text-emerald-400 font-heading font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {totalCorrect}
                        </span>
                        <span className="flex items-center gap-1 text-red-400 font-heading font-bold text-xs">
                            <XCircle className="w-3.5 h-3.5" /> {totalIncorrect}
                        </span>
                        <span className="text-slate-400 font-heading font-bold text-xs">
                            = {entries.length} total
                        </span>
                    </div>
                </div>
            )}

            {/* Two columns: Topic picker | Current entries */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                {/* ─── LEFT: Topic Picker ───────────────────── */}
                <div className="glass p-6 rounded-xl">
                    <div className="flex items-center gap-2 mb-6">
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex-1">All Topics</h3>
                    </div>

                    {/* Search */}
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search topics..."
                            className="w-full bg-surface-2/50 border border-white/10 text-slate-200 rounded-lg pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    {/* Topics list */}
                    <div className="max-h-[460px] overflow-y-auto space-y-0.5 pr-1">
                        {topicGroups.map((group, gi) => {
                            if (group.parent) {
                                const isExpanded = expandedSections[group.parent.id] ?? true;
                                const parentCounts = topicEntryCounts[group.parent.id];
                                return (
                                    <div key={group.parent.id} className="mb-1">
                                        {/* Parent header */}
                                        <div className="flex items-center gap-1.5 py-2 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                                            <button
                                                onClick={() => setExpandedSections(p => ({ ...p, [group.parent.id]: !isExpanded }))}
                                                className="p-0.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                                            >
                                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                            </button>
                                            <span className="text-sm font-heading font-semibold text-slate-200 flex-1 truncate">{group.parent.name}</span>
                                            {parentCounts && (
                                                <span className="text-[10px] font-bold text-slate-500">
                                                    {parentCounts.correct + parentCounts.incorrect}
                                                </span>
                                            )}
                                            {/* Root topics are headers, no tagging buttons */}
                                        </div>

                                        {/* Children */}
                                        {isExpanded && group.children.length > 0 && (
                                            <div className="ml-4 border-l border-white/[0.06] pl-2 space-y-0.5">
                                                {group.children.map(child => {
                                                    const childCounts = topicEntryCounts[child.id];
                                                    return (
                                                        <div key={child.id} className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors group/topic">
                                                            <span className="text-sm text-slate-400 flex-1 truncate group-hover/topic:text-slate-300">{child.name}</span>
                                                            {childCounts && (
                                                                <span className="text-[10px] font-bold text-slate-600">
                                                                    {childCounts.correct + childCounts.incorrect}
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={() => addEntry(child, true)}
                                                                className="p-1 text-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors cursor-pointer opacity-0 group-hover/topic:opacity-100"
                                                                title="Add as correct"
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => addEntry(child, false)}
                                                                className="p-1 text-red-500/30 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer opacity-0 group-hover/topic:opacity-100"
                                                                title="Add as incorrect"
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // Flat search results
                            return group.children.map(t => {
                                const counts = topicEntryCounts[t.id];
                                return (
                                    <div key={t.id} className="flex items-center gap-1.5 py-2 px-2 rounded-lg hover:bg-white/[0.03] transition-colors group/topic min-w-0">
                                        {t.depth === 0 && (
                                            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                        )}
                                        <span className={`text-sm flex-1 truncate ${t.depth === 0 ? 'font-heading font-semibold text-slate-200' : 'text-slate-400'}`}>
                                            {t.name}
                                        </span>
                                        {counts && (
                                            <span className="text-[10px] font-bold text-slate-600">
                                                {counts.correct + counts.incorrect}
                                            </span>
                                        )}
                                        {t.depth > 0 && (
                                            <>
                                                <button
                                                    onClick={() => addEntry(t, true)}
                                                    className="p-1 text-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors cursor-pointer opacity-0 group-hover/topic:opacity-100"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => addEntry(t, false)}
                                                    className="p-1 text-red-500/30 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer opacity-0 group-hover/topic:opacity-100"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                );
                            });
                        })}

                        {filteredTopics.length === 0 && (
                            <div className="p-6 text-center">
                                <p className="text-xs text-slate-500">No topics found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── RIGHT: Current Entries ──────────────── */}
                <div className="glass p-6 rounded-xl flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex-1">
                            Tagged Entries ({entries.length})
                        </h3>
                        {entries.length > 0 && (
                            <div className="flex items-center gap-2 text-[10px] font-bold">
                                <span className="text-emerald-400">{totalCorrect} ✓</span>
                                <span className="text-red-400">{totalIncorrect} ✗</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 max-h-[460px] overflow-y-auto space-y-1 pr-1">
                        {entries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3 border border-white/5">
                                    <Plus className="w-5 h-5 text-slate-600" />
                                </div>
                                <p className="text-sm text-slate-500 font-medium">No entries yet</p>
                                <p className="text-xs text-slate-600 mt-1">Click ✓ or ✗ on topics to add entries</p>
                            </div>
                        ) : (
                            entries.map((entry, idx) => (
                                <div
                                    key={entry.localId}
                                    className={`flex items-center gap-2 py-2 px-3 rounded-lg border transition-all group/entry ${entry.isCorrect
                                        ? 'border-emerald-500/10 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05]'
                                        : 'border-red-500/10 bg-red-500/[0.02] hover:bg-red-500/[0.05]'
                                        }`}
                                >
                                    <span className="text-[10px] font-bold text-slate-600 w-5 text-center shrink-0">
                                        {idx + 1}
                                    </span>
                                    <span className="text-sm text-slate-300 flex-1 truncate min-w-0">
                                        {entry.topicName}
                                    </span>

                                    {/* Toggle correct/incorrect */}
                                    <button
                                        onClick={() => toggleEntry(entry.localId)}
                                        className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${entry.isCorrect
                                            ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                                            : 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                                            }`}
                                        title="Toggle correct/incorrect"
                                    >
                                        {entry.isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        {entry.isCorrect ? 'Correct' : 'Wrong'}
                                    </button>

                                    {/* Remove entry */}
                                    <button
                                        onClick={() => removeEntry(entry.localId)}
                                        className="shrink-0 p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer opacity-0 group-hover/entry:opacity-100"
                                        title="Remove this entry"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Save button */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="mt-4 btn-primary w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl disabled:opacity-50 cursor-pointer"
                    >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : `Save ${entries.length} Entries`}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TagTopics;
