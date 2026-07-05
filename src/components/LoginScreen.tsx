import React, { useState, useEffect } from "react";
import { 
  Mail, 
  Lock, 
  User, 
  Shield, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Sparkles,
  Clock,
  Users,
  Activity,
  ChevronLeft,
  ChevronRight,
  FileText,
  Database,
  Key,
  Check,
  Smartphone,
  AlertCircle,
  Heart,
  Printer,
  Wifi,
  Radio
} from "lucide-react";
import { authService } from "../lib/authService";
import { supabase } from "../lib/supabaseClient";

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
  onSwitchToNominee: () => void;
}

const CAROUSEL_SLIDES = [
  {
    type: "monitor",
    badgeText: "Medical Crisis Support",
    badgeIcon: Heart,
    badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/25",
    title: "Immediate Access in Golden Minutes",
    description: "When a family member undergoes sudden emergency hospitalization, instant access to pre-registered blood types, medical history, and pre-approved living wills protects them when seconds count.",
    diagramHeader: "PATIENT MONITOR: REDDY, S. (ICU)",
    diagramPill: "CRITICAL STATUS",
    diagramPillColor: "border-rose-500/40 text-rose-400 bg-rose-500/5",
    bpmVal: "84",
    spo2Val: "98%",
    footerText: "Advance Health Directive & Liv...",
    footerStat: "SECURE UNLOCK",
  },
  {
    type: "offline",
    badgeText: "Offline Disaster Support",
    badgeIcon: AlertCircle,
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    title: "Offline Contingency Playbooks",
    description: "If natural disasters collapse cellular towers or internet grids, export physical crypt-signed emergency booklet PDFs. Fully functional offline support for rescue and medical personnel.",
    diagramHeader: "OFFLINE CRISIS MODE",
    diagramPill: "COMMUNICATION DARK",
    diagramPillColor: "border-rose-500/40 text-rose-400 bg-rose-500/5",
    centerTitle: "SECURE PHYSICAL CONTINUITY BOOKLET",
    centerDesc: "Exported physical contingency guides. Verified with offline cryptographic watermark to ensure full reliability during network blackouts.",
    footerText: "Signals: 0% / Inoperable",
    footerStat: "OFFLINE PDF SAFE",
  },
  {
    type: "nodes",
    badgeText: "Nominee Coordination",
    badgeIcon: Key,
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    title: "Empowering Your Chosen Guardians",
    description: "In heavy times, prevent assets from being locked away. Securely delegate title deeds, locker keys, and credentials to authorized nominees via physical OTPs + double PIN locks.",
    diagramHeader: "DECENTRALIZED VAULT SECURE RELEASE",
    diagramPill: "RELEASE KEY ACTIVE",
    diagramPillColor: "border-amber-500/40 text-amber-400 bg-amber-500/5",
    leftLabel: "Owner Vault",
    leftIcon: Shield,
    leftColor: "border-blue-500/30 bg-[#131d35] text-blue-400",
    centerLabel: "PropertyDeed.pdf.crypt",
    centerIcon: FileText,
    centerColor: "border-amber-500/30 bg-[#1a1c23] text-amber-400",
    rightLabel: "Nominee Portal",
    rightIcon: User,
    rightColor: "border-amber-500/30 bg-[#1d1b1c] text-amber-400",
    footerText: "Requires Verified Nominee OTP ...",
    footerStat: "AES-256 BIT",
    footerStatColor: "text-emerald-400 font-mono",
  }
];

