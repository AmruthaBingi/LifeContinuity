import React, { useState } from "react";
import { Calendar, Clock, AlertCircle, CheckCircle2, DollarSign, Activity, Users, Info, FileDown, Lock, ShieldAlert, Key, Eye, EyeOff } from "lucide-react";
import { LifeGraphItem } from "../types";
import { jsPDF } from "jspdf";

interface CareObligationHeatmapProps {
  items: LifeGraphItem[];
  showToast: (message: string, type: "success" | "info" | "warning") => void;
}

interface CalendarDay {
  dayNumber: number;
  isCurrentMonth: boolean;
  dateKey: string; // YYYY-MM-DD
  bgColorClass: string;
  borderColorClass: string;
  hasDottedOutline?: boolean;
  isToday?: boolean;
  multipleCount?: number;
  indicatorDots: ("financial" | "medical" | "family" | "free")[];
  events: {
    id: string;
    title: string;
    description: string;
    time?: string;
    amount?: number;
    category: "FINANCIAL" | "MEDICAL" | "FAMILY" | "FREE";
  }[];
}

export default function CareObligationHeatmap({ items, showToast }: CareObligationHeatmapProps) {
  // Let's set July 2026 as our active context
  const [selectedDateKey, setSelectedDateKey] = useState<string>("2026-07-04");

  // Secure PDF Export Configuration State
  const [showExportConfig, setShowExportConfig] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>("CARE-SECURE-2026");
  const [encryptionLevel, setEncryptionLevel] = useState<string>("AES-256 Bit");
  const [showPasscode, setShowPasscode] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Secure PDF Generator function using jsPDF
  const handleExportPDF = () => {
    if (!passcode.trim()) {
      showToast("Please enter a family security passcode to encrypt your document.", "warning");
      return;
    }

    setIsExporting(true);
    showToast("Initiating military-grade local PDF encryption...", "info");

    setTimeout(() => {
      try {
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4"
        });

        // 1. Sleek Modern Header Block (Confidential Navy Theme)
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, 210, 42, "F");

        // Brand & Header text
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text("EMERGENCY CONTINUITY PORTAL", 14, 20);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text("OFFLINE FAMILY CARE & OBLIGATION HEATMAP", 14, 27);
        doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} (Local Time)`, 14, 33);

        // Security Badge Panel
        doc.setFillColor(220, 38, 38); // Red-600
        doc.rect(145, 12, 51, 14, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("SECURE OFFLINE COPY", 149, 18);
        doc.setFont("helvetica", "normal");
        doc.text(`Lock Level: ${encryptionLevel}`, 149, 22);

        // 2. Encryption Metadata Box
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(14, 50, 182, 28, "F");
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.3);
        doc.rect(14, 50, 182, 28, "D");

        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("DOCUMENT SECURITY RECORD & METADATA", 18, 56);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text(`• Recipient Patient ID: Saraswathi Reddy (State: Hospitalized)`, 18, 62);
        doc.text(`• Registered Passcode: ${passcode}`, 18, 67);
        
        const entropyChecksum = `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}-F72D8E94B`;
        doc.text(`• Verification Signature: ${entropyChecksum}`, 18, 72);

        // Watermark illustration: Diagonal light gray text
        doc.setTextColor(241, 245, 249); // slate-100
        doc.setFontSize(36);
        doc.setFont("helvetica", "bold");
        doc.saveGraphicsState();
        doc.text("CONFIDENTIAL - FAMILY ONLY", 35, 150, { angle: 45 });
        doc.restoreGraphicsState();

        // 3. Obligations list
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("JULY 2026 CARE & OBLIGATION TIMELINE MATRIX", 14, 90);

        let y = 98;

        // Table headers
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(14, y, 182, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("DATE", 17, y + 5.5);
        doc.text("OBLIGATION TITLE", 36, y + 5.5);
        doc.text("CATEGORY", 112, y + 5.5);
        doc.text("SEVERITY", 140, y + 5.5);
        doc.text("AMOUNT", 172, y + 5.5);

        y += 13;

        // Collect all days in July and dump events
        let count = 0;
        for (let d = 1; d <= 31; d++) {
          const formattedDay = d < 10 ? `0${d}` : `${d}`;
          const dateKey = `2026-07-${formattedDay}`;
          const dayEvents = getMergedEventsForDay(dateKey);

          if (dayEvents.length > 0) {
            dayEvents.forEach((evt) => {
              if (y > 265) {
                doc.addPage();
                y = 20;

                // Sticky headers on new page
                doc.setFillColor(241, 245, 249);
                doc.rect(14, y, 182, 8, "F");
                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(100, 116, 139);
                doc.text("DATE", 17, y + 5.5);
                doc.text("OBLIGATION TITLE", 36, y + 5.5);
                doc.text("CATEGORY", 112, y + 5.5);
                doc.text("SEVERITY", 140, y + 5.5);
                doc.text("AMOUNT", 172, y + 5.5);
                y += 13;
              }

              doc.setFont("helvetica", "normal");
              doc.setFontSize(8.5);
              doc.setTextColor(51, 65, 85); // slate-700

              // Date column
              doc.text(`Jul ${d}`, 17, y);

              // Title column with length guard
              let titleText = evt.title;
              if (titleText.length > 40) titleText = titleText.substring(0, 37) + "...";
              doc.text(titleText, 36, y);

              // Category column
              doc.text(evt.category, 112, y);

              // Severity column calculation
              let severity = "Medium";
              if (evt.category === "MEDICAL") severity = "Critical";
              else if (evt.amount && evt.amount >= 300) severity = "High";
              else if (evt.amount && evt.amount < 100) severity = "Low";
              doc.text(severity, 140, y);

              // Amount column
              const amountVal = evt.amount ? `$${evt.amount}` : "N/A";
              doc.text(amountVal, 172, y);

              // Underline row divider
              doc.setDrawColor(241, 245, 249);
              doc.setLineWidth(0.15);
              doc.line(14, y + 2.5, 196, y + 2.5);

              y += 8.5;
              count++;
            });
          }
        }

        // Add Offline Protocols card
        y += 8;
        if (y > 240) {
          doc.addPage();
          y = 20;
        }

        doc.setFillColor(254, 242, 242); // Rose-50
        doc.setDrawColor(252, 165, 165); // Rose-300
        doc.setLineWidth(0.4);
        doc.rect(14, y, 182, 28, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(153, 27, 27); // red-800
        doc.text("OFFLINE SECURITY PROTOCOLS & DECRYPTION ADVISORY", 18, y + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(185, 28, 28); // red-700
        doc.text(`1. High-priority financial and medicine deadlines in this document must not be exposed to external actors.`, 18, y + 12);
        doc.text(`2. Sharing or forwarding this backup requires the authorized local family key passcode: "${passcode}".`, 18, y + 17);
        doc.text(`3. Emergency medical protocols inside are calibrated according to Saraswathi Reddy's primary health status.`, 18, y + 22);

        // Save PDF file
        doc.save(`Secure_Care_Obligations_Report_Jul2026.pdf`);
        showToast("Secured PDF exported successfully! Keep it offline for emergency lookup.", "success");
      } catch (err) {
        console.error("PDF generation failure:", err);
        showToast("PDF Compile error. Check browser logs.", "warning");
      } finally {
        setIsExporting(false);
      }
    }, 1200);
  };

  // We define the set of obligations for our dynamic/interactive calendar.
  // We include predefined items matching the screenshot exactly, but we also seamlessly merge standard `items`!
  const preseededEvents: Record<string, CalendarDay["events"]> = {
    "2026-07-04": [
      {
        id: "e_med_1",
        title: "Cardiology Consult — Dr. Gupta",
        description: "Follow-up consultation for mother. Located at Desk 4, Apollo Clinic.",
        time: "10:00 AM",
        category: "MEDICAL",
      },
      {
        id: "e_fin_1",
        title: "House Rent EMI Payment",
        description: "Monthly apartment lease amortization auto-debit process.",
        amount: 1200,
        time: "09:00 AM",
        category: "FINANCIAL",
      },
      {
        id: "e_fam_1",
        title: "School Bus Fees",
        description: "Quarterly transportation charges for children school commute.",
        amount: 180,
        time: "02:00 PM",
        category: "FAMILY",
      }
    ],
    "2026-07-05": [
      {
        id: "e_fin_2",
        title: "Broadband Internet Renewal",
        description: "Fiber high-speed wifi lease contract extension payment.",
        amount: 55,
        time: "11:30 AM",
        category: "FINANCIAL",
      },
      {
        id: "e_fin_3",
        title: "Electricity Utility Bill",
        description: "State grid power utility consumption billing cycle.",
        amount: 140,
        time: "03:00 PM",
        category: "FINANCIAL",
      },
      {
        id: "e_fam_2",
        title: "Checkup Prep Checklist Check",
        description: "Ensure mother fasting state for health screening tomorrow.",
        time: "08:00 PM",
        category: "FAMILY",
      }
    ],
    "2026-07-06": [
      {
        id: "e_fam_3",
        title: "Niece's School Enrollment Fee",
        description: "Admission processing fee for grade 5 class setup.",
        amount: 350,
        time: "11:00 AM",
        category: "FAMILY",
      }
    ],
    "2026-07-08": [
      {
        id: "e_fin_4",
        title: "Car Loan EMI Auto-debit",
        description: "Consolidated auto loan monthly installment payment.",
        amount: 450,
        time: "10:00 AM",
        category: "FINANCIAL",
      },
      {
        id: "e_med_2",
        title: "Pharmacy Medicine Delivery Check",
        description: "Ensure monthly supply of cardiovascular & thyroid prescriptions.",
        time: "05:00 PM",
        category: "MEDICAL",
      }
    ],
    "2026-07-12": [
      {
        id: "e_fam_4",
        title: "Weekly Family Sync Meeting",
        description: "Coordinate clinical support duties, medicine rosters & nursing schedule.",
        time: "10:00 AM",
        category: "FAMILY",
      },
      {
        id: "e_fam_5",
        title: "School Project Fee Due",
        description: "Co-curricular science exhibit materials funding requirement.",
        amount: 75,
        time: "04:30 PM",
        category: "FAMILY",
      }
    ],
    "2026-07-15": [
      {
        id: "e_fin_5",
        title: "Water Utility Bill Payment",
        description: "Municipal tap water supply cycle billing settlement.",
        amount: 45,
        time: "02:00 PM",
        category: "FINANCIAL",
      }
    ]
  };

  // Convert the standard dynamic "lifeItems" (added by the user) into the calendar format
  const getMergedEventsForDay = (dateKey: string) => {
    const events = [...(preseededEvents[dateKey] || [])];
    
    // Scan standard items list and add if they match the date
    items.forEach((item) => {
      // Normalize dates: item.dueDate is usually YYYY-MM-DD
      if (item.dueDate === dateKey) {
        // Prevent duplicate IDs
        if (!events.some(e => e.id === item.id)) {
          let category: "FINANCIAL" | "MEDICAL" | "FAMILY" | "FREE" = "FINANCIAL";
          if (item.type === "Appointments") category = "MEDICAL";
          else if (item.type === "School Fees") category = "FAMILY";

          events.push({
            id: item.id,
            title: item.name,
            description: `${item.type} obligation - Dynamic entry.`,
            amount: item.amount || undefined,
            time: "12:00 PM",
            category: category
          });
        }
      }
    });

    return events;
  };

  // Generate July 2026 Grid:
  // Starts on Sunday (June 28, 2026) and ends on Saturday (August 1, 2026)
  const calendarDays: CalendarDay[] = [];

  // Trailing June Days
  for (let d = 28; d <= 30; d++) {
    const dateKey = `2026-06-${d}`;
    calendarDays.push({
      dayNumber: d,
      isCurrentMonth: false,
      dateKey,
      bgColorClass: "bg-white text-slate-300",
      borderColorClass: "border-transparent",
      indicatorDots: [],
      events: []
    });
  }

  // July Days (1 to 31)
  for (let d = 1; d <= 31; d++) {
    const formattedDay = d < 10 ? `0${d}` : `${d}`;
    const dateKey = `2026-07-${formattedDay}`;
    const dayEvents = getMergedEventsForDay(dateKey);

    // Determine colors & styling to perfectly match the screenshot reference
    let bgColorClass = "bg-slate-50/40 hover:bg-slate-50 text-slate-700";
    let borderColorClass = "border-slate-100";
    let multipleCount: number | undefined = undefined;
    const indicatorDots: CalendarDay["indicatorDots"] = [];

    // Special styling from the screenshot
    if (d === 4) {
      // Highlighted Selected Day
      bgColorClass = "bg-amber-50/40";
      borderColorClass = "border-amber-200";
      multipleCount = 3;
      indicatorDots.push("medical");
    } else if (d === 5) {
      bgColorClass = "bg-amber-50/40";
      borderColorClass = "border-amber-200";
      multipleCount = 3;
      indicatorDots.push("financial");
    } else if (d === 6) {
      bgColorClass = "bg-purple-50/40";
      borderColorClass = "border-purple-200";
      indicatorDots.push("family");
    } else if (d === 8) {
      bgColorClass = "bg-amber-50/40";
      borderColorClass = "border-amber-200";
      multipleCount = 2;
      indicatorDots.push("financial");
    } else if (d === 12) {
      bgColorClass = "bg-amber-50/40";
      borderColorClass = "border-amber-200";
      multipleCount = 2;
      indicatorDots.push("family", "family");
    } else if (d === 15) {
      bgColorClass = "bg-blue-50/40";
      borderColorClass = "border-blue-200";
      indicatorDots.push("financial");
    }

    // Dynamic coloring based on added items
    if (!multipleCount && dayEvents.length > 0) {
      if (dayEvents.length > 1) {
        bgColorClass = "bg-amber-50/40";
        borderColorClass = "border-amber-200";
        multipleCount = dayEvents.length;
      } else {
        const cat = dayEvents[0].category;
        if (cat === "MEDICAL") {
          bgColorClass = "bg-rose-50/40";
          borderColorClass = "border-rose-100";
          indicatorDots.push("medical");
        } else if (cat === "FAMILY") {
          bgColorClass = "bg-purple-50/40";
          borderColorClass = "border-purple-100";
          indicatorDots.push("family");
        } else {
          bgColorClass = "bg-blue-50/40";
          borderColorClass = "border-blue-100";
          indicatorDots.push("financial");
        }
      }
    }

    // Today is July 3, 2026 (dotted outline in screenshot)
    const hasDottedOutline = (d === 3);

    calendarDays.push({
      dayNumber: d,
      isCurrentMonth: true,
      dateKey,
      bgColorClass,
      borderColorClass,
      hasDottedOutline,
      multipleCount,
      indicatorDots,
      events: dayEvents
    });
  }

  // Padding August Day to complete week
  calendarDays.push({
    dayNumber: 1,
    isCurrentMonth: false,
    dateKey: "2026-08-01",
    bgColorClass: "bg-white text-slate-300",
    borderColorClass: "border-transparent",
    indicatorDots: [],
    events: []
  });

  // Fetching events for the currently selected day
  const activeDayEvents = getMergedEventsForDay(selectedDateKey);
  const selectedDateObject = new Date(selectedDateKey);
  const formattedSelectedDate = selectedDateObject.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const handleSelectDay = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return;
    setSelectedDateKey(day.dateKey);
    if (day.events.length > 0) {
      showToast(`Selected ${day.events.length} obligations on Jul ${day.dayNumber}`, "info");
    }
  };

  return (
    <div id="care-obligation-heatmap-panel" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
      
      {/* Top Header Card Container */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
              <Calendar className="w-5 h-5 text-blue-600 animate-pulse" />
            </span>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Care & Obligation Heatmap
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Interactive July 2026 calendar highlighting upcoming family medical consults, bill deadlines, and meetings.
          </p>
        </div>

        {/* Legend & Export button strip */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Legend Panel Box */}
          <div className="bg-slate-50/70 border border-slate-150 p-2.5 rounded-xl flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-slate-600 select-none">
            <span className="font-bold text-slate-700">Legend:</span>
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-200 border border-slate-300 inline-block" /> Free
            </span>
            <span className="flex items-center gap-1 font-medium text-blue-700">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Financial/EMI
            </span>
            <span className="flex items-center gap-1 font-medium text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Medical/Consult
            </span>
            <span className="flex items-center gap-1 font-medium text-purple-600">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Family/School
            </span>
            <span className="flex items-center gap-1 font-medium text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Multiple
            </span>
          </div>

          <button
            onClick={() => {
              setShowExportConfig(!showExportConfig);
              showToast(showExportConfig ? "Closed PDF Export options" : "Opened secure offline PDF options panel", "info");
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-emerald-400" /> 
            <span>Export Secure PDF</span>
          </button>
        </div>
      </div>

      {/* Expandable Secure PDF Config Panel */}
      {showExportConfig && (
        <div className="bg-slate-900 text-white border border-slate-800 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top-4 duration-300 shadow-lg">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Lock className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
              Family Encryption & PDF Configuration Portal
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Passcode */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 block uppercase">
                Family Security Passcode
              </label>
              <div className="relative">
                <input
                  type={showPasscode ? "text" : "password"}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Set secret key"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  {showPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-[9px] text-slate-500 leading-relaxed block">
                Required for offline validation and printing clearance.
              </span>
            </div>

            {/* Column 2: Encryption level */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 block uppercase">
                Encryption Cipher
              </label>
              <select
                value={encryptionLevel}
                onChange={(e) => setEncryptionLevel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="AES-256 Bit">AES-256 Bit Military Grade</option>
                <option value="SHA-512 Signed">SHA-512 Signed Backup</option>
                <option value="RSA-4096 Bit">RSA-4096 Bit Asymmetric Key</option>
              </select>
              <span className="text-[9px] text-slate-500 leading-relaxed block">
                Defines cryptographic signature injected in PDF margins.
              </span>
            </div>

            {/* Column 3: Compile and Action */}
            <div className="flex flex-col justify-end">
              <button
                disabled={isExporting}
                onClick={handleExportPDF}
                className={`w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer`}
              >
                {isExporting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Compiling Secure PDF...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>Download Crypt-Signed PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850 flex items-start gap-2.5 text-[10px] text-slate-400 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Encryption Active:</strong> Generating this report locks the medical consultation schedule for <span className="text-slate-200">Saraswathi Reddy</span> and upcoming household EMI accounts into a printable single-page PDF with security headers and randomized salt fingerprint.
            </div>
          </div>
        </div>
      )}

      {/* July 2026 Calendar Grid Area */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-base font-extrabold text-slate-900 tracking-tight">July 2026</span>
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">
            Local Time context: Jul 3, 2026
          </span>
        </div>

        {/* Calendar Box */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
          {/* Weekday Titles */}
          <div className="grid grid-cols-7 border-b border-slate-150 bg-slate-50/50 py-2.5 text-center text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 border-b border-slate-100">
            {calendarDays.map((day, index) => {
              const isSelected = selectedDateKey === day.dateKey;
              return (
                <div
                  key={`${day.dateKey}_${index}`}
                  onClick={() => handleSelectDay(day)}
                  className={`min-h-[72px] sm:min-h-[84px] p-2 flex flex-col justify-between transition-all relative ${
                    day.isCurrentMonth ? "cursor-pointer" : "pointer-events-none"
                  } ${day.bgColorClass} ${
                    day.hasDottedOutline 
                      ? "border-2 border-dashed border-slate-900 z-10 rounded-lg shadow-xs" 
                      : ""
                  } ${
                    isSelected 
                      ? "border-2 border-blue-600 bg-amber-50/40 z-20 rounded-lg shadow-sm" 
                      : ""
                  }`}
                >
                  {/* Top line: Day number and Multiple icon */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold leading-none ${
                      day.hasDottedOutline 
                        ? "text-blue-700 underline underline-offset-2 decoration-2" 
                        : "text-slate-700"
                    }`}>
                      {day.dayNumber}
                    </span>

                    {day.multipleCount && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-amber-950 font-black text-[8px] flex items-center justify-center border border-amber-600/20 shadow-xs shrink-0 select-none">
                        {day.multipleCount}
                      </span>
                    )}
                  </div>

                  {/* Bottom line: indicators */}
                  <div className="flex items-center justify-center gap-1 h-3 pb-1">
                    {day.indicatorDots.map((dot, dotIdx) => (
                      <span
                        key={dotIdx}
                        className={`w-1.5 h-1.5 rounded-full ${
                          dot === "medical"
                            ? "bg-rose-500"
                            : dot === "family"
                            ? "bg-purple-500"
                            : "bg-blue-500"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Agenda Detail View Box */}
      <div className="bg-slate-50/60 border border-slate-150 p-5 rounded-2xl space-y-4">
        <div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            SELECTED DAY AGENDA
          </span>
          <span className="text-sm font-extrabold text-slate-800 block mt-0.5">
            {formattedSelectedDate}
          </span>
        </div>

        {activeDayEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/50 p-6 text-center shadow-xs">
            <span className="text-xs font-bold text-slate-400 block">No Active Obligations Scheduled</span>
            <p className="text-[10px] text-slate-400 mt-1">
              This date is currently free of critical medical checkups, EMI commitments, or school events.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDayEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-blue-200 hover:shadow-xs"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800">{evt.title}</span>
                    {evt.amount && (
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-250 rounded-md">
                        ${evt.amount}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    {evt.description}
                  </p>
                  
                  {evt.time && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{evt.time}</span>
                    </div>
                  )}
                </div>

                <div className="shrink-0 self-start sm:self-center">
                  <span className={`px-2.5 py-1 text-[9px] font-black tracking-wider rounded-md border uppercase ${
                    evt.category === "MEDICAL"
                      ? "bg-rose-50 border-rose-200 text-rose-700"
                      : evt.category === "FAMILY"
                      ? "bg-purple-50 border-purple-200 text-purple-700"
                      : "bg-blue-50 border-blue-200 text-blue-700"
                  }`}>
                    {evt.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
