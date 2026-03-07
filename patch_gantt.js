const fs = require('fs');
const file = 'src/components/GanttView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update default view
content = content.replace("useState<'Month' | 'Year' | 'Week' | 'Day'>('Week')", "useState<'Month' | 'Year' | 'Week' | 'Day'>('Year')");

// Add Year button to UI
const replaceButtons = `
      <div className="flex justify-end gap-2 mb-2">
        <button
          onClick={() => setViewMode('Day')}
          className={\`px-4 py-2 rounded-lg text-sm transition-colors \${viewMode === 'Day' ? 'bg-purple-600 text-white' : 'glass-panel text-gray-400 hover:text-white'}\`}
        >
          Day
        </button>
        <button
          onClick={() => setViewMode('Week')}
          className={\`px-4 py-2 rounded-lg text-sm transition-colors \${viewMode === 'Week' ? 'bg-purple-600 text-white' : 'glass-panel text-gray-400 hover:text-white'}\`}
        >
          Week
        </button>
        <button
          onClick={() => setViewMode('Month')}
          className={\`px-4 py-2 rounded-lg text-sm transition-colors \${viewMode === 'Month' ? 'bg-purple-600 text-white' : 'glass-panel text-gray-400 hover:text-white'}\`}
        >
          Month
        </button>
        <button
          onClick={() => setViewMode('Year')}
          className={\`px-4 py-2 rounded-lg text-sm transition-colors \${viewMode === 'Year' ? 'bg-purple-600 text-white' : 'glass-panel text-gray-400 hover:text-white'}\`}
        >
          Year
        </button>
      </div>
`;

content = content.replace(/<div className="flex justify-end gap-2 mb-2">[\s\S]*?<\/div>/, replaceButtons);

fs.writeFileSync(file, content);
