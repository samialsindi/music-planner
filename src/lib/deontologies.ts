import { Project, Orchestra, ProjectEvent } from './store';

export const ORCH_DEONTOLOGIES = [
    'BBC Elstree Concert Band',
    'BBC Symphony Chorus',
    'Misbourne Symphony',
    'BBC Symphony Orchestra',
    'BBC Symphony',
    'London Philharmonic',
    'Royal Philharmonic'
];

export const ORCH_KEYWORDS = [
    'Concert Band', 'Symphony Chorus', 'Symphony', 'Choir', 'Chorus', 'Band', 
    'Orchestra', 'Philharmonic', 'Philharmonia', 'Sinfonia', 'Ensemble', 'Wind Band', 'Brass Band'
];

export function detectOrchestra(text: string): string | null {
    // Check direct matches first
    for (const orch of ORCH_DEONTOLOGIES) {
        if (text.toLowerCase().includes(orch.toLowerCase())) return orch;
    }
    
    // Then check keywords
    for (const kw of ORCH_KEYWORDS) {
        if (text.toLowerCase().includes(kw.toLowerCase())) {
            // Find the best "boundary" for the orchestra name
            const parts = text.split(/\s+[-/|:]\s+/);
            for (const part of parts) {
                if (part.toLowerCase().includes(kw.toLowerCase())) return part.trim();
            }
        }
    }
    return null;
}

const GARBAGE_PREFIXES = /^(Personal|other|Orchestra|Project|Event)\s*[-/|:]+\s*/i;

/**
 * Cleans an event title by stripping out garbage prefixes and the orchestra name if redundant.
 */
export function cleanEventTitle(title: string, detectedOrch?: string | null): string {
    let t = title;
    // 1. Strip the detected orchestra name
    if (detectedOrch) {
        t = t.replace(new RegExp(detectedOrch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '');
    }
    // 2. Strip garbage prefixes like "Personal - "
    t = t.replace(GARBAGE_PREFIXES, '');
    // 3. Strip leading punctuation
    t = t.replace(/^\s*[-/|:]+\s*/, '');
    
    return t.trim() || (detectedOrch || title);
}

/**
 * Applies deontologies to derive the correct Display Orchestra and Project names.
 */
export function getRemappedDetails(event: { title: string, projectId: string }, projects: Project[], orchestras: Orchestra[]) {
    const project = projects.find(p => p.id === event.projectId);
    const orchestra = project ? orchestras.find(o => o.id === project.orchestraId) : null;
    
    const combinedTitle = `${orchestra?.name || ''} - ${project?.name || ''} - ${event.title}`;
    const detected = detectOrchestra(combinedTitle) || detectOrchestra(event.title);
    
    if (detected) {
        return {
            orchName: detected,
            projName: (project?.name === 'Personal' || project?.name === 'other') ? detected : (project?.name || detected),
            eventTitle: cleanEventTitle(event.title, detected)
        };
    }
    
    return {
        orchName: orchestra?.name || 'Personal',
        projName: project?.name || 'Personal',
        eventTitle: cleanEventTitle(event.title)
    };
}
