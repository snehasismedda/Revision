import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Target,
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    Calendar,
    CheckSquare,
    XSquare,
    Search,
    ChevronDown,
} from "lucide-react";
import * as testsApi from "../api/testsApi";
import * as testSeriesApi from "../api/testSeriesApi";
import { topicsApi } from "../api";
import toast from "react-hot-toast";

/* Flatten nested topics helper */
const flattenTopics = (nodes, depth = 0) => {
    const flat = [];
    nodes?.forEach((n) => {
        flat.push({
            id: n.id,
            name: n.name,
            depth,
            parentId: n.parent_id || n.parentId,
        });
        if (n.children?.length) flat.push(...flattenTopics(n.children, depth + 1));
    });
    return flat;
};

// Searchable Multi-Select Component for Topics
const TopicMultiSelect = ({ options, value = [], onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = options.filter((o) =>
        o.name.toLowerCase().includes(search.toLowerCase()),
    );

    const toggleOption = (id) => {
        if (value.includes(id)) {
            onChange(value.filter((v) => v !== id));
        } else {
            onChange([...value, id]);
        }
    };

    return (
        <div className="relative flex-[2] min-w-[200px]" ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-10 px-3 bg-[#0f0f1a] border border-white/10 rounded-lg text-sm text-white flex items-center justify-between cursor-pointer hover:border-pink-500/50"
            >
                <span className="truncate pr-2 text-slate-300">
                    {value.length === 0 ? "Select Topics..." : `${value.length} selected`}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-white/5 relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search topics..."
                            className="w-full bg-[#0f0f1a] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-500 text-center">
                                No topics found
                            </div>
                        ) : (
                            filtered.map((t) => (
                                <div
                                    key={t.id}
                                    onClick={() => toggleOption(t.id)}
                                    className="px-2 py-1.5 hover:bg-white/[0.03] rounded-lg cursor-pointer flex items-center gap-2 transition-colors"
                                >
                                    <div
                                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${value.includes(t.id)
                                            ? "bg-pink-500 border-pink-500"
                                            : "border-white/20 bg-black/20"
                                            }`}
                                    >
                                        {value.includes(t.id) && (
                                            <CheckSquare className="w-3 h-3 text-white" />
                                        )}
                                    </div>
                                    <span className="text-sm text-slate-300 truncate">
                                        {"\u00A0".repeat(t.depth * 2)}
                                        {t.name}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const TestDetail = () => {
    const { seriesId, testId } = useParams();
    const navigate = useNavigate();

    const [series, setSeries] = useState(null);
    const [testData, setTestData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [topicsBySubject, setTopicsBySubject] = useState({});

    // Result form state
    const [myScore, setMyScore] = useState("");
    const [totalScore, setTotalScore] = useState("");
    const [totalQs, setTotalQs] = useState("");

    // Array of { id, subject_id, topic_ids: [], is_correct }
    const [questions, setQuestions] = useState([]);

    const [saving, setSaving] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const [seriesRes, testRes] = await Promise.all([
                testSeriesApi.getTestSeriesDetail(seriesId),
                testsApi.getTestDetail(seriesId, testId),
            ]);

            setSeries(seriesRes.series);
            setTestData(testRes.test);

            // DO NOT prepopulate form, keep it clean for new attempt.
            // testRes.test.results holds historic data.

            // Load topics for all subjects in the test
            const topicsMap = {};
            if (testRes.test.subjects) {
                for (const sub of testRes.test.subjects) {
                    try {
                        const topRes = await topicsApi.list(sub.id);
                        topicsMap[sub.id] = flattenTopics(topRes.topics || []);
                    } catch (e) {
                        console.error("Failed fetching topics for subject", sub.id);
                    }
                }
            }
            setTopicsBySubject(topicsMap);
        } catch (error) {
            console.error("Failed to load test detail", error);
            toast.error("Failed to load test info");
            navigate(`/tests/${seriesId}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [testId]);

    const handleAddQuestion = () => {
        const defaultSubjectId = testData?.subjects?.[0]?.id || "";
        setQuestions((prev) => [
            ...prev,
            {
                id: `q-${Date.now()}-${Math.random()}`,
                subject_id: defaultSubjectId,
                topic_ids: [],
                is_correct: true,
            },
        ]);
    };

    const handleUpdateQuestion = (id, field, value) => {
        setQuestions((prev) =>
            prev.map((q) => {
                if (q.id === id) {
                    const updated = { ...q, [field]: value };
                    // If subject changes, reset selected topics
                    if (field === "subject_id") updated.topic_ids = [];
                    return updated;
                }
                return q;
            }),
        );
    };

    const handleRemoveQuestion = (id) => {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
    };

    const handleSaveResults = async () => {
        if (!myScore || !totalScore || !totalQs) {
            return toast.error(
                "Please fill out the score and total questions fields",
            );
        }

        // We can allow blank questions if they only want to tag some.
        // But if they tagged a subject, they must have at least one topic inside if they interacted with it?
        // Let's just filter out half-empty ones, or strictly validate:
        const invalidQ = questions.find(
            (q) => !q.subject_id || q.topic_ids.length === 0,
        );
        if (invalidQ && questions.length > 0) {
            return toast.error(
                "Please select a subject and at least one topic for all added questions",
            );
        }

        setSaving(true);
        const loadingToast = toast.loading("Saving results...");

        try {
            const payload = {
                myScore: Number(myScore),
                totalScore: Number(totalScore),
                totalQs: Number(totalQs),
                questions: questions.map((q) => ({
                    subject_id: q.subject_id,
                    topic_ids: q.topic_ids,
                    is_correct: q.is_correct,
                })),
            };

            const dummySubjectId =
                testData?.subjects?.[0]?.id || "00000000-0000-0000-0000-000000000000";

            await testsApi.submitTestResult(
                seriesId,
                testId,
                dummySubjectId,
                payload,
            );

            toast.success("Attempt logged successfully!", { id: loadingToast });
            // Reset form instead of navigating away immediately, so they see it added below
            setMyScore("");
            setTotalQs("");
            setQuestions([]);
            loadData(); // Reload to fetch newest history
        } catch (error) {
            toast.error("Failed to save results", { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    if (loading || !testData || !series) {
        return (
            <div className="flex-1 flex items-center justify-center h-[100dvh]">
                <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 min-w-0 flex flex-col h-[100dvh]">
            <header className="flex-shrink-0 border-b border-white/5 bg-[#0f0f1a]/80 backdrop-blur-md sticky top-0 z-20">
                <div className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(`/tests/${seriesId}`)}
                            className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition-colors border border-white/10"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-300" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded bg-pink-500/10 flex items-center justify-center">
                                    <Target className="w-3.5 h-3.5 text-pink-400" />
                                </div>
                                <h1 className="text-xl font-heading font-bold text-white leading-tight">
                                    {testData.name}{" "}
                                    <span className="opacity-50 font-medium text-lg ml-2">
                                        {series.name}
                                    </span>
                                </h1>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Calendar className="w-4 h-4 text-emerald-400" />
                                <span>{new Date(testData.test_date).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto w-full p-6">
                <div className="max-w-[1000px] mx-auto space-y-6">
                    {/* Marks Entry block */}
                    <div className="glass p-6 rounded-3xl border border-white/10 shadow-xl">
                        <h2 className="text-lg font-heading font-semibold text-white mb-6">
                            Test Score
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">
                                    Total Possible Score
                                </label>
                                <input
                                    type="number"
                                    value={totalScore}
                                    onChange={(e) => setTotalScore(e.target.value)}
                                    className="w-full h-11 px-4 bg-white/[0.03] border border-white/10 rounded-xl text-white text-lg focus:outline-none focus:border-pink-500/50 transition-colors"
                                    placeholder="e.g. 100"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">
                                    Your Score Achieved
                                </label>
                                <input
                                    type="number"
                                    value={myScore}
                                    onChange={(e) => setMyScore(e.target.value)}
                                    className="w-full h-11 px-4 bg-emerald-500/[0.05] border border-emerald-500/20 rounded-xl text-emerald-400 text-lg font-bold focus:outline-none focus:border-emerald-500/50 transition-colors"
                                    placeholder="e.g. 85"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">
                                    Total Questions Attempted
                                </label>
                                <input
                                    type="number"
                                    value={totalQs}
                                    onChange={(e) => setTotalQs(e.target.value)}
                                    // Auto-generate empty fields based on expected total questions

                                    onBlur={(e) => {
                                        const count = parseInt(e.target.value) || 0;
                                        if (count === questions.length) return;
                                        if (count < questions.length) {
                                            if (window.confirm(`This will remove the last ${questions.length - count} questions. Continue?`)) {
                                                setQuestions(prev => prev.slice(0, count));
                                            } else {
                                                setTotalQs(questions.length.toString());
                                            }
                                        } else {
                                            const defaultSubjectId = testData?.subjects?.[0]?.id || "";
                                            const needed = count - questions.length;
                                            const newQs = [];
                                            for (let i = 0; i < needed; i++) {
                                                newQs.push({
                                                    id: `q-${Date.now()}-${Math.random()}-${questions.length + i}`,
                                                    subject_id: defaultSubjectId,
                                                    topic_ids: [],
                                                    is_correct: true,
                                                });
                                            }
                                            setQuestions(prev => [...prev, ...newQs]);
                                        }
                                    }}

                                    className="w-full h-11 px-4 bg-white/[0.03] border border-white/10 rounded-xl text-white text-lg focus:outline-none focus:border-pink-500/50 transition-colors"
                                    placeholder="e.g. 25"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Question Breakdown Block */}
                    <div className="glass p-6 rounded-3xl border border-white/10 shadow-xl space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-heading font-semibold text-white">
                                    Question Breakdown
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    Tag multiple topics per question to fuel your global subject
                                    analytics
                                </p>
                            </div>
                            <button
                                onClick={handleAddQuestion}
                                className="h-10 px-4 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 font-medium text-sm transition-colors border border-pink-400/20 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add Question
                            </button>
                        </div>

                        <div className="space-y-3">
                            {questions.length === 0 ? (
                                <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-2xl">
                                    <p className="text-slate-500 text-sm">
                                        No questions added yet.
                                        <br />
                                        Type in Total Questions to automatically generate fields, or
                                        click above.
                                    </p>
                                </div>
                            ) : (
                                questions.map((q, index) => {
                                    const availableTopics = topicsBySubject[q.subject_id] || [];
                                    return (
                                        <div
                                            key={q.id}
                                            className="flex flex-col sm:flex-row gap-3 items-center bg-white/[0.02] border border-white/10 p-3 rounded-xl hover:border-pink-500/30 transition-colors"
                                        >
                                            <span className="text-xs font-bold text-slate-500 w-6">
                                                Q{index + 1}
                                            </span>

                                            <select
                                                value={q.subject_id}
                                                onChange={(e) =>
                                                    handleUpdateQuestion(
                                                        q.id,
                                                        "subject_id",
                                                        e.target.value,
                                                    )
                                                }
                                                className="flex-1 min-w-[140px] h-10 px-3 bg-[#0f0f1a] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-pink-500/50 custom-select"
                                            >
                                                <option value="" disabled>
                                                    Select Subject
                                                </option>
                                                {testData.subjects?.map((s) => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.name}
                                                    </option>
                                                ))}
                                            </select>

                                            <TopicMultiSelect
                                                options={availableTopics}
                                                value={q.topic_ids}
                                                onChange={(newVal) =>
                                                    handleUpdateQuestion(q.id, "topic_ids", newVal)
                                                }
                                            />

                                            <button
                                                onClick={() =>
                                                    handleUpdateQuestion(
                                                        q.id,
                                                        "is_correct",
                                                        !q.is_correct,
                                                    )
                                                }
                                                className={`w-[120px] h-10 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${q.is_correct
                                                    ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                                                    : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                                                    }`}
                                            >
                                                {q.is_correct ? (
                                                    <CheckSquare className="w-4 h-4" />
                                                ) : (
                                                    <XSquare className="w-4 h-4" />
                                                )}
                                                {q.is_correct ? "Correct" : "Incorrect"}
                                            </button>

                                            <button
                                                onClick={() => handleRemoveQuestion(q.id)}
                                                className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleSaveResults}
                        disabled={saving || !totalScore || !myScore || !totalQs}
                        className="w-full h-14 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-semibold flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:grayscale shadow-[0_4px_20px_-5px_rgba(236,72,153,0.4)]"
                    >
                        <Save className="w-5 h-5" />
                        <span className="text-lg">Log This Attempt</span>
                    </button>

                    {/* Past Attempts Section */}
                    {testData.results && testData.results.length > 0 && (
                        <div className="mt-12 space-y-4">
                            <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                                Past Attempts <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/70">{testData.results.length}</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {testData.results.map((result, idx) => {
                                    const percent = Math.round((result.my_score / result.total_score) * 100) || 0;
                                    const attemptNumber = testData.results.length - idx;

                                    return (
                                        <div key={result.id} className="glass p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-pink-500/50"></div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-xs text-slate-400 font-medium">Attempt #{attemptNumber}</p>
                                                    <p className="text-sm font-semibold text-white mt-0.5">{new Date(result.created_at).toLocaleDateString()}</p>
                                                </div>
                                                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-sm">
                                                    {percent}%
                                                </div>
                                            </div>

                                            <div className="flex items-end gap-2 mb-4 mt-2">
                                                <span className="text-3xl font-heading font-bold text-white leading-none">{result.my_score}</span>
                                                <span className="text-sm text-slate-400 font-medium mb-1">/ {result.total_score}</span>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <div className="w-1.5 h-1.5 rounded-full bg-pink-500/50"></div>
                                                {result.total_qs} Questions Attempted
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TestDetail;
