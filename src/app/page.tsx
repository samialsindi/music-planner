'use client';
import React, { useState, useRef } from 'react';
import CalendarView from '@/components/CalendarView';
import GanttView from '@/components/GanttView';
import ProjectToggles from '@/components/ProjectToggles';
import { useAppStore } from '@/lib/store';
import { parseEmailWithLLM } from '@/lib/llm';

export default function Home() {
  const { addEvent, projects, events, toggleEvent } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const processTextWithLLM = async (text: string) => {
    setIsProcessing(true);
    try {
      const newEvent = await parseEmailWithLLM(text, projects[0].id); // Default to Project 1
      await new Promise(resolve => setTimeout(resolve, 800));
      addEvent(newEvent);
      alert(`Success via Voice! Parsed: ${newEvent.title}\nInferred: ${newEvent.inferredInstrumentation?.notes}`);
    } catch (err) {
      console.error(err);
      alert("Error parsing voice input.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onstart = () => {
      setIsListening(true);
    };

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log("Captured Voice:", transcript);
      setIsListening(false);
      processTextWithLLM(transcript); // Send to LLM immediately
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech Recognition Error", event);
      setIsListening(false);
    };

    recognitionRef.current.start();
  };

  const handleNewEventSimulation = async () => {
    setIsProcessing(true);
    // Simulate parsing an unstructured email stating a chorus rehearsal tonight
    const mockEmail = "Hey, just confirming tonight's rehearsal is chorus only a cappella! See you at 8.";
    
    try {
      // Pick the second project (Mozart) to add it to just for demonstration
      const newEvent = await parseEmailWithLLM(mockEmail, projects[1].id);
      
      // Artificial delay to feel like an API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      addEvent(newEvent);
      alert(`Success! Parsed: ${newEvent.title}\nInferred: ${newEvent.inferredInstrumentation?.notes}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
      {/* Left Main Column: Visuals */}
      <div className="flex-1 flex flex-col gap-8 min-w-0">
        <header className="flex justify-between items-center glass-panel p-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight heading-gradient">Dashboard</h2>
            <p className="text-gray-400 mt-1">Welcome back. You have 3 potential clashes this week.</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleNewEventSimulation}
              disabled={isProcessing}
              className={`px-4 py-2 text-sm rounded-xl transition-colors font-medium whitespace-nowrap ${
                isProcessing 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'glass-panel text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Simulate Email
            </button>

            <button 
              onClick={toggleVoiceInput}
              disabled={isProcessing}
              className={`px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg font-medium whitespace-nowrap ${
                isListening 
                  ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20 text-white animate-pulse' 
                  : (isProcessing 
                      ? 'bg-purple-900 text-purple-300 cursor-not-allowed' 
                      : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20 text-white')
              }`}
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
        </header>

        <div className="flex flex-col gap-6">
          <CalendarView />
          <GanttView />
        </div>
      </div>

      {/* Right Sidebar Column: Toggles */}
      <div className="w-full lg:w-[400px] shrink-0">
        <ProjectToggles />
      </div>
    </div>
  );
}
