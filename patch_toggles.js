const fs = require('fs');

const path = 'src/components/ProjectToggles.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add settings section with export/sync options
content = content.replace(
  "export default function ProjectToggles() {",
  `export default function ProjectToggles() {
  const handleExportiCal = () => {
    window.open('/api/calendar/export', '_blank');
  };
  const handleGcalSync = () => {
    alert("Direct API sync to Google Calendar is currently a stub. Check GCAL_OAUTH_SETUP.md to enable this feature.");
  };`
);

const settingsSection = `
      {/* Settings & Export */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Settings & Export
        </h3>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleExportiCal}
            className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors text-sm font-medium flex items-center justify-between"
          >
            Download .ics Calendar
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          </button>

          <button
            onClick={handleGcalSync}
            className="w-full text-left px-4 py-3 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-500/20 text-blue-100 rounded-xl transition-colors text-sm font-medium flex items-center justify-between"
          >
            Direct Sync to Google Cal
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.27l-3.26-1.5M2 22l10-10"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}`;

content = content.replace(
  "</div>\n  );\n}",
  settingsSection
);

fs.writeFileSync(path, content, 'utf8');

let toggles = fs.readFileSync('src/components/ProjectToggles.tsx', 'utf8');

// We need to add a button to ProjectToggles to trigger the classification per project
if (!toggles.includes('classifyProject')) {
  // Add state to track which project is classifying
  toggles = toggles.replace(
    'export default function ProjectToggles() {',
    `import { useState } from 'react';\n\nexport default function ProjectToggles() {\n  const [classifyingProjectId, setClassifyingProjectId] = useState<string | null>(null);\n\n  const classifyProject = async (projectId: string) => {\n    setClassifyingProjectId(projectId);\n    try {\n      const res = await fetch('/api/classify', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ projectId }),\n      });\n      const data = await res.json();\n      if (res.ok) {\n        alert(\`Classified \${data.count} events successfully.\`);\n        window.location.reload();\n      } else {\n        alert('Error: ' + data.error);\n      }\n    } catch (err) {\n      alert('Failed to classify events.');\n    } finally {\n      setClassifyingProjectId(null);\n    }\n  };\n`
  );

  // Add the button near the ACTIVE/MUTED button
  toggles = toggles.replace(
    '{project.isActive ? \'ACTIVE (ON)\' : \'MUTED (OFF)\'}',
    '{project.isActive ? \'ACTIVE (ON)\' : \'MUTED (OFF)\'}'
  );

  toggles = toggles.replace(
    '<button\n                  onClick={() => toggleProject(project.id)}\n                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${',
    `<button\n                  onClick={() => classifyProject(project.id)}\n                  disabled={classifyingProjectId === project.id}\n                  className="mr-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-indigo-600/20 text-indigo-400 border border-indigo-500/50 hover:bg-indigo-600/40"\n                >\n                  {classifyingProjectId === project.id ? 'AI...' : 'AI Classify'}\n                </button>\n                <button\n                  onClick={() => toggleProject(project.id)}\n                  className={\`px-4 py-1.5 rounded-full text-xs font-bold transition-all \${`
  );

  fs.writeFileSync('src/components/ProjectToggles.tsx', toggles);
}
