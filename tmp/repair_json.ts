import * as fs from 'fs';

const filePath = 'C:/Users/samia/Downloads/2event-mappings-2026-03-09.json';
const targetPath = 'c:/Users/samia/Documents/20260307 - Music gantt etc/music-planner/tmp/repaired_mappings.json';

try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find the last complete object ending with "}"
    const lastBraceIndex = content.lastIndexOf('}');
    if (lastBraceIndex === -1) {
        throw new Error("Could not find any closing brace in JSON");
    }
    
    // Slice up to the last brace and add closing array bracket
    let repaired = content.substring(0, lastBraceIndex + 1);
    
    // If it ends with a comma (before the next partial object), remove it
    repaired = repaired.trim();
    if (repaired.endsWith(',')) {
        repaired = repaired.substring(0, repaired.length - 1);
    }
    
    // Check if it's already an array or needs a closing bracket
    if (!repaired.trim().endsWith(']')) {
        repaired += '\n]';
    }
    
    fs.writeFileSync(targetPath, repaired);
    console.log(`Repaired JSON saved to ${targetPath}`);
} catch (err) {
    console.error("Repair failed:", err);
}
