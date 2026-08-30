import React, { useState } from 'react';
import { Wrench, Search, X, Zap, Code, Cpu, Youtube } from 'lucide-react';
import ToolCard from '../components/tools/ToolCard.jsx';
import ToolDetailsCard from '../components/tools/ToolDetailsCard.jsx';
import YouTubeTranscriptTool from '../components/tools/YouTubeTranscriptTool.jsx';
import QuizGeneratorTool from '../components/tools/QuizGeneratorTool.jsx';
import TimeTablePlannerTool from '../components/tools/TimeTablePlannerTool.jsx';
import { ArrowLeft, FileQuestion, CalendarClock } from 'lucide-react';

const TOOLS = [
    {
        id: 'youtube-transcript',
        name: "YouTube Transcript Generator",
        description: "Fetch transcripts from YouTube videos and format them for AI processing with custom system prompts.",
        icon: Youtube,
        tag: "Utility",
        isActive: true
    },
    {
        id: 'quiz-generator',
        name: "Quiz Generator",
        description: "Upload Excel sheets to generate interactive GATE-style quizzes with question navigation.",
        icon: FileQuestion,
        tag: "Utility",
        isActive: true
    },
    {
        id: 'time-table-planner',
        name: "Time Table Planner",
        description: "Organize your study sessions with a 24-hour visual gantt chart.",
        icon: CalendarClock,
        tag: "Utility",
        isActive: true
    }
];

const Tools = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTool, setSelectedTool] = useState(null);
    const [toolSubView, setToolSubView] = useState('list');
    const [backSignal, setBackSignal] = useState(0);

    const filteredTools = TOOLS.filter(tool =>
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedTool) {
        return (
            <div className="fade-in">
                {/* Tool Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => {
                                if (toolSubView === 'editor') {
                                    setBackSignal(s => s + 1);
                                } else {
                                    setSelectedTool(null);
                                }
                            }}
                            className="p-2.5 rounded-xl bg-surface-2 border border-border text-text-muted hover:text-primary hover:border-primary/30 transition-all cursor-pointer group"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <selectedTool.icon className="w-4 h-4 text-primary" />
                                <span className="text-[10px] font-bold tracking-widest text-primary uppercase">Tool</span>
                            </div>
                            <h1 className="text-xl sm:text-2xl font-heading font-bold text-text tracking-tight">{selectedTool.name}</h1>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-wider">
                            {selectedTool.tag}
                        </span>
                    </div>
                </div>

                {/* Tool Content */}
                <div className="glass-panel rounded-3xl border border-border p-8 min-h-[70vh]">
                    {selectedTool.id === 'youtube-transcript' ? (
                        <YouTubeTranscriptTool />
                    ) : selectedTool.id === 'quiz-generator' ? (
                        <QuizGeneratorTool />
                    ) : selectedTool.id === 'time-table-planner' ? (
                        <TimeTablePlannerTool onViewChange={setToolSubView} backSignal={backSignal} />
                    ) : (
                        <ToolDetailsCard 
                            tool={selectedTool} 
                            onClose={() => setSelectedTool(null)}
                            inline={true} // New prop to handle inline display
                        />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Wrench className="w-5 h-5 text-primary" />
                        <span className="text-[11px] font-bold tracking-widest text-primary uppercase">Utilities</span>
                    </div>
                    <h1 className="text-3xl font-heading font-bold text-text tracking-tight">Study Tools</h1>
                    <p className="text-text-muted text-sm mt-1.5">
                        Enhance your revision experience with powerful built-in tools
                    </p>
                </div>

                <div className="relative group w-full sm:w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tools..."
                        className="bg-surface-2/50 border border-border rounded-xl py-2.5 sm:py-2 pl-10 pr-4 text-[13px] text-text w-full focus:outline-none focus:border-primary/40 focus:bg-surface-2 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Grid */}
            {filteredTools.length === 0 ? (
                <div className="glass-panel rounded-xl p-16 text-center border-dashed border-primary/20 w-full">
                    <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <Wrench className="w-10 h-10 text-primary" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-heading font-bold text-text mb-3">No tools found</h3>
                    <p className="text-text-muted text-sm max-w-sm mx-auto">
                        Try adjusting your search query to find the tool you're looking for.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTools.map((tool) => (
                        <ToolCard
                            key={tool.id}
                            tool={tool}
                            onClick={setSelectedTool}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Tools;
