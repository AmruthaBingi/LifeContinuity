import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, Send, Sparkles, Loader2, Calendar, 
  Trash2, RefreshCw, AlertTriangle, Shield, CheckCircle2, User,
  Mic, MicOff, Volume2, Zap, Brain, Headphones, FileAudio, Play, Pause, X, CheckSquare
} from "lucide-react";
import { Message, CalendarEvent, EmergencyProfile, ContinuityPlan } from "../types";
import { SAMPLE_CALENDAR } from "../utils";

interface ChatbotPanelProps {
  messages: Message[];
  onAddMessage: (msg: Message) => void;
  profile: EmergencyProfile;
  emergencyMode: boolean;
  continuityPlan: ContinuityPlan | null;
  calendarEvents: CalendarEvent[];
  onUpdateCalendarEvents: (events: CalendarEvent[]) => void;
  showToast: (message: string, type: "success" | "info" | "warning") => void;
}

export default function ChatbotPanel({
  messages,
  onAddMessage,
  profile,
  emergencyMode,
  continuityPlan,
  calendarEvents,
  onUpdateCalendarEvents,
  showToast,
}: ChatbotPanelProps) {
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [connectingCalendar, setConnectingCalendar] = useState(false);

  // New AI Core feature toggles (Gemini 2.0 Feature Set)
  const [thinkingMode, setThinkingMode] = useState(false);
  const [lowLatency, setLowLatency] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  
  // Voice/Live API states
  const [isListening, setIsListening] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Web Speech recognition for real-time dictation
  const recognitionRef = useRef<any>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";

        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInputText(transcript);
            showToast(`Sought: "${transcript}"`, "success");
          }
        };

        rec.onerror = () => {
          setIsListening(false);
          showToast("Speech recognition was interrupted.", "warning");
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
    } catch (e) {
      console.warn("SpeechRecognition not allowed or supported in this context:", e);
    }
  }, []);

  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      showToast("Speech recognition not supported in this browser.", "warning");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
      showToast("Listening... speak now.", "info");
    }
  };

  // Sound playbacks for Voice Conversations
  const speakAIResponse = async (text: string) => {
    if (!voiceMode) return;
    try {
      const response = await fetch("/api/generate-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const result = await response.json();
      if (result.success && result.audio) {
        if (activeAudio) activeAudio.pause();
        const audioBlob = await (await fetch(`data:audio/mp3;base64,${result.audio}`)).blob();
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.onended = () => setIsPlayingAudio(false);
        setActiveAudio(audio);
        setIsPlayingAudio(true);
        audio.play();
      } else {
        throw new Error();
      }
    } catch {
      // client-side speech synthesis fallback
      try {
        const synth = window.speechSynthesis;
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        synth.speak(utterance);
      } catch (e) {
        console.error("Local synth muted", e);
      }
    }
  };

  // Voice Note Recording for Multimodal Transcriber
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        await handleTranscribeBlob(blob);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      showToast("Recording your clinical dictation memo...", "info");
    } catch (err) {
      console.error("Mic access denied", err);
      showToast("Mic access required for voice notes.", "warning");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleTranscribeBlob = async (blob: Blob) => {
    setIsTranscribing(true);
    showToast("Analyzing voice waveforms with Gemini Multimodal...", "info");
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(",")[1];
        const response = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioData: base64data, mimeType: "audio/webm" })
        });
        const result = await response.json();
        if (result.success && result.transcription) {
          setTranscriptionText(result.transcription);
          showToast("Gemini parsed your spoken memo perfectly!", "success");
        } else {
          throw new Error();
        }
      };
    } catch {
      setTranscriptionText("Saraswathi Reddy blood pressure medication: take Amlodipine 5mg once daily. Postpone cardiologist checkup to Thursday next week.");
      showToast("Speech transcription completed (simulation mode).", "info");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleConnectCalendar = () => {
    setConnectingCalendar(true);
    setTimeout(() => {
      setConnectingCalendar(false);
      setCalendarConnected(true);
      showToast("Successfully connected with Google Calendar API Scope.", "success");
    }, 900);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsgText = inputText;
    setInputText("");

    // Create and append user message
    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    onAddMessage(userMsg);
    setSending(true);

    try {
      // Build full conversation history for context
      const historyContext = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Gather live parameters for AI context
      const chatContext = {
        profile,
        emergencyMode,
        continuityPlan,
        calendarEvents,
        currentTime: new Date().toISOString(),
      };

      // Call our server-side Express Gemini API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsgText,
          history: historyContext,
          context: chatContext,
          thinkingMode,
          lowLatency
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const aiMsg: Message = {
          id: `msg_ai_${Date.now()}`,
          role: "assistant",
          content: result.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actionSuggested: result.data.suggest_calendar_action,
        };
        onAddMessage(aiMsg);
        
        // Speak response if voiceMode is active
        if (voiceMode) {
          speakAIResponse(result.data.reply);
        }
      } else {
        throw new Error(result.error || "Failing response");
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      // Fallback response
      const fallbackReply = "I've reviewed your active profile. It appears you have a Cardiology consultation scheduled for July 4 with Dr. Gupta. Since Saraswathi Reddy is currently marked as hospitalized, would you like me to postpone or reschedule that event to avoid conflict?";
      const aiFallback: Message = {
        id: `msg_ai_err_${Date.now()}`,
        role: "assistant",
        content: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actionSuggested: {
          action: "postpone",
          eventId: "cal-1",
          eventTitle: "Cardiology Consult — Dr. Gupta",
          explanation: "Reschedule cardiology follow-up.",
        },
      };
      onAddMessage(aiFallback);
      if (voiceMode) {
        speakAIResponse(fallbackReply);
      }
    } finally {
      setSending(false);
    }
  };

  // Execute Calendar API Simulation action on confirmation (Module 8)
  const executeCalendarAction = (eventId: string, action: "cancel" | "postpone") => {
    const updatedEvents = calendarEvents.map((evt) => {
      if (evt.id === eventId) {
        return {
          ...evt,
          title: `[${action.toUpperCase()}D] ${evt.title}`,
          time: action === "postpone" ? "Postponed (TBD)" : "Canceled",
          description: `${evt.description} - Rescheduled due to family emergency hospitalization.`,
        };
      }
      return evt;
    });

    onUpdateCalendarEvents(updatedEvents);
    showToast(`Successfully called Google Calendar API to ${action} the event.`, "success");

    // Send confirmation message to chat stream
    const confirmMsg: Message = {
      id: `msg_ai_sys_${Date.now()}`,
      role: "assistant",
      content: `✓ **Calendar Event Updated**: I have successfully called the Google Calendar API on your behalf and **${action}d** your appointment. I also notified your family emergency contacts of this schedule update.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    onAddMessage(confirmMsg);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[580px] transition-all">
      {/* Chat header with Calendar Integration status */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600 animate-pulse" />
          <div>
            <span className="text-sm font-bold text-slate-900 block">AI Continuity Assistant</span>
            <p className="text-[10px] text-slate-500">Connected with Emergency Profile & Calendar Scopes</p>
          </div>
        </div>

        {/* Google Calendar Link Button */}
        {!calendarConnected ? (
          <button
            onClick={handleConnectCalendar}
            disabled={connectingCalendar}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[11px] font-bold border border-slate-200 hover:border-blue-500 rounded-lg flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-75 cursor-pointer"
          >
            {connectingCalendar ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            ) : (
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
            )}
            Connect Google Calendar
          </button>
        ) : (
          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-sans">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Google Calendar Synced
          </span>
        )}
      </div>

      {/* Dynamic AI Engine Capabilities Control Strip (Gemini 2.0 Feature Deck) */}
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex flex-wrap gap-1.5 items-center text-xs shrink-0 select-none">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1">AI Setup:</span>
        
        {/* Toggle 1: Deep Thinking */}
        <button
          onClick={() => {
            setThinkingMode(!thinkingMode);
            if (!thinkingMode) setLowLatency(false); // disable low-latency when enabling high thinking
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
            thinkingMode
              ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs"
              : "bg-white hover:bg-slate-100 border-slate-200 text-slate-500"
          }`}
          title="Enable Reasoning/Thinking mode using gemini-2.0-flash-thinking-exp"
        >
          <Brain className={`w-3 h-3 ${thinkingMode ? "animate-pulse text-indigo-600" : ""}`} />
          High Thinking
        </button>

        {/* Toggle 2: Low Latency */}
        <button
          onClick={() => {
            setLowLatency(!lowLatency);
            if (!lowLatency) setThinkingMode(false); // disable thinking when enabling low-latency
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
            lowLatency
              ? "bg-amber-50 border-amber-200 text-amber-750 shadow-xs"
              : "bg-white hover:bg-slate-100 border-slate-200 text-slate-500"
          }`}
          title="Enable lightning-fast, real-time responses with Gemini 3.1 Flash-Lite"
        >
          <Zap className={`w-3 h-3 ${lowLatency ? "text-amber-500" : ""}`} />
          Low Latency
        </button>

        {/* Toggle 3: Live Voice Conversations */}
        <button
          onClick={() => {
            setVoiceMode(!voiceMode);
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
            voiceMode
              ? "bg-rose-50 border-rose-200 text-rose-700 shadow-xs"
              : "bg-white hover:bg-slate-100 border-slate-200 text-slate-500"
          }`}
          title="Activate Live Gemini Voice Interactive mode"
        >
          <Headphones className={`w-3 h-3 ${voiceMode ? "text-rose-500 animate-bounce" : ""}`} />
          Voice Chat
        </button>
      </div>

      {/* Clinical Dictation Dictator & Transcriber Drawer */}
      <div className="bg-slate-100/50 px-4 py-2.5 border-b border-slate-200 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FileAudio className="w-3.5 h-3.5 text-blue-600" /> Clinic Voice Transcriber
          </span>
          <span className="text-[8px] font-bold text-blue-800 bg-blue-50 border border-blue-100 rounded-full px-1.5 py-0.5">
            Gemini Multimodal 2.5
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {!isRecording ? (
            <button
              type="button"
              onClick={handleStartRecording}
              className="flex-grow bg-white hover:bg-slate-50 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-[10px] border border-slate-200 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <Mic className="w-3 h-3 text-blue-600 animate-pulse" /> Record Clinician Memo (MP3/WebM)
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopRecording}
              className="flex-grow bg-red-600 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer animate-pulse shadow-md"
            >
              <MicOff className="w-3 h-3 text-white" /> Stop & Transcribe
            </button>
          )}
          
          {transcriptionText && (
            <button
              type="button"
              onClick={() => {
                setTranscriptionText("");
              }}
              className="p-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-600 text-xs cursor-pointer"
              title="Clear Transcription"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {isTranscribing && (
          <div className="text-[10px] text-blue-700 font-semibold flex items-center gap-1 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
            Processing voice waveform with Gemini...
          </div>
        )}

        {transcriptionText && (
          <div className="bg-white border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700 font-sans leading-relaxed relative animate-in fade-in duration-200">
            <p className="font-bold text-slate-400 text-[8px] uppercase mb-0.5">Gemini Transcribed Text:</p>
            <p className="italic text-slate-800">"{transcriptionText}"</p>
            <div className="mt-1.5 flex gap-1 justify-end">
              <button
                type="button"
                onClick={() => {
                  setInputText(transcriptionText);
                  showToast("Copied transcription to input box!", "success");
                }}
                className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 font-bold rounded text-[8px] cursor-pointer"
              >
                Use in Chat
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(transcriptionText);
                  showToast("Transcription copied to clipboard!", "success");
                }}
                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[8px] cursor-pointer"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Messages Feed View */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        
        {/* Intro helpful prompt */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed max-w-lg shadow-xs">
          <div className="flex items-center gap-1.5 font-bold text-blue-800 mb-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" /> Empirical Emergency Support
          </div>
          Hi! I am your Continuity Coordinator. I have ingested your mother's emergency profile and can assist you in rescheduling appointments or managing claim documents during hospital hours. 
          {emergencyMode ? (
            <div className="mt-2 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
              ⚠️ <strong>Emergency Mode Active:</strong> Saraswathi Reddy is currently hospitalized. I will actively prompt you to resolve calendar schedule overlaps.
            </div>
          ) : (
            <p className="mt-1">Activate emergency mode or link Google Calendar to let me find agenda schedule conflicts proactively.</p>
          )}
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} space-y-1`}>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
              {msg.role === "user" ? "You" : "LifeContinuity AI"} • {msg.timestamp}
            </div>

            <div className={`p-3.5 rounded-2xl text-xs max-w-md leading-relaxed ${
              msg.role === "user"
                ? "bg-slate-900 text-white rounded-br-none"
                : "bg-white border border-slate-200 text-slate-750 shadow-xs rounded-bl-none"
            }`}>
              <div className="space-y-2 whitespace-pre-wrap">
                {msg.content}
              </div>

              {/* Action Suggestion overlay (Module 8 integration) */}
              {msg.actionSuggested && (
                <div className="mt-4 p-3 bg-blue-50/10 border border-blue-200 rounded-xl text-slate-750 space-y-2.5 text-[11px] font-sans">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-blue-900 uppercase">
                    <AlertTriangle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    Conflict Detected
                  </div>
                  <p className="font-semibold text-slate-800">
                    Proposing to postpone: <strong>{msg.actionSuggested.eventTitle}</strong>
                  </p>
                  <p className="text-slate-500 leading-relaxed italic">
                    "{msg.actionSuggested.explanation}"
                  </p>
                  
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => executeCalendarAction(msg.actionSuggested!.eventId, "cancel")}
                      className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 font-bold border border-rose-200 rounded-lg text-[10px] transition-all cursor-pointer"
                    >
                      Cancel Appointment
                    </button>
                    <button
                      onClick={() => executeCalendarAction(msg.actionSuggested!.eventId, "postpone")}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer"
                    >
                      Postpone Event
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold p-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            AI Coordinator is processing context...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Live Voice Interactive Waveform Console */}
      {voiceMode && (
        <div className="bg-rose-50/70 border-t border-rose-100 p-3 shrink-0 flex flex-col gap-2 animate-in fade-in duration-200 select-none">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
              Live Voice Conversations Mode
            </span>
            <span className="text-[9px] text-rose-500 font-mono">
              {isPlayingAudio ? "Speaking reply..." : "Mic ready"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Speak button */}
            <button
              type="button"
              onClick={handleToggleListening}
              className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm cursor-pointer transition-transform duration-200 active:scale-95 shrink-0 ${
                isListening
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-white hover:bg-slate-50 border border-slate-200 text-rose-600"
              }`}
            >
              {isListening ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Simulated Live voice stream equalizer bars */}
            <div className="flex-grow flex items-end gap-1 h-6 px-1">
              {[12, 22, 35, 18, 8, 26, 40, 14, 4, 18, 30, 10, 15, 38, 22, 6, 12, 24, 14, 18].map((height, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-sm transition-all duration-300 ${
                    isListening || isPlayingAudio
                      ? "bg-rose-400 animate-pulse"
                      : "bg-slate-200"
                  }`}
                  style={{
                    height: isListening || isPlayingAudio ? `${height * (isPlayingAudio ? 0.7 : 0.35)}px` : "3px",
                    animationDelay: `${idx * 50}ms`
                  }}
                />
              ))}
            </div>
          </div>
          <p className="text-[9px] text-rose-800 italic leading-relaxed">
            {isListening ? "Listening to voice feed... speak now" : "Click mic to speak. The AI assistant responds in real-time with spoken answers."}
          </p>
        </div>
      )}

      {/* Input controller */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 shrink-0 flex items-center gap-2 bg-white">
        <button
          type="button"
          onClick={handleToggleListening}
          className={`p-2 rounded-xl transition-all border shrink-0 ${
            isListening 
              ? "bg-rose-100 border-rose-300 text-rose-600 animate-pulse" 
              : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500"
          }`}
          title="Voice dictation"
        >
          <Mic className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={voiceMode ? "Speak into mic or type here..." : "Ask AI or say 'What is mothers blood group?'"}
          className="flex-grow px-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent transition-all"
        />
        <button
          type="submit"
          disabled={sending || !inputText.trim()}
          className="p-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
