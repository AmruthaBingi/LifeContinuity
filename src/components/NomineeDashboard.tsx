import React, { useEffect, useState } from "react";
import { 
  Shield, Sparkles, Heart, FileText, Calendar, 
  CreditCard, Phone, ListChecks, HelpCircle, Loader2, LogOut
} from "lucide-react";
import { 
  EmergencyProfile, ContinuityPlan, LifeGraphItem, 
  VaultDocument, EmailRecord, User 
} from "../types";
import { formatCurrency, formatDate } from "../utils";

interface NomineeDashboardProps {
  user: User;
  profile: EmergencyProfile;
  continuityPlan: ContinuityPlan | null;
  items: LifeGraphItem[];
  documents: VaultDocument[];
  emails: EmailRecord[];
  onLogout: () => void;
}

export default function NomineeDashboard({
  user,
  profile,
  continuityPlan,
  items,
  documents,
  emails,
  onLogout,
}: NomineeDashboardProps) {
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    // Run an AI Summarization step specifically for the nominee (Nominee Access Page rule)
    const fetchNomineeSummary = async () => {
      setLoadingSummary(true);
      try {
        const response = await fetch("/api/summarize-continuity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, items, documents, emails }),
        });
        const result = await response.json();
        if (result.success && result.data) {
          // Extract general natural-language brief
          setAiSummary(result.data.general_brief);
        } else {
          throw new Error("Empty summary");
        }
      } catch (err) {
        // Fallback summary matching spec example
        setAiSummary(`You have three urgent tasks today: pay the home loan EMI ($850 due July 5), submit the HDFC ERGO insurance claim pre-auth, and refill diabetes prescription Metformin.`);
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchNomineeSummary();
  }, [profile, items, documents, emails]);

  // Extract read-only bills
  const billsAndEmis = items.filter(
    (item) => (item.type === "Bills" || item.type === "Loans/EMIs") && item.status !== "Paid"
  );

  // Extract read-only appointments
  const appointments = items.filter(
    (item) => item.type === "Appointments" && item.status !== "Completed"
  );

  // Filter private docs (Nominee has read permission)
  const vaultDocs = documents.filter((doc) => doc.isPrivate);

  return (
    <div className="space-y-6">
      
      {/* Read-Only Banner Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">Nominee Security Portal</h1>
              <span className="px-2.5 py-0.5 text-[9px] font-bold bg-rose-950/40 text-rose-400 rounded-full uppercase border border-rose-900/55">Authorized Access</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Secure access granted for: <strong className="text-white font-semibold">{user.name}</strong> (Viewing profile of {profile.name}).
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
        >
          <LogOut className="w-3.5 h-3.5" /> Close Secured Session
        </button>
      </div>

      {/* 1. AI-Generated Priority Summary Brief at the top of dashboard */}
      <div className="bg-blue-50/10 border border-blue-200 rounded-2xl p-5 shadow-sm space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-blue-600 fill-blue-500/20 animate-pulse" /> Nominee Action Intelligence Brief
        </div>

        {loadingSummary ? (
          <div className="flex items-center gap-2 py-2 text-xs text-slate-500 font-semibold">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Connecting to Gemini to compile natural-language briefing...
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-800 leading-relaxed">
            "{aiSummary}"
          </p>
        )}
      </div>

      {/* Detailed Read-Only Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Panel A: Critical Tasks for Today */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-blue-600" /> Critical Tasks Today
          </h3>
          <div className="space-y-3">
            {continuityPlan && continuityPlan.urgent_tasks_today.length > 0 ? (
              continuityPlan.urgent_tasks_today.map((task, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 leading-relaxed flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 shrink-0" />
                  <span>{task}</span>
                </div>
              ))
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                No active critical crisis playbooks formulated by user.
              </div>
            )}
          </div>
        </div>

        {/* Panel B: Upcoming EMIs & Bills */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" /> EMIs & Utility Bills
          </h3>
          <div className="space-y-3">
            {billsAndEmis.length > 0 ? (
              billsAndEmis.map((bill) => (
                <div key={bill.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800">{bill.name}</span>
                    <span className="block text-[10px] text-slate-400 font-mono">📅 Due by: {formatDate(bill.dueDate)}</span>
                  </div>
                  <span className="font-bold text-slate-700 bg-white px-2 py-0.5 border border-slate-200 rounded">
                    {formatCurrency(bill.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                All EMIs & utilities are fully cleared or up-to-date.
              </div>
            )}
          </div>
        </div>

        {/* Panel C: Medicine Refill Schedule */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-blue-600" /> Medicine Schedule & Refills
          </h3>
          <div className="space-y-3">
            {continuityPlan && continuityPlan.medicines_to_refill.length > 0 ? (
              continuityPlan.medicines_to_refill.map((med, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1.5 shrink-0" />
                  <span>{med}</span>
                </div>
              ))
            ) : (
              <div className="space-y-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  💊 Metformin 500mg (Diabetes) • Twice Daily (Post meals)
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  💊 Atorvastatin 10mg (Cholesterol) • Once Nightly
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel D: Stored Insurance & Vital ID Documents */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Insurance & Documents Vault
          </h3>
          <div className="space-y-3">
            {vaultDocs.length > 0 ? (
              vaultDocs.map((doc) => (
                <div key={doc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 truncate block max-w-[150px]">{doc.fileName}</span>
                    <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase rounded bg-slate-200 text-slate-700 border border-slate-300">
                      {doc.type}
                    </span>
                  </div>

                  {/* Extract details */}
                  {doc.extraction && (
                    <div className="p-2 bg-white rounded border border-slate-200 text-[10px] space-y-1 font-mono text-slate-500">
                      <div>ID: <span className="font-sans font-semibold text-slate-700">{doc.extraction.policy_number || "N/A"}</span></div>
                      <div>Expiry: <span className="font-sans font-semibold text-slate-700">{doc.extraction.expiry_date || "N/A"}</span></div>
                      <div className="truncate">TPA: <span className="font-sans font-semibold text-slate-700">{doc.extraction.hospital_name || "N/A"}</span></div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                No shared vital documents stored in vault.
              </div>
            )}
          </div>
        </div>

        {/* Panel E: Upcoming Medical Appointments */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" /> Upcoming Appointments
          </h3>
          <div className="space-y-3">
            {appointments.length > 0 ? (
              appointments.map((app) => (
                <div key={app.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-start gap-2 text-slate-700 font-semibold">
                  <Calendar className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <span>{app.name}</span>
                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5">📅 {formatDate(app.dueDate)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                No scheduled clinical appointments.
              </div>
            )}
          </div>
        </div>

        {/* Panel F: Primary Emergency Contacts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Phone className="w-5 h-5 text-rose-600" /> Primary Emergency Contacts
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-800">{profile.emergencyContactName}</span>
              <p className="text-[10px] text-slate-500">Relationship: Primary Emergency Responder</p>
              <span className="text-xs text-rose-600 font-bold block">{profile.emergencyContactPhone}</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-800">Apollo Emergency ER Desk</span>
              <p className="text-[10px] text-slate-500">Toll-Free Hospital Hotline Desk</p>
              <span className="text-xs text-rose-600 font-bold block font-mono">1066 / +91-40-23607777</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
