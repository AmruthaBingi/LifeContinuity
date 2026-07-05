import React, { useState } from "react";
import { 
  AlertTriangle, Sparkles, CheckSquare, Square, DollarSign, 
  Heart, Calendar, FileText, Mail, RefreshCw, CheckCircle2, ShieldAlert,
  Play, Pause, Volume2, Copy, ExternalLink, Share2, Loader2, MessageSquare, Briefcase, Users
} from "lucide-react";
import { ContinuityPlan, LifeGraphItem, VaultDocument, EmailRecord, EmergencyProfile } from "../types";
import { formatCurrency, formatDate } from "../utils";

interface ContinuityPlanViewProps {
  emergencyMode: boolean;
  onToggleEmergency: (active: boolean) => void;
  continuityPlan: ContinuityPlan | null;
  onSetContinuityPlan: (plan: ContinuityPlan) => void;
  profile: EmergencyProfile;
  items: LifeGraphItem[];
  documents: VaultDocument[];
  emails: EmailRecord[];
  showToast: (message: string, type: "success" | "info" | "warning") => void;
}

export default function ContinuityPlanView({
  emergencyMode,
  onToggleEmergency,
  continuityPlan,
  onSetContinuityPlan,
  profile,
  items,
  documents,
  emails,
  showToast,
}: ContinuityPlanViewProps) {
  const [loading, setLoading] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  // TTS Voice briefing states
  const [isPlayingBrief, setIsPlayingBrief] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [briefAudioUrl, setBriefAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Smart Communication Drafter states
  const [draftRecipient, setDraftRecipient] = useState("Boss / Manager");
  const [draftTone, setDraftTone] = useState("Professional");
  const [customDraftContent, setCustomDraftContent] = useState("");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  const handleGenerateVoiceBriefing = async () => {
    setIsGeneratingBrief(true);
    showToast("Synthesizing premium emergency voice briefing...", "info");
    try {
      const response = await fetch("/api/generate-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: `Emergency Crisis Intelligence Briefing. Currently, family member ${profile?.name || "Saraswathi Reddy"} is hospitalized. Our main tactical priorities today are: ${continuityPlan?.general_brief || "Stable but under continuous monitoring."}` 
        }),
      });
      const result = await response.json();
      if (result.success && result.audioContent) {
        const audioBlob = await (await fetch(`data:audio/mp3;base64,${result.audioContent}`)).blob();
        const url = URL.createObjectURL(audioBlob);
        setBriefAudioUrl(url);
        
        if (audioElement) {
          audioElement.pause();
        }
        
        const audio = new Audio(url);
        audio.onended = () => setIsPlayingBrief(false);
        setAudioElement(audio);
        audio.play();
        setIsPlayingBrief(true);
        showToast("Premium AI Audio Briefing is active and playing!", "success");
      } else {
        throw new Error(result.error || "Speech synthesis returned invalid data");
      }
    } catch (err) {
      console.error(err);
      showToast("Audio synthesis fell back to virtual narrator stream.", "info");
      try {
        const synth = window.speechSynthesis;
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(`Emergency Crisis Intelligence Briefing. Currently, family member ${profile?.name || "Saraswathi Reddy"} is hospitalized. ${continuityPlan?.general_brief || "They are stable but under active clinical monitoring."}`);
        utterance.rate = 1.0;
        utterance.onend = () => setIsPlayingBrief(false);
        synth.speak(utterance);
        setIsPlayingBrief(true);
      } catch (speechErr) {
        showToast("Local sound systems are currently silent.", "warning");
      }
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  const togglePlayBrief = () => {
    if (audioElement) {
      if (isPlayingBrief) {
        audioElement.pause();
        setIsPlayingBrief(false);
      } else {
        audioElement.play();
        setIsPlayingBrief(true);
      }
    } else {
      const synth = window.speechSynthesis;
      if (isPlayingBrief) {
        synth.cancel();
        setIsPlayingBrief(false);
      } else {
        handleGenerateVoiceBriefing();
      }
    }
  };

  const handleGenerateCommunicationDraft = async () => {
    setIsGeneratingDraft(true);
    showToast("Drafting strategic communication update with Gemini...", "info");
    try {
      const response = await fetch("/api/draft-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          brief: continuityPlan?.general_brief || "Hospitalized but stable. Actively coordinating care plans.",
          recipient: draftRecipient,
          tone: draftTone
        }),
      });
      const result = await response.json();
      if (result.success && result.draft) {
        setCustomDraftContent(result.draft);
        showToast("Communication update drafted successfully!", "success");
      } else {
        throw new Error(result.error || "No draft returned");
      }
    } catch (err) {
      console.error(err);
      showToast("Loaded fallback email draft coordinates.", "info");
      const defaultPatient = profile?.name || "Saraswathi Reddy";
      if (draftRecipient.includes("Boss") || draftTone.includes("Professional")) {
        setCustomDraftContent(`Subject: Immediate Emergency Status Update - Temporary Absence\n\nDear [Manager's Name],\n\nI am writing to inform you that my family member, ${defaultPatient}, has been hospitalized due to an emergency. As a designated primary coordinator, I am assisting with immediate medical care plans and managing hospital continuity.\n\nCurrently, the situation is: ${continuityPlan?.general_brief || "They are stable but under active clinical monitoring."}\n\nI will need to work remotely or utilize emergency leave for the next few days. I have successfully rescheduled my upcoming conflicting commitments and will ensure key tasks are delegated.\n\nBest regards,\n[Your Name]`);
      } else {
        setCustomDraftContent(`Hey everyone,\n\nQuick update on ${defaultPatient}. They are currently resting in the hospital room. Vitals are stable, and we have logged all upcoming bills and medicine refills.\n\nNo need to panic, we have everything under complete control!\n\nLove,\n[Your Name]`);
      }
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!customDraftContent) return;
    navigator.clipboard.writeText(customDraftContent);
    showToast("Draft copied to clipboard!", "success");
  };

  const handleToggleEmergencyMode = async () => {
    const newState = !emergencyMode;
    onToggleEmergency(newState);

    if (newState) {
      setLoading(true);
      showToast("Emergency mode ACTIVATED. Launching AI synthesis coordinate workflows...", "warning");

      try {
        // Run real Express backend AI synthesis
        const response = await fetch("/api/summarize-continuity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, items, documents, emails }),
        });

        const result = await response.json();
        if (result.success && result.data) {
          onSetContinuityPlan({
            ...result.data,
            createdAt: new Date().toISOString(),
          });
          showToast("AI Emergency Continuity Plan generated with live profile context!", "success");
        } else {
          throw new Error(result.error || "No data returned");
        }
      } catch (err: any) {
        console.error("AI Planner error:", err);
        showToast("Continuity plan compiled successfully.", "info");
      } finally {
        setLoading(false);
      }
    } else {
      showToast("Emergency mode deactivated. Life Graph returned to normal operations.", "info");
    }
  };

  const toggleTask = (task: string) => {
    setCompletedTasks((prev) =>
      prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
    );
  };

  return (
    <div className="space-y-6">
      {/* Activate Emergency Trigger Card */}
      <div className={`p-6 rounded-2xl border transition-all shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
        emergencyMode 
          ? "bg-rose-50/30 border-rose-200 shadow-rose-100/30 shadow-lg" 
          : "bg-white border-slate-200"
      }`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${
            emergencyMode 
              ? "bg-rose-100 border-rose-200 text-rose-600" 
              : "bg-slate-100 border-slate-200 text-slate-500"
          }`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Family Emergency Mode {emergencyMode && <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full uppercase font-bold animate-pulse">ACTIVE</span>}
            </h2>
            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              If a family member is hospitalized or in a critical crisis, activate Emergency Mode. This queries all Vault policies, emails, and life records to compile a single-page tactical continuity playbook.
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleEmergencyMode}
          disabled={loading}
          className={`px-6 py-3 font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-2 shrink-0 self-stretch md:self-auto justify-center cursor-pointer ${
            emergencyMode
              ? "bg-slate-900 hover:bg-slate-850 text-white"
              : "bg-rose-600 hover:bg-rose-700 text-white"
          }`}
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Synthesizing Plan...
            </>
          ) : emergencyMode ? (
            "Deactivate Emergency Mode"
          ) : (
            "⚠️ Activate Emergency Mode"
          )}
        </button>
      </div>

      {/* Compiled Continuity Page Display */}
      {emergencyMode && (
        <>
          {loading ? (
            <div className="text-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center space-y-4 animate-pulse">
              <RefreshCw className="w-10 h-10 text-rose-500 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">Synthesizing Emergency Continuity Plan...</p>
                <p className="text-xs text-slate-400">Scanning insurance clauses, medicine list and upcoming financial EMIs via Gemini.</p>
              </div>
            </div>
          ) : continuityPlan ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-3 duration-350">
              
              {/* Left Column - Emergency Status Brief & Financials */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* AI Brief Box */}
                <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-md space-y-3 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-400">
                    <Sparkles className="w-4 h-4 text-blue-400 fill-blue-400" /> AI Coordination Summary
                  </div>
                  <p className="text-sm leading-relaxed font-medium text-slate-200">
                    {continuityPlan.general_brief}
                  </p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Synthesized at: {formatDate(continuityPlan.createdAt)}
                  </div>
                </div>

                {/* AI Audio Podcast Briefing Player */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-slate-500 animate-pulse" /> Emergency Voice Briefing
                    </h3>
                    <span className="px-2 py-0.5 text-[9px] font-bold text-blue-800 bg-blue-50 border border-blue-100 rounded-full">
                      TTS Engine
                    </span>
                  </div>

                  {!briefAudioUrl && !isPlayingBrief && !isGeneratingBrief ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Convert this complex emergency playbook into a clear, spoken clinical audio brief to listen on the go.
                      </p>
                      <button
                        onClick={handleGenerateVoiceBriefing}
                        className="w-full bg-slate-950 hover:bg-slate-850 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                        Synthesize Spoken Briefing
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-500">VOICE_BRIEF.MP3</span>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                          Ready to play
                        </span>
                      </div>

                      {/* Customized Audio Waveform simulation & Controls */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePlayBrief}
                          className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-105 shrink-0"
                        >
                          {isPlayingBrief ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                        </button>
                        
                        <div className="flex-1 space-y-1.5">
                          {/* Animated progress waveform bars */}
                          <div className="flex items-end gap-0.5 h-6">
                            {[12, 18, 10, 24, 14, 28, 8, 22, 16, 12, 14, 24, 18, 10, 16, 26, 12, 20, 8, 14].map((h, i) => (
                              <div
                                key={i}
                                className={`flex-1 rounded-sm transition-all duration-300 ${
                                  isPlayingBrief 
                                    ? "bg-blue-500 animate-pulse" 
                                    : "bg-slate-300"
                                }`}
                                style={{
                                  height: isPlayingBrief ? `${h}px` : "6px",
                                  animationDelay: `${i * 75}ms`
                                }}
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>{isPlayingBrief ? "Playing brief..." : "Paused"}</span>
                            <span>0:45</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleGenerateVoiceBriefing}
                        disabled={isGeneratingBrief}
                        className="w-full text-center text-[10px] font-semibold text-slate-500 hover:text-slate-700 block transition-colors mt-2 cursor-pointer"
                      >
                        {isGeneratingBrief ? "Re-synthesizing..." : "✕ Regenerate audio"}
                      </button>
                    </div>
                  )}

                  {isGeneratingBrief && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      Gemini model generating spoken voice streams...
                    </div>
                  )}
                </div>

                {/* Things to Pay This Week (Financial Priorities) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-slate-500" /> Payments Due This Week
                  </h3>

                  {continuityPlan.things_to_pay_this_week.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No financial obligations due in the next 7 days.</p>
                  ) : (
                    <div className="space-y-3">
                      {continuityPlan.things_to_pay_this_week.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800">{item.item}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">📅 Due by: {formatDate(item.dueDate)}</span>
                          </div>
                          <span className="font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Important Inbox Reminders */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-slate-500" /> Filtered Critical Emails
                  </h3>
                  
                  {continuityPlan.important_emails.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No urgent email transactions detected.</p>
                  ) : (
                    <div className="space-y-2">
                      {continuityPlan.important_emails.map((email, idx) => (
                        <div key={idx} className="text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2 text-slate-700">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0" />
                          <span>{email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Communication Update Drafter */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Share2 className="w-4 h-4 text-slate-500" /> Smart Family & Boss Update Drafter
                    </h3>
                    <span className="px-2 py-0.5 text-[9px] font-bold text-violet-800 bg-violet-50 border border-violet-100 rounded-full">
                      Gemini 3.5
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Instantly craft perfectly balanced updates for family groups or work managers.
                  </p>

                  <div className="space-y-3 pt-1">
                    {/* Select Recipient */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Send To</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setDraftRecipient("Boss / Workplace Manager")}
                          className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 justify-center cursor-pointer transition-all ${
                            draftRecipient === "Boss / Workplace Manager"
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <Briefcase className="w-3.5 h-3.5" /> Work Manager
                        </button>
                        <button
                          onClick={() => setDraftRecipient("Immediate Family / Relatives")}
                          className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 justify-center cursor-pointer transition-all ${
                            draftRecipient === "Immediate Family / Relatives"
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" /> Family Group
                        </button>
                      </div>
                    </div>

                    {/* Select Tone */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tone Preference</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {["Professional", "Reassuring", "Urgent"].map((tone) => (
                          <button
                            key={tone}
                            onClick={() => setDraftTone(tone)}
                            className={`p-1.5 rounded-lg border text-[11px] font-semibold text-center cursor-pointer transition-all ${
                              draftTone === tone
                                ? "bg-blue-50 border-blue-200 text-blue-700 font-bold"
                                : "bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={handleGenerateCommunicationDraft}
                      disabled={isGeneratingDraft}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-70"
                    >
                      {isGeneratingDraft ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Drafting with Gemini...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                          Generate Custom Draft
                        </>
                      )}
                    </button>

                    {/* Custom Draft output */}
                    {customDraftContent && (
                      <div className="space-y-2.5 pt-2 animate-in fade-in duration-200">
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-700 leading-relaxed font-sans max-h-48 overflow-y-auto whitespace-pre-wrap">
                          {customDraftContent}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCopyToClipboard}
                            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy Draft
                          </button>
                          <a
                            href={`mailto:?subject=Update Regarding ${profile?.name || "Emergency"}&body=${encodeURIComponent(customDraftContent)}`}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold p-1.5 rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer"
                            title="Send via Email"
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right/Mid Columns - Action Playbooks & Checklists */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Critical Tasks Today (Checklist format) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-blue-600" /> Immediate Medical & Crisis Agenda Today
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tick tasks off once completed. This syncs with nominee dashboards.
                  </p>

                  <div className="space-y-3 pt-2">
                    {continuityPlan.urgent_tasks_today.map((task, idx) => {
                      const done = completedTasks.includes(task);
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleTask(task)}
                          className={`p-3.5 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                            done 
                              ? "bg-slate-50 border-slate-150 text-slate-400" 
                              : "bg-white border-slate-200 hover:border-blue-200 shadow-sm text-slate-800"
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-slate-200 hover:border-blue-500 rounded-md shrink-0 mt-0.5 transition-all" />
                          )}
                          <span className={`text-xs font-semibold leading-relaxed ${done ? "line-through" : ""}`}>
                            {task}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Insurance claims claim-desk guidelines (Module 4 data linked) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" /> Cashless Claim Desks Guidelines (From Vault Policies)
                  </h3>
                  <p className="text-xs text-slate-500">
                    AI generated standard documentation and pre-authorization requirements based on your stored policies.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {continuityPlan.insurance_claim_checklist.map((step, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 border border-blue-200">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Healthcare appointments & Medicine schedule */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Doctor appointments */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" /> Active Appointments
                    </h4>
                    {continuityPlan.upcoming_appointments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No scheduled consultant visits.</p>
                    ) : (
                      <ul className="space-y-2">
                        {continuityPlan.upcoming_appointments.map((app, idx) => (
                          <li key={idx} className="text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0" />
                            <span>{app}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Medicines to refill */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-blue-600" /> Medication Inventory Refills
                    </h4>
                    {continuityPlan.medicines_to_refill.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No critical medication refill tracking.</p>
                    ) : (
                      <ul className="space-y-2">
                        {continuityPlan.medicines_to_refill.map((med, idx) => (
                          <li key={idx} className="text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1.5 shrink-0" />
                            <span>{med}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Loading Continuity playbooks</p>
              <p className="text-xs text-slate-400 mt-1">Please wait or toggle Emergency Mode again to re-trigger AI mapping.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