export default function LoginScreen({ onLoginSuccess, onSwitchToNominee }: LoginScreenProps) {
  const [mode, setMode] = useState<"login" | "signup" | "request_reset" | "reset_password">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Carousel States
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance Carousel slide
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [isPaused]);

  React.useEffect(() => {
    if (!supabase) return;

    // Listen to Supabase auth events specifically for PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset_password");
      }
    });

    // Handle hash recovery tokens manually if routed or loaded directly
    const hash = window.location.hash;
    if (hash) {
      if (hash.includes("type=recovery")) {
        setMode("reset_password");
      } else if (hash.includes("error_code=otp_expired")) {
        setErrorMsg("The email link has expired or is invalid. Please request a new one.");
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const data = await authService.login(email, password);
      if (data.success && data.user) {
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Incorrect email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const data = await authService.signUp(email, password, name);
      if (data.success) {
        if (data.session && data.user) {
          onLoginSuccess(data.user);
        } else {
          setSuccessMsg(data.message || "Registration successful! Please check your email to confirm your account.");
          setMode("login");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const data = await authService.requestPasswordReset(email);
      setSuccessMsg(data.message || "Password reset link sent! Check your email.");
      setMode("reset_password");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to dispatch password reset link.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const data = await authService.resetPassword("", password);
      setSuccessMsg(data.message || "Password updated successfully. You can now log in.");
      setPassword("");
      setMode("login");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update password. Please try requesting a new link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300 max-w-5xl mx-auto w-full">
      <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[640px]">
        
        {/* Left Column: Premium Interactive Carousel */}
        <div 
          className="hidden md:flex md:col-span-6 bg-[#070a13] text-white relative p-10 flex-col justify-between overflow-hidden select-none border-r border-slate-900"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Ambient Background Glow Effect */}
          <div className="absolute inset-0 bg-radial from-blue-950/20 via-slate-950/90 to-slate-950 z-0" />
          <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none z-0" />
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-indigo-900/10 to-transparent pointer-events-none z-0" />

          {/* Top Row: Branding */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-1">
                LifeContinuity<span className="text-blue-400">AI</span>
              </h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                Family Emergency Readiness
              </p>
            </div>
          </div>

          {/* Carousel Slide Area */}
          <div className="relative z-10 my-auto py-8 min-h-[440px] flex flex-col justify-center">
            {CAROUSEL_SLIDES.map((slide: any, index) => {
              const BadgeIcon = slide.badgeIcon;

              return (
                <div
                  key={index}
                  className={`transition-all duration-700 ease-in-out flex flex-col ${
                    index === activeSlide 
                      ? "opacity-100 translate-x-0 scale-100 animate-in fade-in slide-in-from-right-4 duration-500" 
                      : "absolute inset-0 opacity-0 pointer-events-none -translate-x-12 scale-95"
                  }`}
                >
                  {/* Dynamic Badge Above Diagram */}
                  <div className={`flex items-center gap-1.5 px-3 py-1 border rounded-full text-[11px] font-bold tracking-wide w-fit mb-5 ${slide.badgeColor}`}>
                    <BadgeIcon className="w-3.5 h-3.5 animate-pulse" />
                    <span>{slide.badgeText}</span>
                  </div>

                  {/* Interactive Diagram Card (matching the screenshot exactly) */}
                  <div className="bg-[#0f1524] border border-slate-800/80 rounded-2xl p-5 mb-6 max-w-md shadow-2xl relative overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1.5 text-[9px] tracking-wider text-slate-400 font-mono font-bold">
                        {slide.type === "monitor" ? (
                          <Activity className="w-3.5 h-3.5 text-rose-500" />
                        ) : slide.type === "offline" ? (
                          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span>{slide.diagramHeader}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[8px] font-black tracking-widest rounded border uppercase bg-black/40 ${slide.diagramPillColor}`}>
                        {slide.diagramPill}
                      </span>
                    </div>

                    {/* Rendering different body layouts */}
                    {slide.type === "monitor" ? (
                      /* Medical ICU Patient Monitor layout */
                      <div className="flex flex-col gap-4 my-3">
                        <div className="grid grid-cols-12 items-center gap-2">
                          {/* Col 1: BPM Metric */}
                          <div className="col-span-4 flex flex-col">
                            <div className="text-3xl font-extrabold text-rose-500 font-mono tracking-tight flex items-baseline leading-none">
                              {slide.bpmVal}
                              <span className="text-[10px] font-black text-rose-500 ml-1">BPM</span>
                            </div>
                            <div className="flex items-center gap-1 text-[8px] text-rose-400 font-bold uppercase tracking-wider mt-1.5">
                              <Heart className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" />
                              <span>CARDIAC RHYTHM</span>
                            </div>
                          </div>

                          {/* Col 2: ECG Wave SVG */}
                          <div className="col-span-4 flex items-center justify-center">
                            <svg viewBox="0 0 100 30" className="w-full h-8 stroke-rose-500 fill-none stroke-[2] overflow-visible">
                              <path d="M 0 15 L 15 15 L 20 25 L 25 5 L 30 20 L 33 15 L 45 15 L 48 28 L 52 2 L 56 22 L 60 15 L 75 15 L 78 23 L 81 8 L 84 15 L 100 15" className="animate-pulse" />
                            </svg>
                          </div>

                          {/* Col 3: SpO2 Metric */}
                          <div className="col-span-4 flex flex-col items-end">
                            <div className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight flex items-baseline justify-end leading-none">
                              {slide.spo2Val}
                              <span className="text-[10px] font-black text-emerald-400 ml-1">SpO2</span>
                            </div>
                            <div className="flex items-center justify-end gap-1 text-[8px] text-emerald-400 font-bold uppercase tracking-wider mt-1.5">
                              <Activity className="w-3 h-3 text-emerald-400" />
                              <span>PULSE OXIMETRY</span>
                            </div>
                          </div>
                        </div>

                        {/* Separate divider before footer inside Card */}
                        <div className="w-full border-t border-slate-800/40 my-1" />
                      </div>
                    ) : slide.type === "offline" ? (
                      /* Offline Disaster Support Booklet layout */
                      <div className="flex flex-col gap-3 my-2">
                        <div className="bg-black/45 border border-slate-800/70 rounded-xl p-3.5 flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                            <Printer className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div className="flex flex-col">
                            <h4 className="text-[10px] font-extrabold text-white tracking-wider font-mono">
                              {slide.centerTitle}
                            </h4>
                            <p className="text-[9px] text-slate-400 font-medium leading-relaxed mt-1">
                              {slide.centerDesc}
                            </p>
                          </div>
                        </div>
                        <div className="w-full border-t border-slate-800/40 my-0.5" />
                      </div>
                    ) : (
                      /* Standard 3-node diagram layout */
                      <div className="flex items-center justify-between my-5 relative min-h-[72px]">
                        {/* Left Node */}
                        <div className="flex flex-col items-center z-10 w-20">
                          <div className={`w-11 h-11 border rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 duration-300 ${slide.leftColor}`}>
                            {React.createElement(slide.leftIcon, { className: "w-5 h-5" })}
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold tracking-wide mt-2 text-center">
                            {slide.leftLabel}
                          </span>
                        </div>

                        {/* Connecting Line with Middle File Badge */}
                        <div className="flex-1 h-0.5 border-t border-dashed border-slate-700 mx-1 relative flex items-center justify-center">
                          {/* Golden file pill in middle */}
                          <div className={`absolute z-10 flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-[9px] font-mono tracking-tight font-black shadow-xl -translate-y-1/2 whitespace-nowrap bg-[#0b0f19] ${slide.centerColor}`}>
                            {React.createElement(slide.centerIcon, { className: "w-3.5 h-3.5" })}
                            <span>{slide.centerLabel}</span>
                          </div>
                        </div>

                        {/* Right Node */}
                        <div className="flex flex-col items-center z-10 w-20">
                          <div className={`w-11 h-11 border rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 duration-300 ${slide.rightColor}`}>
                            {React.createElement(slide.rightIcon, { className: "w-5 h-5" })}
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold tracking-wide mt-2 text-center">
                            {slide.rightLabel}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Footer Row inside Card */}
                    <div className="pt-2 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                      <div className="flex items-center gap-1.5">
                        {slide.type === "offline" ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : slide.type === "monitor" ? (
                          <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        ) : null}
                        <span className={slide.type === "offline" ? "text-rose-500 font-bold font-mono" : ""}>
                          {slide.footerText}
                        </span>
                      </div>
                      
                      {slide.type === "monitor" ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-black tracking-wide bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg">
                          <Shield className="w-3 h-3 fill-blue-500/20" />
                          <span>{slide.footerStat}</span>
                        </span>
                      ) : slide.type === "offline" ? (
                        <span className="px-2 py-0.5 text-[8px] font-black tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded font-mono uppercase">
                          {slide.footerStat}
                        </span>
                      ) : (
                        <span className={slide.footerStatColor}>
                          {slide.footerStat}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Text Description Below Diagram */}
                  <h3 className="text-xl font-black text-white tracking-tight leading-snug mb-2">
                    {slide.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-sm font-medium">
                    {slide.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Bottom Row: Manual Controls & Pagination Indicators */}
          <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5">
            {/* Dots */}
            <div className="flex gap-2.5">
              {CAROUSEL_SLIDES.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === activeSlide 
                      ? "w-8 bg-blue-500" 
                      : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            {/* Arrows */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSlide((prev) => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all cursor-pointer hover:text-blue-400 active:scale-95"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all cursor-pointer hover:text-blue-400 active:scale-95"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Form Panel */}
        <div className="col-span-12 md:col-span-6 p-8 sm:p-10 flex flex-col justify-center bg-white">
          
          {/* Mobile Only Branding */}
          <div className="flex flex-col items-center text-center mb-8 md:hidden">
            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center mb-3">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              LifeContinuity<span className="text-blue-600">AI</span>
            </h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">
              Family Emergency Readiness
            </p>
          </div>

          {/* Status Messages */}
          {errorMsg && (
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="font-bold block text-rose-900">Access Error</span>
                <p className="mt-0.5 leading-relaxed font-semibold">{errorMsg}</p>
              </div>
            </div>

            {/* Detect Email Rate Limits and render beautiful debug instructions */}
            {(errorMsg.toLowerCase().includes("rate") || 
              errorMsg.toLowerCase().includes("limit") || 
              errorMsg.toLowerCase().includes("exceeded") || 
              errorMsg.toLowerCase().includes("otp")) && (
              <div className="p-4 bg-blue-50 border border-blue-100 text-blue-900 rounded-xl text-xs space-y-3 animate-in slide-in-from-top-1 duration-300">
                <div className="font-bold text-blue-950 flex items-center gap-1.5">
                  <Shield className="w-4.5 h-4.5 text-blue-600" />
                  <span>How to fix this in Supabase:</span>
                </div>
                
                <p className="leading-relaxed text-slate-600 text-[11px]">
                  Supabase free-tier restricts sending registration or password reset emails. You can completely turn off email verification in 2 minutes:
                </p>

                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-700 font-medium">
                  <li>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold">Supabase Dashboard</a>.</li>
                  <li>Go to <span className="font-bold text-slate-900">Authentication</span> (sidebar) &rarr; <span className="font-bold text-slate-900">Providers</span> &rarr; <span className="font-bold text-slate-900">Email</span>.</li>
                  <li>Toggle <span className="font-bold text-rose-600">Confirm email</span> to <span className="font-bold text-emerald-600">OFF</span>.</li>
                  <li>Click <span className="font-bold text-slate-900">Save</span>.</li>
                </ol>

                <div className="border-t border-blue-100 pt-3 flex flex-col gap-2">
                  <p className="text-[10px] text-slate-500 font-medium">
                    Or skip configuration entirely and enter sandbox testing:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onLoginSuccess({
                        id: "sandbox-demo-user",
                        email: email || "sandbox@lifecontinuity.ai",
                        name: name || "Sandbox Tester",
                        role: "User",
                      });
                    }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer"
                  >
                    <span>Instant Sandbox Bypass (Log In Now)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="font-bold block">Action Completed</span>
              <p className="mt-0.5 leading-relaxed">{successMsg}</p>
            </div>
          </div>
        )}

        {/* 1. LOGIN MODE */}
        {mode === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-slate-900 bg-slate-50/50 hover:bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                <button 
                  type="button"
                  onClick={() => {
                    setMode("request_reset");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:underline bg-transparent border-none cursor-pointer p-0"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-slate-900 bg-slate-50/50 hover:bg-slate-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md active:scale-[0.99] disabled:opacity-75 flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              {loading ? (
                <span className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin"></span>
              ) : (
                "Log In"
              )}
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <button
              type="button"
              onClick={() => {
                onLoginSuccess({
                  id: "sandbox-demo-user",
                  email: email || "sandbox@lifecontinuity.ai",
                  name: name || "Sandbox Tester",
                  role: "User",
                });
              }}
              className="w-full bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
            >
              <span>Explore Sandbox Demo (No Sign Up Needed)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div className="text-center mt-5">
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer bg-transparent border-none"
              >
                Don't have an account? Sign Up
              </button>
            </div>
          </form>
        )}

        {/* 2. SIGNUP MODE */}
        {mode === "signup" && (
          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="First and last name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-slate-900 bg-slate-50/50 hover:bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-slate-900 bg-slate-50/50 hover:bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-slate-900 bg-slate-50/50 hover:bg-slate-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md active:scale-[0.99] disabled:opacity-75 flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              {loading ? (
                <span className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin"></span>
              ) : (
                "Create Account"
              )}
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <button
              type="button"
              onClick={() => {
                onLoginSuccess({
                  id: "sandbox-demo-user",
                  email: email || "sandbox@lifecontinuity.ai",
                  name: name || "Sandbox Tester",
                  role: "User",
                });
              }}
              className="w-full bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
            >
              <span>Explore Sandbox Demo (Instant Access)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div className="text-center mt-5">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer bg-transparent border-none"
              >
                Already have an account? Log In
              </button>
            </div>
          </form>
        )}

        {/* 3. REQUEST RESET MODE */}
        {mode === "request_reset" && (
          <form onSubmit={handleRequestResetSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-slate-900 bg-slate-50/50 hover:bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md active:scale-[0.99] disabled:opacity-75 flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              {loading ? (
                <span className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin"></span>
              ) : (
                "Send Reset Link"
              )}
            </button>

            <div className="text-center mt-5">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer bg-transparent border-none"
              >
                ← Return to Log In
              </button>
            </div>
          </form>
        )}

        {/* 4. RESET PASSWORD MODE */}
        {mode === "reset_password" && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-slate-900 bg-slate-50/50 hover:bg-slate-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md active:scale-[0.99] disabled:opacity-75 flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              {loading ? (
                <span className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin"></span>
              ) : (
                "Update Password"
              )}
            </button>

            <div className="text-center mt-5">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer bg-transparent border-none"
              >
                ← Return to Log In
              </button>
            </div>
          </form>
        )}

        {/* Nominee Access Switcher */}
        <div className="border-t border-slate-100 mt-6 pt-5 text-center">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Are you an authorized Nominee?
          </p>
          <button
            onClick={onSwitchToNominee}
            className="text-xs font-black text-slate-700 hover:text-blue-600 underline mt-2.5 cursor-pointer bg-transparent border-none flex items-center justify-center gap-1 mx-auto font-sans"
          >
            <span>Access Nominee Portal (OTP + PIN)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  </div>
  );
}
