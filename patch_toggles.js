const fs = require('fs');

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
