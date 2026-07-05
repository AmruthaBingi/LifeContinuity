import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from "recharts";
import {
  Calendar,
  AlertTriangle,
  TrendingUp,
  Filter,
  DollarSign,
  HeartPulse,
  Activity,
  Users,
  Info,
  Layers,
  ChevronRight,
  Sparkles,
  FileDown
} from "lucide-react";
import { LifeGraphItem } from "../types";
import { jsPDF } from "jspdf";

interface CareMapChartProps {
  items: LifeGraphItem[];
  showToast: (message: string, type: "success" | "info" | "warning") => void;
}

interface ObligationNode {
  id: string;
  name: string;
  dateKey: string; // YYYY-MM-DD
  dayNumber: number;
  dateLabel: string; // e.g. "Jul 4"
  amount: number;
  category: "MEDICAL" | "FINANCIAL" | "FAMILY" | "OTHER";
  severity: "Critical" | "High" | "Medium" | "Low";
  severityValue: number; // 4 = Critical, 3 = High, 2 = Medium, 1 = Low
  status: string;
  description: string;
  time?: string;
}

export default function CareMapChart({ items, showToast }: CareMapChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedNode, setSelectedNode] = useState<ObligationNode | null>(null);

  // Pre-defined baseline of obligations from the UI/Heatmap to ensure they match exactly
  const baseObligations: ObligationNode[] = useMemo(() => [
    {
      id: "base_med_1",
      name: "Cardiology Consult — Dr. Gupta",
      dateKey: "2026-07-04",
      dayNumber: 4,
      dateLabel: "Jul 4",
      amount: 250,
      category: "MEDICAL",
      severity: "Critical",
      severityValue: 4,
      status: "Pending",
      description: "Follow-up consultation for mother. Located at Desk 4, Apollo Clinic.",
      time: "10:00 AM"
    },
    {
      id: "base_fin_1",
      name: "House Rent EMI Payment",
      dateKey: "2026-07-04",
      dayNumber: 4,
      dateLabel: "Jul 4",
      amount: 1200,
      category: "FINANCIAL",
      severity: "High",
      severityValue: 3,
      status: "Pending",
      description: "Monthly apartment lease amortization auto-debit process.",
      time: "09:00 AM"
    },
    {
      id: "base_fam_1",
      name: "School Bus Fees",
      dateKey: "2026-07-04",
      dayNumber: 4,
      dateLabel: "Jul 4",
      amount: 180,
      category: "FAMILY",
      severity: "Medium",
      severityValue: 2,
      status: "Pending",
      description: "Quarterly transportation charges for children school commute.",
      time: "02:00 PM"
    },
    {
      id: "base_fin_2",
      name: "Broadband Internet Renewal",
      dateKey: "2026-07-05",
      dayNumber: 5,
      dateLabel: "Jul 5",
      amount: 55,
      category: "FINANCIAL",
      severity: "Low",
      severityValue: 1,
      status: "Pending",
      description: "Fiber high-speed wifi lease contract extension payment.",
      time: "11:30 AM"
    },
    {
      id: "base_fin_3",
      name: "Electricity Utility Bill",
      dateKey: "2026-07-05",
      dayNumber: 5,
      dateLabel: "Jul 5",
      amount: 140,
      category: "FINANCIAL",
      severity: "Medium",
      severityValue: 2,
      status: "Pending",
      description: "State grid power utility consumption billing cycle.",
      time: "03:00 PM"
    },
    {
      id: "base_fam_2",
      name: "Checkup Prep Checklist Check",
      dateKey: "2026-07-05",
      dayNumber: 5,
      dateLabel: "Jul 5",
      amount: 0,
      category: "FAMILY",
      severity: "Low",
      severityValue: 1,
      status: "Pending",
      description: "Ensure mother fasting state for health screening tomorrow.",
      time: "08:00 PM"
    },
    {
      id: "base_fam_3",
      name: "Niece's School Enrollment Fee",
      dateKey: "2026-07-06",
      dayNumber: 6,
      dateLabel: "Jul 6",
      amount: 350,
      category: "FAMILY",
      severity: "High",
      severityValue: 3,
      status: "Pending",
      description: "Admission processing fee for grade 5 class setup.",
      time: "11:00 AM"
    },
    {
      id: "base_fin_4",
      name: "Car Loan EMI Auto-debit",
      dateKey: "2026-07-08",
      dayNumber: 8,
      dateLabel: "Jul 8",
      amount: 450,
      category: "FINANCIAL",
      severity: "High",
      severityValue: 3,
      status: "Pending",
      description: "Consolidated auto loan monthly installment payment.",
      time: "10:00 AM"
    },
    {
      id: "base_med_2",
      name: "Pharmacy Medicine Delivery Check",
      dateKey: "2026-07-08",
      dayNumber: 8,
      dateLabel: "Jul 8",
      amount: 80,
      category: "MEDICAL",
      severity: "Medium",
      severityValue: 2,
      status: "Pending",
      description: "Ensure monthly supply of cardiovascular & thyroid prescriptions.",
      time: "05:00 PM"
    },
    {
      id: "base_fam_4",
      name: "Weekly Family Sync Meeting",
      dateKey: "2026-07-12",
      dayNumber: 12,
      dateLabel: "Jul 12",
      amount: 0,
      category: "FAMILY",
      severity: "Medium",
      severityValue: 2,
      status: "Pending",
      description: "Coordinate clinical support duties, medicine rosters & nursing schedule.",
      time: "10:00 AM"
    },
    {
      id: "base_fam_5",
      name: "School Project Fee Due",
      dateKey: "2026-07-12",
      dayNumber: 12,
      dateLabel: "Jul 12",
      amount: 75,
      category: "FAMILY",
      severity: "Low",
      severityValue: 1,
      status: "Pending",
      description: "Co-curricular science exhibit materials funding requirement.",
      time: "04:30 PM"
    },
    {
      id: "base_fin_5",
      name: "Water Utility Bill Payment",
      dateKey: "2026-07-15",
      dayNumber: 15,
      dateLabel: "Jul 15",
      amount: 45,
      category: "FINANCIAL",
      severity: "Low",
      severityValue: 1,
      status: "Pending",
      description: "Municipal tap water supply cycle billing settlement.",
      time: "02:00 PM"
    }
  ], []);

  // Merge items from context/Supabase dynamically
  const allObligations = useMemo(() => {
    const list = [...baseObligations];

    items.forEach((item) => {
      // Avoid duplicate base entries if any
      if (list.some((o) => o.id === item.id || o.name === item.name)) return;

      // Extract day from YYYY-MM-DD
      let dayNum = 1;
      let dateLabel = "Jul 1";
      if (item.dueDate) {
        const parts = item.dueDate.split("-");
        if (parts.length === 3) {
          dayNum = parseInt(parts[2], 10);
          dateLabel = `Jul ${dayNum}`;
        }
      }

      // Determine category
      let category: "MEDICAL" | "FINANCIAL" | "FAMILY" | "OTHER" = "FINANCIAL";
      if (item.type === "Appointments") category = "MEDICAL";
      else if (item.type === "School Fees") category = "FAMILY";

      // Determine severity
      let severity: "Critical" | "High" | "Medium" | "Low" = "Medium";
      let severityValue = 2;

      const nameLower = item.name.toLowerCase();
      if (category === "MEDICAL" || nameLower.includes("consult") || nameLower.includes("cardiology") || nameLower.includes("hospital")) {
        severity = "Critical";
        severityValue = 4;
      } else if (item.amount && item.amount >= 300) {
        severity = "High";
        severityValue = 3;
      } else if (item.amount && item.amount < 100) {
        severity = "Low";
        severityValue = 1;
      }

      list.push({
        id: item.id,
        name: item.name,
        dateKey: item.dueDate || "2026-07-01",
        dayNumber: dayNum,
        dateLabel,
        amount: item.amount || 0,
        category,
        severity,
        severityValue,
        status: item.status,
        description: `Dynamic task entry of type ${item.type}.`
      });
    });

    // Sort chronologically
    return list.sort((a, b) => a.dayNumber - b.dayNumber);
  }, [items, baseObligations]);

  // Filtered List for scatter plot and statistics
  const filteredObligations = useMemo(() => {
    return allObligations.filter((obj) => {
      const matchCat = selectedCategory === "ALL" || obj.category === selectedCategory;
      const matchSev = selectedSeverity === "ALL" || obj.severity === selectedSeverity;
      return matchCat && matchSev;
    });
  }, [allObligations, selectedCategory, selectedSeverity]);

  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Secure PDF Generator function for the current filtered view
  const handleExportPDF = () => {
    setIsExporting(true);
    showToast("Compiling analytical PDF for current view...", "info");

    setTimeout(() => {
      try {
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4"
        });

        // 1. Sleek Modern Header Block (Confidential Navy Theme)
        doc.setFillColor(30, 41, 59); // slate-800
        doc.rect(0, 0, 210, 42, "F");

        // Header Text
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("CARE & OBLIGATION ANALYTICAL REPORT", 14, 20);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(203, 213, 225); // slate-300
        doc.text(`Active Filters: Category [${selectedCategory}] | Severity [${selectedSeverity}]`, 14, 27);
        doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} (Local Time)`, 14, 33);

        // Security indicator Badge
        doc.setFillColor(59, 130, 246); // Blue-500
        doc.rect(145, 12, 51, 14, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("ANALYTICAL BACKUP", 149, 18);
        doc.setFont("helvetica", "normal");
        doc.text(`Records: ${filteredObligations.length} items`, 149, 22);

        // Watermark illustration: Diagonal light gray text
        doc.setTextColor(248, 250, 252); // extremely light gray/slate
        doc.setFontSize(32);
        doc.setFont("helvetica", "bold");
        doc.saveGraphicsState();
        doc.text("ANALYTICS PREVIEW", 40, 160, { angle: 45 });
        doc.restoreGraphicsState();

        // 2. Summary stats block
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(14, 50, 182, 28, "F");
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.3);
        doc.rect(14, 50, 182, 28, "D");

        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("VIEW METRICS & CONFLICT ANALYSIS", 18, 56);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105); // slate-600
        
        const totalAmount = filteredObligations.reduce((acc, curr) => acc + curr.amount, 0);
        const criticalItems = filteredObligations.filter(o => o.severity === "Critical").length;

        doc.text(`• Total Matching Obligations: ${filteredObligations.length} recorded tasks`, 18, 62);
        doc.text(`• Cumulative Financial Commitment: $${totalAmount}`, 18, 67);
        doc.text(`• Critical Life Support Conflicts: ${criticalItems} high-severity events`, 18, 72);

        // 3. Obligations list table
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("SECURE EVENT SCHEDULING MATRIX", 14, 90);

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

        filteredObligations.forEach((evt) => {
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

          doc.text(evt.dateLabel, 17, y);

          let titleText = evt.name;
          if (titleText.length > 40) titleText = titleText.substring(0, 37) + "...";
          doc.text(titleText, 36, y);

          doc.text(evt.category, 112, y);
          doc.text(evt.severity, 140, y);

          const amountVal = evt.amount ? `$${evt.amount}` : "N/A";
          doc.text(amountVal, 172, y);

          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.15);
          doc.line(14, y + 2.5, 196, y + 2.5);

          y += 8.5;
        });

        doc.save(`Care_Map_Analytical_Report_${selectedCategory}_${selectedSeverity}.pdf`);
        showToast("Secured Analytical PDF downloaded successfully!", "success");
      } catch (err) {
        console.error("Analytical PDF compilation failed:", err);
        showToast("Failed to compile analytical PDF. Check console logs.", "warning");
      } finally {
        setIsExporting(false);
      }
    }, 1000);
  };

  // Statistics calculation
  const stats = useMemo(() => {
    let criticalCount = 0;
    let highCount = 0;
    let totalFinancial = 0;
    let totalMedical = 0;

    allObligations.forEach((o) => {
      if (o.severity === "Critical") criticalCount++;
      if (o.severity === "High") highCount++;
      if (o.category === "FINANCIAL") totalFinancial += o.amount;
      if (o.category === "MEDICAL") totalMedical++;
    });

    return {
      criticalCount,
      highCount,
      totalFinancial,
      totalMedical
    };
  }, [allObligations]);

  // Helper for node colors
  const getNodeColor = (category: string) => {
    switch (category) {
      case "MEDICAL":
        return "#f43f5e"; // Rose 500
      case "FINANCIAL":
        return "#3b82f6"; // Blue 500
      case "FAMILY":
        return "#a855f7"; // Purple 500
      default:
        return "#64748b"; // Slate 500
    }
  };

  const handleNodeClick = (data: any) => {
    if (data && data.payload) {
      setSelectedNode(data.payload);
      showToast(`Viewing details for: ${data.payload.name}`, "info");
    }
  };

  // Render Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ObligationNode = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-800 text-white p-3.5 rounded-xl shadow-xl space-y-2 max-w-sm select-none backdrop-blur-xs font-sans">
          <div className="flex items-center justify-between gap-4">
            <span className={`text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-md uppercase border ${
              data.severity === "Critical"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : data.severity === "High"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-blue-500/10 border-blue-500/30 text-blue-400"
            }`}>
              {data.severity} Priority
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-bold">
              {data.dateLabel}, 2026
            </span>
          </div>
          <p className="text-xs font-bold text-slate-100">{data.name}</p>
          <p className="text-[10px] text-slate-400 leading-relaxed font-normal italic">
            "{data.description}"
          </p>
          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-medium">Category: <strong className="text-slate-300">{data.category}</strong></span>
            {data.amount > 0 && (
              <span className="font-mono font-bold text-emerald-400">${data.amount}</span>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="care-map-chart-card" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
              <Activity className="w-5 h-5 animate-pulse" />
            </span>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Care & Obligation Analytical Map</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Analytical multi-dimensional severity mapping. Hover over the nodes to drill down, or filter by category to inspect resource dependencies.
          </p>
        </div>

        {/* Dynamic Filters strip */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            <span className="p-1 text-slate-400">
              <Filter className="w-3.5 h-3.5" />
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-semibold bg-transparent border-none text-slate-700 focus:outline-none pr-4 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="MEDICAL">⚕️ Medical Consults</option>
              <option value="FINANCIAL">💳 Financial / EMI</option>
              <option value="FAMILY">🏫 Family & School</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="text-xs font-semibold bg-transparent border-none text-slate-700 focus:outline-none pr-4 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">🔴 Critical Only</option>
              <option value="High">🟠 High Priority</option>
              <option value="Medium">🟡 Medium Priority</option>
              <option value="Low">🟢 Low Priority</option>
            </select>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            {isExporting ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Compiling...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 text-blue-400" />
                <span>Download Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analytics Bento Grid Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Critical Tasks */}
        <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 bg-rose-500 text-white rounded-xl shadow-xs">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider block">Critical Tasks</span>
            <span className="text-lg font-black text-rose-950 font-mono">{stats.criticalCount}</span>
          </div>
        </div>

        {/* Card 2: High Priority */}
        <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider block">High Priority</span>
            <span className="text-lg font-black text-amber-950 font-mono">{stats.highCount}</span>
          </div>
        </div>

        {/* Card 3: Cash Flow Commitment */}
        <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 bg-blue-500 text-white rounded-xl shadow-xs">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">Total EMIs</span>
            <span className="text-lg font-black text-blue-950 font-mono">${stats.totalFinancial}</span>
          </div>
        </div>

        {/* Card 4: Health Consults */}
        <div className="bg-purple-50/40 border border-purple-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 bg-purple-500 text-white rounded-xl shadow-xs">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider block">Health Events</span>
            <span className="text-lg font-black text-purple-950 font-mono">{stats.totalMedical}</span>
          </div>
        </div>
      </div>

      {/* The Scatter Plot Visualization Frame */}
      <div className="border border-slate-200 rounded-2xl bg-slate-50/30 p-4 relative">
        <div className="absolute top-4 right-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 select-none">
          <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
          <span>Interactive D3/Recharts Severity Space</span>
        </div>

        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 30, bottom: 20, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              
              {/* X-Axis is July Date (1 to 31) */}
              <XAxis
                type="number"
                dataKey="dayNumber"
                name="Date"
                domain={[1, 16]}
                tickCount={16}
                tickFormatter={(val) => `Jul ${val}`}
                stroke="#94a3b8"
                fontSize={10}
                fontWeight="bold"
                tickLine={false}
                axisLine={false}
              />

              {/* Y-Axis is Severity Value (1 to 4) */}
              <YAxis
                type="number"
                dataKey="severityValue"
                name="Severity"
                domain={[0.5, 4.5]}
                tickCount={4}
                tickFormatter={(val) => {
                  if (val === 4) return "🚨 Critical";
                  if (val === 3) return "🟠 High";
                  if (val === 2) return "🟡 Medium";
                  if (val === 1) return "🟢 Low";
                  return "";
                }}
                stroke="#94a3b8"
                fontSize={10}
                fontWeight="bold"
                tickLine={false}
                axisLine={false}
              />

              {/* Z-Axis determines the bubble size (based on EMI value or fixed weight) */}
              <ZAxis
                type="number"
                dataKey="amount"
                range={[80, 500]}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "#cbd5e1" }} />

              <Scatter
                name="Obligations"
                data={filteredObligations}
                onClick={handleNodeClick}
                className="cursor-pointer"
              >
                {filteredObligations.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getNodeColor(entry.category)}
                    stroke={getNodeColor(entry.category)}
                    strokeWidth={1}
                    fillOpacity={0.8}
                    className="hover:fill-opacity-100 transition-all duration-200 cursor-pointer"
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Selected Node Drawer / Detail Card */}
      <div className="bg-slate-50/70 border border-slate-150 p-5 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Node Drill-Down Analytics
          </span>
          {selectedNode && (
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer transition-all"
            >
              Reset view
            </button>
          )}
        </div>

        {!selectedNode ? (
          <div className="p-6 bg-white border border-slate-200 rounded-xl text-center shadow-xs">
            <Info className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-pulse" />
            <span className="text-xs font-bold text-slate-500 block">No Node Selected</span>
            <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto">
              Click any colored bubble/node in the scatter heatmap to display granular event details, amount, status, and description.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-xs space-y-4 relative overflow-hidden animate-in fade-in duration-200">
            {/* Color banner strip on left */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5"
              style={{ backgroundColor: getNodeColor(selectedNode.category) }}
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-2">
              <div className="space-y-1">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  {selectedNode.name}
                </span>
                <p className="text-[10px] text-slate-400 font-bold font-mono">
                  Calendar Schedule: July {selectedNode.dayNumber}, 2026 {selectedNode.time && `at ${selectedNode.time}`}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`px-2 py-0.5 text-[9px] font-bold tracking-wider rounded-md border uppercase ${
                  selectedNode.category === "MEDICAL"
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : selectedNode.category === "FAMILY"
                    ? "bg-purple-50 border-purple-200 text-purple-700"
                    : "bg-blue-50 border-blue-200 text-blue-700"
                }`}>
                  {selectedNode.category}
                </span>

                <span className="px-2 py-0.5 text-[9px] font-black tracking-wider bg-slate-50 text-slate-700 border border-slate-200 rounded-md">
                  {selectedNode.severity} Severity
                </span>
              </div>
            </div>

            <div className="pl-2 space-y-3">
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-lg">
                <p className="text-xs text-slate-700 leading-relaxed font-normal">
                  {selectedNode.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-4">
                  {selectedNode.amount > 0 && (
                    <div>
                      <span className="text-[9px] font-extrabold text-slate-400 block uppercase">COMMITTED FUNDING</span>
                      <span className="text-sm font-black text-slate-800 font-mono">${selectedNode.amount}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 block uppercase">STATUS STATE</span>
                    <span className="text-sm font-black text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {selectedNode.status}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    showToast(`Active conflict warning cleared for ${selectedNode.name}!`, "success");
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                >
                  Configure Event Action <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
