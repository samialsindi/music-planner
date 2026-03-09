'use client';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/mapping');
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-mappings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Mappings exported successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export mappings');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/mapping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json)
        });

        if (res.ok) {
          toast.success('Mappings imported and applied!');
          // Refresh the page or trigger a data reload if needed
          window.location.reload();
        } else {
          throw new Error('Import failed');
        }
      } catch (err) {
        toast.error('Failed to import mappings. Ensure the JSON format is correct.');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold heading-gradient mb-2">Settings</h1>
        <p className="text-gray-400">Manage your application data and specialized tools.</p>
      </div>

      <section className="glass-panel p-8 space-y-6">
        <div className="flex items-start justify-between border-b border-white/5 pb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white">Event Mapping Tool</h2>
            <p className="text-sm text-gray-400">
              Export all iCal events and their project assignments. Use Gemini to refine the mapping, 
              then import it back to update everything in bulk.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              <button 
                onClick={handleExport}
                disabled={isExporting}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-2 text-sm font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                {isExporting ? 'Exporting...' : 'Export Mappings'}
              </button>
              
              <label className="cursor-pointer px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-all flex items-center gap-2 text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                {isImporting ? 'Importing...' : 'Import Mappings'}
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>
            
            <button 
              onClick={async () => {
                if (confirm('Randomize all project colors?')) {
                  const res = await fetch('/api/mapping', { method: 'PATCH' });
                  if (res.ok) {
                    toast.success('Colors randomized!');
                    window.location.reload();
                  }
                }
              }}
              className="w-full px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs text-gray-400"
            >
              🎨 Randomize Existing Project Colors
            </button>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-4">
          <svg className="text-blue-400 shrink-0" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <div className="text-sm text-blue-200/80 leading-relaxed">
            <strong>Pro Tip:</strong> When using Gemini to refine your mappings, ask it to output a JSON array where each object has:
            <code className="block mt-2 font-mono text-blue-300 bg-blue-900/40 p-2 rounded">
              {'{'} "uid": "...", "targetOrchestra": "...", "targetProject": "..." {'}'}
            </code>
          </div>
        </div>
      </section>
    </div>
  );
}
