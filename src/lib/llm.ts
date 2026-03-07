// Mock utility simulating what the Groq API will return.
import { ProjectEvent } from './store';

export async function parseEmailWithLLM(emailText: string, projectId: string): Promise<ProjectEvent> {
  // In reality, we POST `emailText` to Groq API with a strict JSON schema prompt here.
  // For the UI demonstration, we are mocking the LLM's intelligent response.

  console.log("Simulating Groq API Call parsing unstructured text...");
  console.log("Text:", emailText);

  // Simulated LLM inference
  const isAcapella = emailText.toLowerCase().includes("chorus only") || emailText.toLowerCase().includes("a cappella");
  const isConcert = emailText.toLowerCase().includes("concert");
  
  // Date inference simulation (assume tomorrow for mock)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0); // 7pm
  
  const endTime = new Date(tomorrow);
  endTime.setHours(22, 0, 0, 0); // 10pm

  return {
    id: `email-ingest-${Date.now()}`,
    projectId,
    title: isConcert ? "Performance" : (isAcapella ? "Chorus Only Rehearsal" : "Tutti Rehearsal"),
    type: isConcert ? "concert" : "rehearsal",
    startTime: tomorrow,
    endTime: endTime,
    source: "email",
    isToggled: true,
    inferredInstrumentation: {
      timpaniRequired: !isAcapella,
      percussionRequired: !isAcapella,
      notes: isAcapella 
        ? "Inferred NO percussion needed based on text containing 'chorus only'."
        : "Standard orchestration assumed. Percussion may be required.",
    }
  };
}
