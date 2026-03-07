const fs = require('fs');

const path = 'src/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add import for PendingTab
content = content.replace(
  "import { parseEmailWithLLM } from '@/lib/llm';",
  "import { parseEmailWithLLM } from '@/lib/llm';\nimport PendingTab from '@/components/PendingTab';"
);

// Add state for active tab
content = content.replace(
  "const [isProcessing, setIsProcessing] = useState(false);",
  "const [isProcessing, setIsProcessing] = useState(false);\n  const [activeTab, setActiveTab] = useState<'calendar' | 'pending'>('calendar');\n  const pendingCount = events.filter(e => e.status === 'pending').length;"
);

// Replace header section to include tab buttons
const headerReplacement = `
        <header className="flex justify-between items-center glass-panel p-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight heading-gradient">Dashboard</h2>
            <p className="text-gray-400 mt-1">Welcome back. You have 3 potential clashes this week.</p>
          </div>
          <div className="flex flex-col gap-4 items-end">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSync}
                disabled={isProcessing}
                className={\`px-4 py-2 text-sm rounded-xl transition-colors font-medium whitespace-nowrap \${
                  isProcessing
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'glass-panel text-gray-300 hover:text-white hover:bg-white/5'
                }\`}
              >
                Sync Calendar
              </button>
              <button
                onClick={toggleVoiceInput}
                disabled={isProcessing}
                className={\`px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg font-medium whitespace-nowrap \${
                  isListening
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20 text-white animate-pulse'
                    : (isProcessing
                        ? 'bg-purple-900 text-purple-300 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20 text-white')
                }\`}
              >
                {isListening ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                    Listening...
                  </>
                ) : isProcessing ? (
                  '🤖 AI Parsing...'
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3l0 0z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                    Voice Entry
                  </>
                )}
              </button>
            </div>
            <div className="flex bg-gray-900/50 rounded-lg p-1 border border-white/5">
              <button
                onClick={() => setActiveTab('calendar')}
                className={\`px-4 py-1.5 rounded-md text-sm font-medium transition-all \${
                  activeTab === 'calendar'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }\`}
              >
                Calendar
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={\`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 \${
                  activeTab === 'pending'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }\`}
              >
                Pending Review
                {pendingCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-6">
          {activeTab === 'calendar' ? (
            <>
              <CalendarView />
              <GanttView />
            </>
          ) : (
            <PendingTab />
          )}
        </div>
`;

content = content.replace(
  /<header className="flex justify-between items-center glass-panel p-6">[\s\S]*<GanttView \/>\n        <\/div>/,
  headerReplacement
);

fs.writeFileSync(path, content, 'utf8');
