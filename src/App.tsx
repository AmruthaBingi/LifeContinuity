import React, { useState, useEffect } from "react";
import { 
  Shield, User as UserIcon, Heart, FileText, Mail, 
  Calendar, CreditCard, Bell, MessageSquare, Sparkles, 
  ShieldCheck, AlertTriangle, LogOut, Info, ShieldAlert, Loader2, AlertCircle
} from "lucide-react";
import { 
  User, EmergencyProfile, VaultDocument, EmailRecord, 
  LifeGraphItem, CalendarEvent, ContinuityPlan, Message 
} from "./types";
import { 
  INITIAL_PROFILE, INITIAL_LIFE_ITEMS, SAMPLE_CALENDAR, 
  formatDate, formatCurrency 
} from "./utils";
import { supabase, logAuditAction, isSupabaseConfigured, isValidUUID } from "./lib/supabaseClient";
import { authService } from "./lib/authService";

// Sub-components imports
import LoginScreen from "./components/LoginScreen";
import ProfileForm from "./components/ProfileForm";
import DocumentVault from "./components/DocumentVault";
import GmailSimulator from "./components/GmailSimulator";
import DashboardPanels from "./components/DashboardPanels";
import ContinuityPlanView from "./components/ContinuityPlanView";
import ReminderAgent from "./components/ReminderAgent";
import ChatbotPanel from "./components/ChatbotPanel";
import NomineeLogin from "./components/NomineeLogin";
import NomineeDashboard from "./components/NomineeDashboard";
import SecurityCenter from "./components/SecurityCenter";

type TabType = "dashboard" | "profile" | "vault" | "gmail" | "planner" | "reminder" | "chatbot";

