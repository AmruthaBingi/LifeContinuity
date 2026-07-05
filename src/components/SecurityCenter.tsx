import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, ShieldAlert, KeyRound, Monitor, LogOut, 
  Trash2, RefreshCw, Clipboard, CheckCircle, AlertTriangle, 
  Clock, Shield, Eye, EyeOff, UserCheck, Terminal, HelpCircle
} from "lucide-react";
import { authService } from "../lib/authService";

interface SessionInfo {
  sessionId: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
}

interface AuditLogEntry {
  id: string;
  eventType: string;
  status: "SUCCESS" | "FAILED" | "WARN";
  description: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export default function SecurityCenter() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User Profile status state
  const [mfaEnabled, setMfaEnabled] = useState(false);

  // MFA Setup states
  const [mfaSetupData, setMfaSetupData] = useState<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Active Sessions state
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  // Audit Logs state
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  // Load status, active sessions, and logs
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Check current profile state
      const me = await authService.checkSession();
      if (me.success && me.user) {
        setMfaEnabled(!!me.user.mfaEnabled);
      }
      
      // 2. Fetch Sessions
      const activeSessions = await authService.getSessions();
      setSessions(activeSessions);

      // 3. Fetch Audit Logs
      const auditLogs = await authService.getAuditLogs();
      setLogs(auditLogs);
    } catch (err: any) {
      setError(err.message || "Failed to load security center data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // MFA Configuration Methods
  const handleStartMfaSetup = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const data = await authService.setupMfa();
      setMfaSetupData({
        secret: data.secret,
        qrCode: data.qrCode,
        backupCodes: data.backupCodes
      });
      setShowSetup(true);
    } catch (err: any) {
      setError(err.message || "Could not initialize MFA setup.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await authService.verifyMfa(verificationCode, true);
      if (res.success) {
        setMfaEnabled(true);
        setShowSetup(false);
        setMfaSetupData(null);
        setVerificationCode("");
        setSuccess("Multi-Factor Authentication has been successfully enabled on your account!");
        loadData();
      }
    } catch (err: any) {
      setError(err.message || "MFA activation verification failed. Re-enter code.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    const code = prompt("Please provide your current 6-digit authenticator code to confirm disablement:");
    if (!code) return;

    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await authService.disableMfa(code);
      setMfaEnabled(false);
      setSuccess("Multi-Factor Authentication has been disabled.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to disable MFA. Incorrect verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Session Revocation Methods
  const handleRevokeSession = async (sessionId: string) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await authService.revokeSession(sessionId);
      setSuccess("Session terminated successfully.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to terminate session.");
      setLoading(false);
    }
  };

  const handleRevokeAllOther = async () => {
    if (!confirm("Are you sure you want to log out all other active devices?")) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await authService.revokeAllOtherSessions();
      setSuccess("Successfully revoked all other active sessions.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to revoke sessions.");
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (!mfaSetupData) return;
    navigator.clipboard.writeText(mfaSetupData.backupCodes.join("\n"));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl shrink-0">
            <ShieldCheck className="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight">Security & Device Center</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure Multi-Factor Authentication, audit active device sessions, and track real-time security alerts.
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-3.5 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 bg-white shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Reload Panel
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold block">Security Alert / Error</span>
            <p className="mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold block">Success</span>
            <p className="mt-0.5 leading-relaxed">{success}</p>
          </div>
        </div>
      )}

      {/* Grid: MFA Setup & Active Session List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Hand: Multi-Factor Authentication */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-slate-400" />
            Two-Factor Auth (MFA)
          </h3>

          <div className={`p-5 rounded-2xl border transition-all ${
            mfaEnabled 
              ? "bg-emerald-50/50 border-emerald-150" 
              : "bg-slate-50/50 border-slate-200"
          }`}>
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                mfaEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
              }`}>
                {mfaEnabled ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6 animate-pulse" />}
              </div>
              <div className="min-w-0 space-y-1">
                <span className="text-xs font-black text-slate-900 block">
                  Status: {mfaEnabled ? "SECURED (MFA ENABLED)" : "UNSECURED (MFA DISABLED)"}
                </span>
                <p className="text-[11px] text-slate-500 leading-normal font-medium">
                  {mfaEnabled 
                    ? "Your account requires an authenticator code alongside password authorization." 
                    : "Highly recommended. Add an extra protective layer against credential harvesting."}
                </p>
              </div>
            </div>

            <div className="mt-5">
              {mfaEnabled ? (
                <button
                  onClick={handleDisableMfa}
                  disabled={loading}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold py-2 rounded-xl text-xs transition-all active:scale-[0.98] cursor-pointer"
                >
                  Disable Multi-Factor Security
                </button>
              ) : (
                !showSetup && (
                  <button
                    onClick={handleStartMfaSetup}
                    disabled={loading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2 rounded-xl text-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4" /> Enable MFA Authenticator
                  </button>
                )
              )}
            </div>
          </div>

          {/* MFA Activation Wizard */}
          {showSetup && mfaSetupData && (
            <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-md space-y-4 animate-in slide-in-from-top-4 duration-300">
              <span className="text-xs font-extrabold text-slate-900 block">Setup Authenticator App</span>
              
              <div className="flex flex-col items-center text-center p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2.5">
                <p className="text-[10px] text-slate-500 max-w-[240px]">
                  Scan the QR code below using your favorite authenticator app (e.g. Google Authenticator, Duo, or Bitwarden).
                </p>
                {/* QR Code Container */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <img 
                    src={mfaSetupData.qrCode} 
                    alt="Authenticator QR Code" 
                    className="w-44 h-44 border border-slate-100 rounded"
                  />
                </div>
                <div className="w-full text-left space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Manual Configuration Key:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      readOnly
                      value={mfaSetupData.secret}
                      className="w-full p-1.5 rounded bg-white text-[10px] border border-slate-200 font-mono text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Recovery codes block */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-start gap-2 text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10.5px] font-black">Save Backup Recovery Codes</span>
                    <p className="text-[9.5px] leading-normal font-medium mt-0.5">
                      Each code is single-use. If you ever lose your phone, these are the ONLY way to regain entrance.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-1.5 py-1.5 font-mono text-[10px] font-black text-slate-800 text-center">
                  {mfaSetupData.backupCodes.map((c, idx) => (
                    <div key={idx} className="bg-white px-2 py-1 rounded border border-slate-200">
                      {c}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={copyBackupCodes}
                  className="w-full py-1 bg-amber-100 hover:bg-amber-150 text-amber-800 font-bold text-[9.5px] rounded border border-amber-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  {copiedCodes ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Copy Backup Codes</span>
                    </>
                  )}
                </button>
              </div>

              {/* Verification challenge */}
              <form onSubmit={handleVerifyAndEnableMfa} className="space-y-2.5 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Verify Authenticator Code</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter 6-digit dynamic code"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full p-2 text-center tracking-widest font-bold font-mono text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSetup(false);
                      setMfaSetupData(null);
                    }}
                    className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel Wizard
                  </button>
                  <button
                    type="submit"
                    disabled={verificationCode.length !== 6}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Activate MFA
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Hand: Active Sessions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-slate-400" />
              Active Sessions & Device Registry
            </h3>
            {sessions.length > 1 && (
              <button
                onClick={handleRevokeAllOther}
                disabled={loading}
                className="text-[10px] font-extrabold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none"
              >
                <LogOut className="w-3.5 h-3.5" /> Terminate Other Sessions
              </button>
            )}
          </div>

          <div className="space-y-3">
            {sessions.map((sess) => (
              <div 
                key={sess.sessionId} 
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                  sess.isCurrent 
                    ? "bg-blue-50/35 border-blue-200/60" 
                    : "bg-white hover:bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    sess.isCurrent ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    <Monitor className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-900 truncate">
                        {sess.userAgent.includes("Chrome") ? "Google Chrome" : sess.userAgent.includes("Firefox") ? "Mozilla Firefox" : sess.userAgent.includes("Safari") ? "Apple Safari" : "Browser Session"}
                      </span>
                      {sess.isCurrent && (
                        <span className="bg-blue-500/15 border border-blue-500/20 text-blue-700 text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase">
                          Current Device
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">
                      IP Address: <span className="text-slate-600 font-bold">{sess.ipAddress}</span>
                    </p>
                    <p className="text-[9.5px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-300" /> Login: {new Date(sess.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {!sess.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(sess.sessionId)}
                    disabled={loading}
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-transparent hover:border-rose-100 transition-all cursor-pointer shrink-0"
                    title="Terminate session immediately"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Security Audit Timeline */}
      <div className="border-t border-slate-100 pt-6 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-slate-400" />
          Cryptographic Security Logs & Audit Trail
        </h3>

        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-950 font-mono text-xs max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="p-5 text-slate-500 text-center text-[11px] font-medium leading-relaxed">
              No audit records generated under active session context.
            </p>
          ) : (
            <table className="w-full border-collapse text-left text-[11px]">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[10px] font-extrabold uppercase">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Event Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 font-medium text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/45 transition-colors">
                    <td className="p-3 text-slate-400 shrink-0 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-3 font-bold text-blue-400 whitespace-nowrap">
                      {log.eventType}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black ${
                        log.status === "SUCCESS" 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : log.status === "FAILED"
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-200">
                      {log.description}
                    </td>
                    <td className="p-3 text-slate-400 font-mono whitespace-nowrap">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
