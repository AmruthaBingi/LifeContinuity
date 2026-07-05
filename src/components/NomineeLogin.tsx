import React, { useState } from "react";
import { Phone, Lock, Shield, Key, ArrowRight, RefreshCw, Send } from "lucide-react";
import { EmergencyProfile, User } from "../types";

interface NomineeLoginProps {
  onLoginSuccess: (user: User) => void;
  profile: EmergencyProfile;
  onBackToUser: () => void;
  showToast: (message: string, type: "success" | "info" | "warning") => void;
}

export default function NomineeLogin({ onLoginSuccess, profile, onBackToUser, showToast }: NomineeLoginProps) {
  const [phone, setPhone] = useState(profile.nomineePhone || "");
  const [step, setStep] = useState<"phone" | "otp" | "pin">("phone");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  // Simulated OTP code that gets sent
  const [sentCode, setSentCode] = useState("8829");

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;

    // Validate phone matching profile nominee phone
    if (phone.replace(/\D/g, "") !== profile.nomineePhone.replace(/\D/g, "")) {
      showToast("Phone number does not match registered nominee details.", "warning");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
      showToast("SMS OTP successfully dispatched via SMS API Connector. (Hint: Code is 1234)", "info");
    }, 800);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    if (otp !== "1234") {
      showToast("Invalid OTP code. Please retry.", "warning");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("pin");
      showToast("OTP verified successfully. Please enter your Emergency PIN.", "success");
    }, 600);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    // PIN configured in ProfileForm (Default is 8829)
    if (pin !== profile.nomineePin) {
      showToast("Incorrect Emergency PIN. Verification failed.", "warning");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess({
        id: "nom_8829",
        email: "nominee@familycontinuity.org",
        name: profile.nomineeName,
        role: "Nominee",
      });
      showToast(`Welcome authorized Nominee: ${profile.nomineeName}. Dashboard unlocked.`, "success");
    }, 800);
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden p-8 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-50/50 rounded-xl flex items-center justify-center mb-4 border border-blue-100">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Nominee Verification Portal</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            Multi-factor verification required. Enter your registered mobile, SMS OTP, and confidential Emergency Access PIN to unlock data vaults.
          </p>
        </div>

        {/* STEP 1: MOBILE ENTRY */}
        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Registered Nominee Mobile</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 bg-slate-50 p-2 border border-slate-200 rounded">
                Note for testing: Must match the Nominee phone saved in your Emergency Profile settings ({profile.nomineePhone}).
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-medium py-2.5 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  Request OTP Code <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: SMS OTP ENTRY */}
        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Enter 4-Digit SMS OTP Code</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  maxLength={4}
                  placeholder="e.g. 1234"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
              <p className="text-[10px] text-blue-600 font-semibold mt-1">
                Enter "1234" for the sandbox simulation passcode verification.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-medium py-2.5 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  Verify SMS OTP <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 3: EMERGENCY ACCESS PIN ENTRY */}
        {step === "pin" && (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Confidential Emergency Access PIN</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                This is the Emergency PIN configured in the user's settings profile. (Hint: "{profile.nomineePin}")
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  Unlock Nominee Vault
                </>
              )}
            </button>
          </form>
        )}

        <div className="border-t border-slate-200 pt-4 text-center">
          <button
            onClick={onBackToUser}
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 underline cursor-pointer"
          >
            Back to Primary User Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
