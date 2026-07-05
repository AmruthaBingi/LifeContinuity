import React, { useState } from "react";
import { Bell, Clock, Play, CheckCircle2, AlertTriangle, Sparkles, RefreshCw } from "lucide-react";
import { LifeGraphItem } from "../types";
import { formatDate } from "../utils";

interface ReminderAgentProps {
  items: LifeGraphItem[];
  showToast: (message: string, type: "success" | "info" | "warning") => void;
}

interface CronLog {
  timestamp: string;
  status: "success" | "warning";
  message: string;
}

export default function ReminderAgent({ items, showToast }: ReminderAgentProps) {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<CronLog[]>([
    {
      timestamp: "2026-07-02 08:00:03",
      status: "success",
      message: "Daily schedule run completed. 0 urgent reminders flagged.",
    },
    {
      timestamp: "2026-07-03 08:00:01",
      status: "success",
      message: "Daily schedule run completed. Verified 4 Life Graph items.",
    },
  ]);

  const triggerCronJob = () => {
    setRunning(true);
    showToast("Launching Daily Scheduled Reminder Agent script...", "info");

    setTimeout(() => {
      setRunning(false);
      
      // Scan active items due within the next 3 days
      const today = new Date();
      const threeDaysLater = new Date();
      threeDaysLater.setDate(today.getDate() + 3);

      const urgentItems = items.filter((item) => {
        if (item.status === "Paid" || item.status === "Completed") return false;
        const dueDate = new Date(item.dueDate);
        return dueDate >= today && dueDate <= threeDaysLater;
      });

      const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);

      if (urgentItems.length > 0) {
        const itemNames = urgentItems.map((i) => `"${i.name}" due ${formatDate(i.dueDate)}`).join(", ");
        const alertMsg = `CRON REMINDER: You have ${urgentItems.length} urgent item(s) due soon: ${itemNames}. Please review your Continuity Plan.`;
        
        showToast(`Scheduled run complete! ${urgentItems.length} urgent reminders dispatched.`, "warning");
        
        // Trigger browser audio notification
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.15);
        } catch (e) {
          console.warn("Audio context not supported in iframe constraint");
        }

        setLogs((prev) => [
          {
            timestamp,
            status: "warning",
            message: `URGENT RUN: Flagged ${urgentItems.length} items: ${itemNames}. Dispatched notification summaries via in-app banner & browser audio.`,
          },
          ...prev,
        ]);
      } else {
        showToast("Scheduled run complete! No urgent items found due within 3 days.", "success");
        setLogs((prev) => [
          {
            timestamp,
            status: "success",
            message: "Routine run completed. Verified active Life Graph agenda. No items due within 3 days.",
          },
          ...prev,
        ]);
      }
    }, 1200);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" /> Daily Reminder Agent Scheduler (Module 7)
          </h2>
          <p className="text-xs text-slate-500">
            Bubble-style recurring scheduler execution log. The agent runs daily at 08:00 AM UTC to inspect due dates and dispatch warnings.
          </p>
        </div>

        <button
          onClick={triggerCronJob}
          disabled={running}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
        >
          {running ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Running Agent...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              Trigger Reminder Agent
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Reminder Settings / Status Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cron Agent Settings</span>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="font-semibold text-slate-600">Scheduler Interval</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">Every 24 Hours (08:00 AM)</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="font-semibold text-slate-600">Dispatched Channel</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">SMS API / Push Notifications</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="font-semibold text-slate-600">Due Warnings window</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">📅 Within 3 days</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="font-semibold text-slate-600">Scheduler Engine Status</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 border border-emerald-200">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Active
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-[11px] text-slate-500 leading-relaxed">
            <strong>System Notification:</strong> Clicking the trigger button runs the scheduler script on your live dashboard. It checks for outstanding bills, DPS fees, home loan EMIs, or card checkups.
          </div>
        </div>

        {/* Scheduled Execution Logs Console */}
        <div className="lg:col-span-2 space-y-3 flex flex-col h-[280px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">System Scheduler Run logs</span>
          
          <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 font-mono text-[11px] space-y-3 flex-grow overflow-y-auto shadow-inner">
            {logs.map((log, index) => (
              <div key={index} className="flex items-start gap-2.5 pb-2.5 border-b border-slate-800 last:border-0">
                <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
                <span className={log.status === "warning" ? "text-amber-400 font-semibold" : "text-emerald-400"}>
                  {log.status === "warning" ? "⚠️ [ALERT]" : "✓ [SYS]"}
                </span>
                <span className="text-slate-300 leading-relaxed">{log.message}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