export default function App() {
  // ────────────────────────────────────────────────────────────────────────
  // CORE STATE MANAGEMENT (LIVE WITH SUPABASE BACKING, NO LOCALSTORAGE)
  // ────────────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<EmergencyProfile>({ ...INITIAL_PROFILE });
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [emailRecords, setEmailRecords] = useState<EmailRecord[]>([]);
  const [lifeItems, setLifeItems] = useState<LifeGraphItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(SAMPLE_CALENDAR);
  const [continuityPlan, setContinuityPlan] = useState<ContinuityPlan | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [emergencyMode, setEmergencyMode] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [showNomineeLogin, setShowNomineeLogin] = useState(false);
  const [loadingDb, setLoadingDb] = useState(false);
  const [hasSchemaError, setHasSchemaError] = useState(false);
  const [showSchemaGuide, setShowSchemaGuide] = useState(false);
  const [dbCheckTrigger, setDbCheckTrigger] = useState(0);
  const [dismissedSchemaError, setDismissedSchemaError] = useState(false);

  // Visual Notification Banner/Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);

  // 1. Recover and Listen to Session from Supabase Auth
  useEffect(() => {
    async function initSession() {
      try {
        const res = await authService.checkSession();
        if (res.success && res.user) {
          setCurrentUser(res.user);
        }
      } catch (e) {
        console.warn("Supabase session recovery warning:", e);
      }
    }
    initSession();

    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        let name = session.user.user_metadata?.name || "";
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", session.user.id)
            .maybeSingle();
          if (profile?.name) {
            name = profile.name;
          }
        } catch (err) {
          console.warn("Could not fetch user profile name on auth state change:", err);
        }
        
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || "",
          name: name || session.user.email || "User",
          role: "User",
        });
      } else {
        // Only clear if the user is not a nominee (who has ID starting with 'nom_')
        setCurrentUser(curr => {
          if (curr && curr.id.startsWith("nom_")) {
            return curr;
          }
          return null;
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Fetch User Data from Supabase when session changes
  useEffect(() => {
    async function fetchUserData() {
      if (!supabase || !currentUser) return;
      
      // Nominees view target user's records (strip the 'nom_' prefix)
      const userUid = currentUser.id.startsWith("nom_") 
        ? currentUser.id.substring(4) 
        : currentUser.id;

      if (!isValidUUID(userUid)) {
        console.log("Using local/demo user (non-UUID). Skipping database sync.");
        return;
      }

      setLoadingDb(true);
      let detectedSchemaError = false;

      // 1. Fetch Profile
      try {
        const { data: profileData, error: profileErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userUid)
          .maybeSingle();

        if (profileErr) {
          throw profileErr;
        }

        if (profileData) {
          const mappedProfile = {
            name: profileData.name || "",
            age: Number(profileData.age) || 0,
            bloodGroup: profileData.blood_group || profileData.bloodGroup || "O+ Pos",
            emergencyContactName: profileData.emergency_contact_name || profileData.emergencyContactName || "",
            emergencyContactPhone: profileData.emergency_contact_phone || profileData.emergencyContactPhone || "",
            nomineeName: profileData.nominee_name || profileData.nomineeName || "",
            nomineePhone: profileData.nominee_phone || profileData.nomineePhone || "",
            nomineePin: profileData.nominee_pin || profileData.nomineePin || "",
          };
          setProfile(mappedProfile);

          // Deserialize app state JSON blobs if available
          if (profileData.email_records) {
            setEmailRecords(typeof profileData.email_records === 'string' ? JSON.parse(profileData.email_records) : profileData.email_records);
          }
          if (profileData.calendar_events) {
            setCalendarEvents(typeof profileData.calendar_events === 'string' ? JSON.parse(profileData.calendar_events) : profileData.calendar_events);
          }
          if (profileData.continuity_plan) {
            setContinuityPlan(typeof profileData.continuity_plan === 'string' ? JSON.parse(profileData.continuity_plan) : profileData.continuity_plan);
          }
          if (profileData.messages) {
            setMessages(typeof profileData.messages === 'string' ? JSON.parse(profileData.messages) : profileData.messages);
          }
        }
      } catch (err: any) {
        if (err?.code === "42P01" || err?.message?.includes("relation") || err?.message?.includes("does not exist")) {
          detectedSchemaError = true;
        } else {
          console.warn("Soft profile query warning:", err);
        }
      }

      // 2. Fetch Documents
      try {
        const { data: docsData, error: docsErr } = await supabase
          .from("documents")
          .select("*")
          .eq("user_id", userUid);

        if (docsErr) {
          throw docsErr;
        }

        if (docsData) {
          setDocuments(
            docsData.map((doc: any) => ({
              id: doc.id,
              userId: doc.user_id,
              type: doc.type,
              fileName: doc.file_name || doc.fileName || "",
              fileSize: doc.file_size || doc.fileSize || "",
              uploadedDate: doc.uploaded_date || doc.uploadedDate || "",
              notes: doc.notes || "",
              isPrivate: doc.is_private !== undefined ? doc.is_private : doc.isPrivate !== undefined ? doc.isPrivate : true,
              extraction: doc.extraction ? (typeof doc.extraction === 'string' ? JSON.parse(doc.extraction) : doc.extraction) : undefined,
            }))
          );
        }
      } catch (err: any) {
        if (err?.code === "42P01" || err?.message?.includes("relation") || err?.message?.includes("does not exist")) {
          detectedSchemaError = true;
        } else {
          console.warn("Soft documents query warning:", err);
        }
      }

      // 3. Fetch Emergency Mode
      try {
        const { data: sessionsData, error: sessionsErr } = await supabase
          .from("emergency_sessions")
          .select("*")
          .eq("user_id", userUid)
          .eq("status", "active")
          .maybeSingle();

        if (sessionsErr) {
          throw sessionsErr;
        }

        setEmergencyMode(!!sessionsData);
      } catch (err: any) {
        if (err?.code === "42P01" || err?.message?.includes("relation") || err?.message?.includes("does not exist")) {
          detectedSchemaError = true;
        } else {
          console.warn("Soft emergency sessions query warning:", err);
        }
      }

      // 4. Fetch Life Graph Items
      let financeData: any[] = [];
      let tasksData: any[] = [];
      
      try {
        const { data, error } = await supabase
          .from("finance_items")
          .select("*")
          .eq("user_id", userUid);

        if (error) throw error;
        if (data) financeData = data;
      } catch (err: any) {
        if (err?.code === "42P01" || err?.message?.includes("relation") || err?.message?.includes("does not exist")) {
          detectedSchemaError = true;
        } else {
          console.warn("Soft finance items query warning:", err);
        }
      }

      try {
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", userUid);

        if (error) throw error;
        if (data) tasksData = data;
      } catch (err: any) {
        if (err?.code === "42P01" || err?.message?.includes("relation") || err?.message?.includes("does not exist")) {
          detectedSchemaError = true;
        } else {
          console.warn("Soft tasks query warning:", err);
        }
      }

      const loadedItems: LifeGraphItem[] = [];
      financeData.forEach((f: any) => {
        loadedItems.push({
          id: f.id,
          type: f.type || "Bills",
          name: f.name || "",
          dueDate: f.due_date || f.dueDate || "",
          amount: f.amount ? Number(f.amount) : null,
          status: f.status || "Pending",
        });
      });

      tasksData.forEach((t: any) => {
        loadedItems.push({
          id: t.id,
          type: t.category === "Appointments" ? "Appointments" : "Appointments",
          name: t.title || t.name || "",
          dueDate: t.due_date || t.dueDate || "",
          amount: null,
          status: t.status || "Pending",
        });
      });

      if (loadedItems.length > 0) {
        setLifeItems(loadedItems);
      } else {
        setLifeItems(INITIAL_LIFE_ITEMS);
      }

      if (detectedSchemaError) {
        setHasSchemaError(true);
        console.warn("Supabase relation schema not yet configured or incomplete. Standard local/onboarding presets loaded as a safe fallback.");
      } else {
        setHasSchemaError(false);
      }

      setLoadingDb(false);
    }
    fetchUserData();
  }, [currentUser, dbCheckTrigger]);

  // 3. Keep specialized JSON fields synced to the profiles table
  const saveStateToProfileMetadata = async (
    emails: EmailRecord[],
    events: CalendarEvent[],
    plan: ContinuityPlan | null,
    msgs: Message[]
  ) => {
    if (!supabase || !currentUser) return;
    const userUid = currentUser.id.startsWith("nom_") ? currentUser.id.substring(4) : currentUser.id;
    if (!isValidUUID(userUid)) return;

    try {
      await supabase
        .from("profiles")
        .update({
          email_records: emails,
          calendar_events: events,
          continuity_plan: plan,
          messages: msgs,
        })
        .eq("id", userUid);
    } catch (err) {
      console.error("Error saving state metadata:", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      saveStateToProfileMetadata(emailRecords, calendarEvents, continuityPlan, messages);
    }
  }, [emailRecords, calendarEvents, continuityPlan, messages]);

  // Utility toast dispatcher
  const showToast = (message: string, type: "success" | "info" | "warning") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Sign out
  const handleLogout = async () => {
    localStorage.removeItem("lifecontinuity_sandbox_session");
    try {
      await authService.logout();
    } catch (e) {
      console.warn("Server logout warning", e);
    }
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setShowNomineeLogin(false);
    showToast("Successfully logged out of secure session.", "info");
  };

  // Syncing Classified Email Records into Life Graph Panels (Module 4 -> Module 5 Integration)
  const syncEmailRecordsToLifeGraph = async (records: EmailRecord[]) => {
    const existingNames = lifeItems.map((item) => item.name);
    const newItemsToAdd: LifeGraphItem[] = [];

    records.forEach((rec) => {
      if (!existingNames.includes(rec.subject)) {
        let itemType: "Bills" | "Appointments" | "Loans/EMIs" = "Bills";
        if (rec.category === "Appointments") itemType = "Appointments";
        else if (rec.category === "Healthcare") itemType = "Appointments";

        newItemsToAdd.push({
          id: `item_sync_${rec.id}`,
          type: itemType,
          name: rec.subject,
          dueDate: rec.due_date || new Date().toISOString().split("T")[0],
          amount: rec.amount,
          status: "Pending",
        });
      }
    });

    if (newItemsToAdd.length > 0) {
      setLifeItems((prev) => [...prev, ...newItemsToAdd]);

      if (supabase && currentUser) {
        const userUid = currentUser.id.startsWith("nom_") ? currentUser.id.substring(4) : currentUser.id;
        if (!isValidUUID(userUid)) return;
        for (const item of newItemsToAdd) {
          try {
            if (item.type === "Bills" || item.type === "Loans/EMIs") {
              await supabase.from("finance_items").insert({
                id: item.id,
                user_id: userUid,
                type: item.type,
                name: item.name,
                due_date: item.dueDate,
                amount: item.amount,
                status: item.status,
              });
            } else {
              await supabase.from("tasks").insert({
                id: item.id,
                user_id: userUid,
                title: item.name,
                due_date: item.dueDate,
                status: item.status,
                category: "Appointments",
              });
            }
          } catch (e) {
            console.error("Error inserting synced email item:", e);
          }
        }

        await logAuditAction(
          userUid,
          currentUser.name,
          currentUser.role as any,
          "SYNC_EMAILS",
          `Synced ${newItemsToAdd.length} parsed records from Gmail classification to Life Graph`
        );
      }
    }
  };

  // CRUD mapping callbacks passed to DashboardPanels
  const handleAddItem = async (item: LifeGraphItem) => {
    setLifeItems((prev) => [...prev, item]);

    if (!supabase || !currentUser) return;
    const userUid = currentUser.id.startsWith("nom_") ? currentUser.id.substring(4) : currentUser.id;
    if (!isValidUUID(userUid)) return;

    try {
      if (item.type === "Bills" || item.type === "Loans/EMIs" || item.type === "School Fees") {
        const { error } = await supabase.from("finance_items").insert({
          id: item.id,
          user_id: userUid,
          type: item.type,
          name: item.name,
          due_date: item.dueDate,
          amount: item.amount,
          status: item.status,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert({
          id: item.id,
          user_id: userUid,
          title: item.name,
          due_date: item.dueDate,
          status: item.status,
          category: "Appointments",
        });
        if (error) throw error;
      }

      await logAuditAction(
        userUid,
        currentUser.name,
        currentUser.role as any,
        "ADD_OBLIGATION",
        `Created obligation of type ${item.type}: ${item.name}`
      );
    } catch (err) {
      console.error("Error saving added item to Supabase:", err);
    }
  };

  const handleUpdateItemStatus = async (id: string, status: any) => {
    setLifeItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );

    if (!supabase || !currentUser) return;
    const userUid = currentUser.id.startsWith("nom_") ? currentUser.id.substring(4) : currentUser.id;
    if (!isValidUUID(userUid)) return;

    try {
      const item = lifeItems.find((i) => i.id === id);
      if (!item) return;

      if (item.type === "Bills" || item.type === "Loans/EMIs" || item.type === "School Fees") {
        const { error } = await supabase
          .from("finance_items")
          .update({ status })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tasks")
          .update({ status })
          .eq("id", id);
        if (error) throw error;
      }

      await logAuditAction(
        userUid,
        currentUser.name,
        currentUser.role as any,
        "UPDATE_OBLIGATION_STATUS",
        `Updated status of "${item.name}" to ${status}`
      );
    } catch (err) {
      console.error("Error updating item status in Supabase:", err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const deletedItem = lifeItems.find((i) => i.id === id);
    setLifeItems((prev) => prev.filter((item) => item.id !== id));

    if (!supabase || !currentUser) return;
    const userUid = currentUser.id.startsWith("nom_") ? currentUser.id.substring(4) : currentUser.id;
    if (!isValidUUID(userUid)) return;

    try {
      if (deletedItem) {
        if (deletedItem.type === "Bills" || deletedItem.type === "Loans/EMIs" || deletedItem.type === "School Fees") {
          const { error } = await supabase
            .from("finance_items")
            .delete()
            .eq("id", id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("tasks")
            .delete()
            .eq("id", id);
          if (error) throw error;
        }

        await logAuditAction(
          userUid,
          currentUser.name,
          currentUser.role as any,
          "DELETE_OBLIGATION",
          `Removed obligation: ${deletedItem.name}`
        );
      }
    } catch (err) {
      console.error("Error deleting item from Supabase:", err);
    }
  };

  const handleToggleEmergency = async (active: boolean) => {
    setEmergencyMode(active);

    if (!supabase || !currentUser) return;
    const userUid = currentUser.id.startsWith("nom_") ? currentUser.id.substring(4) : currentUser.id;
    if (!isValidUUID(userUid)) return;

    try {
      if (active) {
        const { error } = await supabase.from("emergency_sessions").insert({
          id: `sess_${Date.now()}`,
          user_id: userUid,
          status: "active",
          initiated_by: "User",
          initiated_at: new Date().toISOString(),
        });
        if (error) throw error;

        await logAuditAction(
          userUid,
          currentUser.name,
          currentUser.role as any,
          "ACTIVATE_EMERGENCY",
          "Family emergency mode ACTIVATED. Nominee portal access window is now unlocked."
        );
        showToast("EMERGENCY CRITICAL ACCESS MODE COMPASSIONATELY ACTIVATED!", "warning");
      } else {
        const { error } = await supabase
          .from("emergency_sessions")
          .update({
            status: "resolved",
            resolved_at: new Date().toISOString(),
          })
          .eq("user_id", userUid)
          .eq("status", "active");

        if (error) throw error;

        await logAuditAction(
          userUid,
          currentUser.name,
          currentUser.role as any,
          "RESOLVE_EMERGENCY",
          "Family emergency mode resolved. Active playbook archived."
        );
        showToast("Emergency mode deactivated. Restoring standard encryption.", "success");
      }
    } catch (err) {
      console.error("Error updating emergency session in Supabase:", err);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));

    if (!supabase || !currentUser) return;
    const userUid = currentUser.id.startsWith("nom_") ? currentUser.id.substring(4) : currentUser.id;
    if (!isValidUUID(userUid)) return;

    try {
      const doc = documents.find((d) => d.id === id);
      if (doc) {
        const bucket = doc.type === "Insurance" ? "insurance" : doc.type === "Medical Report" ? "medical" : doc.type === "Aadhaar" ? "identity" : "documents";
        const filePath = `${userUid}/${id}_${doc.fileName}`;

        // Delete from storage (fail silently if not present)
        await supabase.storage.from(bucket).remove([filePath]).catch(() => {});

        // Delete metadata
        const { error } = await supabase
          .from("documents")
          .delete()
          .eq("id", id);

        if (error) throw error;

        await logAuditAction(
          userUid,
          currentUser.name,
          currentUser.role as any,
          "DELETE_DOCUMENT",
          `Deleted document record: ${doc.fileName}`
        );
      }
    } catch (err) {
      console.error("Error deleting document from Supabase:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-800 antialiased font-sans">
      
      {/* ─── FLOATING TOAST BANNER (MODULE 2 CONFIRMATIONS) ─── */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`p-4 rounded-xl shadow-lg border flex items-start gap-3 ${
            toast.type === "success" 
              ? "bg-emerald-50 border-emerald-100 text-emerald-800"
              : toast.type === "warning"
              ? "bg-amber-50 border-amber-100 text-amber-800"
              : "bg-slate-900 border-slate-800 text-slate-100"
          }`}>
            <div className="mt-0.5">
              {toast.type === "success" && <ShieldCheck className="w-5 h-5 text-emerald-600" />}
              {toast.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-600" />}
              {toast.type === "info" && <Info className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="flex-1">
              <span className="text-xs font-bold block">
                {toast.type === "success" ? "Operation Succeeded" : toast.type === "warning" ? "Attention Needed" : "System Notification"}
              </span>
              <p className="text-xs mt-0.5 leading-relaxed font-medium">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-xs opacity-50 hover:opacity-100 font-bold ml-1 cursor-pointer">✕</button>
          </div>
        </div>
      )}

      {/* Database Loading State Cover */}
      {loadingDb && (
        <div className="fixed inset-0 z-50 bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-lg flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            Synchronizing LifeContinuityAI with Supabase backend...
          </div>
        </div>
      )}

      {/* ─── SECURITY SCREEN DETERMINATION ─── */}
      {!currentUser ? (
        showNomineeLogin ? (
          <NomineeLogin
            profile={profile}
            onBackToUser={() => setShowNomineeLogin(false)}
            onLoginSuccess={(user) => setCurrentUser(user)}
            showToast={showToast}
          />
        ) : (
          <LoginScreen
            onLoginSuccess={(user) => setCurrentUser(user)}
            onSwitchToNominee={() => setShowNomineeLogin(true)}
          />
        )
      ) : (
        /* ─── SECURED LOGGED IN LAYOUT ─── */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* ─── SUPABASE SCHEMA INITIALIZATION GUIDE ─── */}
          {false && hasSchemaError && !dismissedSchemaError && (
            <div className="bg-amber-50/95 backdrop-blur-sm border-2 border-amber-200 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-2.5 bg-amber-100 rounded-xl text-amber-800 shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <h3 className="text-sm font-extrabold text-amber-900 tracking-tight">
                      Supabase Database Schema Not Yet Initialized
                    </h3>
                    <p className="text-xs text-amber-800 font-medium leading-relaxed max-w-4xl">
                      Your application is successfully connected to Supabase, but the necessary database tables do not exist yet.
                      If you have already executed the SQL script, click <span className="font-bold text-amber-950">"Re-verify Schema"</span> below to establish active tracking!
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => {
                      setDbCheckTrigger(prev => prev + 1);
                      showToast("Re-verifying connection with Supabase database schema...", "info");
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
                  >
                    🔄 Re-verify Schema
                  </button>
                  <button
                    onClick={() => setShowSchemaGuide(!showSchemaGuide)}
                    className="px-3 py-1.5 bg-amber-200/60 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg border border-amber-300 transition-all cursor-pointer shadow-sm"
                  >
                    {showSchemaGuide ? "Hide Setup Steps" : "Show Setup Steps"}
                  </button>
                  <button
                    onClick={() => setDismissedSchemaError(true)}
                    className="px-3 py-1.5 bg-transparent hover:bg-amber-200/40 text-amber-800 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              {showSchemaGuide && (
                <div className="bg-white/70 border border-amber-200/50 rounded-xl p-4 space-y-3.5 text-xs text-slate-700 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div>
                    <h4 className="font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                      Execute SQL Script in Supabase
                    </h4>
                    <p className="text-slate-500 mt-1 pl-7">
                      Go to your <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-amber-800 underline font-bold">Supabase Dashboard</a>, navigate to the <span className="font-bold">SQL Editor</span>, create a new query, paste the script below, and click <span className="font-bold">"Run"</span>.
                    </p>
                  </div>

                  <div className="relative pl-7">
                    <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-72 shadow-inner border border-slate-800">
{`-- Create tables for LifeContinuityAI
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    age NUMERIC,
    blood_group TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    nominee_name TEXT,
    nominee_phone TEXT,
    nominee_pin TEXT,
    email_records JSONB DEFAULT '[]'::jsonb,
    calendar_events JSONB DEFAULT '[]'::jsonb,
    continuity_plan JSONB DEFAULT '{}'::jsonb,
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT,
    file_name TEXT,
    file_size TEXT,
    uploaded_date TEXT,
    notes TEXT,
    is_private BOOLEAN DEFAULT true,
    extraction JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.emergency_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    initiated_by TEXT,
    initiated_at TEXT,
    resolved_at TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.finance_items (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT,
    name TEXT,
    due_date TEXT,
    amount NUMERIC,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'Pending',
    category TEXT DEFAULT 'Appointments',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Header Panel */}
          <header className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center border border-amber-600/10 shadow-md">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900">LifeContinuityAI</span>
                <p className="text-xs text-slate-500 font-medium">
                  Family Vital Assets & Care Playbooks • Secured Vault Session
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 block">{currentUser.name}</span>
                <span className="text-[10px] font-semibold text-slate-400 block bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                  Role: {currentUser.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* ────────────────────────────────────────────────────────────────────────
              PRIMARY USER WORKSPACE (TABS DIRECTORY)
              ──────────────────────────────────────────────────────────────────────── */}
          {currentUser.role === "User" ? (
            <div className="space-y-6">
              {/* Primary User Tab bar list */}
              <nav className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-2">
                {[
                  { id: "dashboard", label: "Life Graph", icon: <CreditCard className="w-4 h-4" /> },
                  { id: "profile", label: "Emergency Profile", icon: <Heart className="w-4 h-4" /> },
                  { id: "vault", label: "Document Vault", icon: <FileText className="w-4 h-4" /> },
                  { id: "gmail", label: "Gmail Extractor", icon: <Mail className="w-4 h-4" /> },
                  { id: "planner", label: "Continuity Plan", icon: <ShieldAlert className="w-4 h-4" />, highlight: emergencyMode },
                  { id: "reminder", label: "Reminder Agent", icon: <Bell className="w-4 h-4" /> },
                  { id: "chatbot", label: "AI Chatbot", icon: <MessageSquare className="w-4 h-4" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-slate-900 text-white shadow-md"
                        : tab.highlight
                        ? "bg-rose-100 border border-rose-200 text-rose-700 hover:bg-rose-200"
                        : "bg-white hover:bg-slate-50 text-slate-600 border border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.highlight && <span className="w-2 h-2 bg-rose-600 rounded-full animate-ping ml-0.5" />}
                  </button>
                ))}
              </nav>

              {/* Tab Rendering Routing */}
              <main className="space-y-6">
                {activeTab === "dashboard" && (
                  <DashboardPanels
                    items={lifeItems}
                    onAddItem={handleAddItem}
                    onUpdateStatus={handleUpdateItemStatus}
                    onDeleteItem={handleDeleteItem}
                    showToast={showToast}
                  />
                )}

                {activeTab === "profile" && (
                  <div className="space-y-8">
                    <ProfileForm
                      initialProfile={profile}
                      onSave={(updatedProfile) => setProfile(updatedProfile)}
                      showToast={showToast}
                    />
                    <SecurityCenter />
                  </div>
                )}

                {activeTab === "vault" && (
                  <DocumentVault
                    documents={documents}
                    onAddDocument={(doc) => setDocuments((prev) => [doc, ...prev])}
                    onDeleteDocument={handleDeleteDocument}
                    onUpdateExtraction={(id, ext) =>
                      setDocuments((prev) =>
                        prev.map((doc) => (doc.id === id ? { ...doc, extraction: ext } : doc))
                      )
                    }
                    showToast={showToast}
                  />
                )}

                {activeTab === "gmail" && (
                  <GmailSimulator
                    emailRecords={emailRecords}
                    onSetEmailRecords={(recs) => setEmailRecords(recs)}
                    onSyncToLifeGraph={syncEmailRecordsToLifeGraph}
                    showToast={showToast}
                    currentUserEmail={currentUser.email}
                  />
                )}

                {activeTab === "planner" && (
                  <ContinuityPlanView
                    emergencyMode={emergencyMode}
                    onToggleEmergency={handleToggleEmergency}
                    continuityPlan={continuityPlan}
                    onSetContinuityPlan={(plan) => setContinuityPlan(plan)}
                    profile={profile}
                    items={lifeItems}
                    documents={documents}
                    emails={emailRecords}
                    showToast={showToast}
                  />
                )}

                {activeTab === "reminder" && (
                  <ReminderAgent
                    items={lifeItems}
                    showToast={showToast}
                  />
                )}

                {activeTab === "chatbot" && (
                  <ChatbotPanel
                    messages={messages}
                    onAddMessage={(msg) => setMessages((prev) => [...prev, msg])}
                    profile={profile}
                    emergencyMode={emergencyMode}
                    continuityPlan={continuityPlan}
                    calendarEvents={calendarEvents}
                    onUpdateCalendarEvents={(evts) => setCalendarEvents(evts)}
                    showToast={showToast}
                  />
                )}
              </main>
            </div>
          ) : (
            /* ────────────────────────────────────────────────────────────────────────
                SECURED NOMINEE VIEWPORT (READ-ONLY NOMINEE PORTAL)
                ──────────────────────────────────────────────────────────────────────── */
            <NomineeDashboard
              user={currentUser}
              profile={profile}
              continuityPlan={continuityPlan}
              items={lifeItems}
              documents={documents}
              emails={emailRecords}
              onLogout={handleLogout}
            />
          )}

        </div>
      )}

      {/* Footer copyright */}
      <footer className="py-12 text-center text-xs text-slate-400">
        © 2026 LifeContinuityAI Corp. All emergency vaults are locked with end-to-end client-side sandboxes.
      </footer>
    </div>
  );
}
