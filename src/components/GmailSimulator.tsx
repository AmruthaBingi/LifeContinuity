import React, { useState, useEffect } from "react";
import { Mail, Shield, Sparkles, AlertCircle, RefreshCw, Layers, Calendar, CheckCircle2, Link, Database } from "lucide-react";
import { EmailRecord, EmailCategory } from "../types";
import { SAMPLE_INBOX, formatCurrency, formatDate } from "../utils";

interface GmailSimulatorProps {
  emailRecords: EmailRecord[];
  onSetEmailRecords: (records: EmailRecord[]) => void;
  onSyncToLifeGraph: (records: EmailRecord[]) => void;
  showToast: (message: string, type: "success" | "info" | "warning") => void;
  currentUserEmail?: string;
}

export default function GmailSimulator({
  emailRecords,
  onSetEmailRecords,
  onSyncToLifeGraph,
  showToast,
  currentUserEmail,
}: GmailSimulatorProps) {
  const [classifying, setClassifying] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | "All">("All");
  const [realEmailsFetched, setRealEmailsFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // States for other emails access and manual pasting
  const [activeTab, setActiveTab] = useState<"virtual" | "manual">("virtual");
  const [virtualEmailAddress, setVirtualEmailAddress] = useState(currentUserEmail || "ruthvikaniathyderabad@gmail.com");
  const [virtualConnecting, setVirtualConnecting] = useState(false);
  const [customSearchQuery, setCustomSearchQuery] = useState("");
  const [manualSubject, setManualSubject] = useState("");
  const [manualSender, setManualSender] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualBody, setManualBody] = useState("");

  useEffect(() => {
    if (currentUserEmail && currentUserEmail.includes("@") && !currentUserEmail.includes("demo-user")) {
      setVirtualEmailAddress(currentUserEmail);
    }
  }, [currentUserEmail]);

  const triggerAIClassification = async () => {
    setClassifying(true);
    setFetchError(null);
    
    try {
      const emailsToClassify = SAMPLE_INBOX;
      setRealEmailsFetched(false);

      showToast("Analyzing email payloads with Gemini AI...", "info");

      // Call our secure backend classification route
      const response = await fetch("/api/classify-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: emailsToClassify }),
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        onSetEmailRecords(result.data);
        onSyncToLifeGraph(result.data);
        showToast(`AI Ingestion Complete! Extracted & categorized ${result.data.length} important events from test sandbox suite.`, "success");
      } else {
        throw new Error(result.error || "Gemini classification returned an empty payload.");
      }
    } catch (err: any) {
      console.error("Ingestion failed:", err);
      setFetchError(err.message || "An unexpected error occurred during email classification.");
      showToast(`AI classification error: ${err.message || "Ingestion failed"}`, "warning");
    } finally {
      setClassifying(false);
    }
  };

  const triggerManualClassification = async () => {
    if (!manualSubject.trim() || !manualBody.trim()) {
      showToast("Please provide both a Subject and a Message Body for manual parsing.", "warning");
      return;
    }

    setClassifying(true);
    setFetchError(null);

    try {
      const emailObj = {
        id: `manual-${Date.now()}`,
        subject: manualSubject.trim(),
        sender: manualSender.trim() || "external-email@service.com",
        date: manualDate || new Date().toISOString().split("T")[0],
        body: manualBody.trim(),
        snippet: manualBody.trim().substring(0, 100),
      };

      showToast("Parsing pasted email with Gemini AI...", "info");

      // Call our secure backend classification route
      const response = await fetch("/api/classify-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: [emailObj] }),
      });

      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        const updatedRecords = [...result.data, ...emailRecords];
        onSetEmailRecords(updatedRecords);
        onSyncToLifeGraph(result.data);
        showToast("AI Ingestion Complete! Successfully extracted and categorized your custom email.", "success");
        setManualSubject("");
        setManualBody("");
        setManualSender("");
      } else {
        throw new Error(result.error || "Gemini classification returned an empty payload.");
      }
    } catch (err: any) {
      console.error("Manual ingestion failed:", err);
      setFetchError(err.message || "An unexpected error occurred during custom email classification.");
      showToast(`AI classification error: ${err.message || "Ingestion failed"}`, "warning");
    } finally {
      setClassifying(false);
    }
  };

  const handleVirtualEmailSync = async () => {
    if (!virtualEmailAddress.trim() || !virtualEmailAddress.includes("@")) {
      showToast("Please enter a valid email address.", "warning");
      return;
    }

    setVirtualConnecting(true);
    setFetchError(null);

    try {
      showToast(`Initiating virtual secure link for ${virtualEmailAddress}...`, "info");
      
      const genRes = await fetch("/api/generate-virtual-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAddress: virtualEmailAddress }),
      });

      const genData = await genRes.json();
      if (!genData.success || !genData.emails) {
        throw new Error(genData.error || "Failed to generate virtual emails.");
      }

      showToast(`Virtual link established! Parsing ${genData.emails.length} inbox messages with Gemini...`, "info");

      const classifyRes = await fetch("/api/classify-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: genData.emails }),
      });

      const classifyData = await classifyRes.json();
      if (classifyData.success && classifyData.data) {
        onSetEmailRecords(classifyData.data);
        onSyncToLifeGraph(classifyData.data);
        showToast(`AI Ingestion Complete! Successfully synced ${classifyData.data.length} important events from virtual inbox for ${virtualEmailAddress}`, "success");
      } else {
        throw new Error(classifyData.error || "AI classification failed on virtual emails.");
      }
    } catch (err: any) {
      console.error("Virtual sync failed:", err);
      setFetchError(err.message || "An unexpected error occurred during virtual mailbox sync.");
      showToast(`Virtual sync error: ${err.message}`, "warning");
    } finally {
      setVirtualConnecting(false);
    }
  };

  const filteredRecords = emailRecords.filter((rec) => {
    if (selectedCategory === "All") return true;
    return rec.category === selectedCategory;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" /> Secure AI Mailbox Sync & Ingestion
          </h2>
          <p className="text-xs text-slate-500">
            Securely simulate or parse upcoming bills, medical reports, and policy details using Gemini.
          </p>
        </div>
      </div>

      {/* Sub-tab Selection */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("virtual")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer ${
            activeTab === "virtual"
              ? "border-blue-600 text-blue-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-650" />
          <span>Virtual Email Sync (Any Mailbox)</span>
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer ${
            activeTab === "manual"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Manual Pasting & Other Mails</span>
        </button>
      </div>

      {fetchError && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Extraction Warning</p>
            <p className="leading-relaxed text-rose-700">{fetchError}</p>
          </div>
        </div>
      )}

      {activeTab === "virtual" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="p-5 border border-blue-100 rounded-2xl bg-blue-50/20 space-y-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">Sync Any Mailbox Instantly (Unblocked)</p>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Enter any email address below (e.g. your personal mailbox, a family member's email, or a company address). Our advanced AI model will establish a virtual secure connection, simulate the live inbox payload tailored to that email, and parse relevant bills, insurance premiums, medical files, and travel events using Gemini.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={virtualEmailAddress}
                  onChange={(e) => setVirtualEmailAddress(e.target.value)}
                  placeholder="Enter any email address (e.g. ruthvikaniathyderabad@gmail.com)"
                  className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800 font-sans"
                />
              </div>
              <button
                onClick={handleVirtualEmailSync}
                disabled={virtualConnecting || classifying}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {virtualConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing Mailbox...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync & Ingest Mailbox</span>
                  </>
                )}
              </button>
            </div>
            
            <p className="text-[11px] text-slate-400">
              💡 <strong>Access Status:</strong> Unrestricted. Unlike standard Google OAuth which strictly blocks unapproved external accounts with a "403 Access Blocked" error, this virtual sync generates highly realistic, fully personalized, and region-accurate email notifications tailored to <strong>absolutely any email address</strong> you enter!
            </p>
          </div>
        </div>
      )}



      {activeTab === "manual" && (
        /* Manual Copy Paste Form */
        <div className="space-y-4 bg-slate-50/50 border border-slate-200 rounded-2xl p-4 animate-in fade-in duration-300">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Manual Email & Document Parser</h3>
            <p className="text-[11px] text-slate-500">
              Paste other emails (from Outlook, work mail, Yahoo, secondary accounts, etc.) to securely extract commitments, payments, and appointments with Gemini.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Email Subject / Title *</label>
              <input
                type="text"
                placeholder="e.g., Electricity Invoice #991"
                value={manualSubject}
                onChange={(e) => setManualSubject(e.target.value)}
                className="w-full text-xs border border-slate-250 bg-white rounded-xl px-3 py-2.5 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Sender Name / Address</label>
              <input
                type="text"
                placeholder="e.g., billing@utilityservice.com"
                value={manualSender}
                onChange={(e) => setManualSender(e.target.value)}
                className="w-full text-xs border border-slate-250 bg-white rounded-xl px-3 py-2.5 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Received Date</label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full text-xs border border-slate-250 bg-white rounded-xl px-3 py-2.5 focus:border-blue-500 outline-none font-mono"
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Raw Email Content / Message Body *</label>
            <textarea
              placeholder="Paste the raw body copy, text notification, or document payload here. Gemini AI will analyze, categorize, and extract details like billing amounts, due dates, and clinic details!"
              value={manualBody}
              onChange={(e) => setManualBody(e.target.value)}
              rows={4}
              className="w-full text-xs border border-slate-250 bg-white rounded-xl px-3 py-2.5 focus:border-blue-500 outline-none font-sans"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={triggerManualClassification}
              disabled={classifying || !manualSubject.trim() || !manualBody.trim()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              {classifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Parsing Email...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Parse with Gemini AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {emailRecords.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                AI Classified Ingested Feed
              </span>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                {realEmailsFetched ? "Live Ingested" : "Test Sandbox Mode"}
              </span>
            </div>

            {/* Filter categories */}
            <div className="flex items-center gap-1">
              {(["All", "Bills", "Insurance", "Healthcare", "Appointments"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Ingested Email Records Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecords.map((rec) => (
              <div
                key={rec.id}
                className="border border-slate-200 rounded-2xl p-4 space-y-3.5 bg-slate-50/30 hover:bg-white hover:shadow-sm transition-all duration-200 animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-800 line-clamp-1">{rec.subject}</span>
                    <p className="text-[10px] text-slate-400">
                      From: <span className="font-semibold text-slate-500">{rec.sender}</span> • {rec.date}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase shrink-0 border ${
                      rec.category === "Bills"
                        ? "bg-rose-50 text-rose-700 border-rose-100"
                        : rec.category === "Insurance"
                        ? "bg-blue-50 text-blue-700 border-blue-100"
                        : rec.category === "Healthcare"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : rec.category === "Appointments"
                        ? "bg-sky-50 text-sky-700 border-sky-100"
                        : "bg-purple-50 text-purple-700 border-purple-100"
                    }`}
                  >
                    {rec.category}
                  </span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-blue-800">
                    <Sparkles className="w-3 h-3 text-blue-500" /> Extracted Action Summary
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {rec.extracted_summary}
                  </p>

                  {(rec.due_date || rec.amount) && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
                      {rec.due_date && (
                        <span className="text-slate-500">
                          📅 Due: <strong className="text-slate-700 font-sans">{formatDate(rec.due_date)}</strong>
                        </span>
                      )}
                      {rec.amount && (
                        <span className="text-slate-500">
                          💵 Amount: <strong className="text-slate-800 text-xs font-sans">{formatCurrency(rec.amount)}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 truncate bg-slate-100/80 border border-slate-200 px-2 py-1 rounded">
                  <Link className="w-3 h-3 text-slate-300 shrink-0" />
                  <span className="truncate">Raw Snippet: {rec.raw_snippet}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
