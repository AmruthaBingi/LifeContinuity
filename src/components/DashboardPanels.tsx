import React, { useState } from "react";
import { 
  Calendar, CreditCard, GraduationCap, DollarSign, Plus, 
  Trash2, CheckCircle2, AlertCircle, Sparkles, Filter, Search 
} from "lucide-react";
import { LifeGraphItem, ItemType, ItemStatus } from "../types";
import { formatCurrency, formatDate } from "../utils";
import CareObligationHeatmap from "./CareObligationHeatmap";
import CareMapChart from "./CareMapChart";

interface DashboardPanelsProps {
  items: LifeGraphItem[];
  onAddItem: (item: LifeGraphItem) => void;
  onUpdateStatus: (id: string, status: ItemStatus) => void;
  onDeleteItem: (id: string) => void;
  showToast: (message: string, type: "success" | "info" | "warning") => void;
}

export default function DashboardPanels({
  items,
  onAddItem,
  onUpdateStatus,
  onDeleteItem,
  showToast,
}: DashboardPanelsProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // New Item form state
  const [newType, setNewType] = useState<ItemType>("Bills");
  const [newName, setNewName] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newDueDate) {
      showToast("Please enter a name and due date.", "warning");
      return;
    }

    const newItem: LifeGraphItem = {
      id: `item_${Date.now()}`,
      type: newType,
      name: newName,
      dueDate: newDueDate,
      amount: newAmount ? parseFloat(newAmount) : null,
      status: "Pending",
    };

    onAddItem(newItem);
    setShowAddModal(false);
    setNewName("");
    setNewDueDate("");
    setNewAmount("");
    showToast(`New ${newType} added to your Life Graph successfully!`, "success");
  };

  // Real-time filtering logic
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Helper to filter items and sort soonest-first
  const getCategorizedItems = (type: ItemType) => {
    return filteredItems
      .filter((item) => item.type === type)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  };

  const categories: { type: ItemType; title: string; icon: React.ReactNode; color: string }[] = [
    {
      type: "Bills",
      title: "Upcoming Bills",
      icon: <CreditCard className="w-5 h-5" />,
      color: "bg-rose-50 border-rose-100 text-rose-600",
    },
    {
      type: "Appointments",
      title: "Appointments",
      icon: <Calendar className="w-5 h-5" />,
      color: "bg-sky-50 border-sky-100 text-sky-600",
    },
    {
      type: "School Fees",
      title: "School Fees",
      icon: <GraduationCap className="w-5 h-5" />,
      color: "bg-purple-50 border-purple-100 text-purple-600",
    },
    {
      type: "Loans/EMIs",
      title: "Loans / EMIs",
      icon: <DollarSign className="w-5 h-5" />,
      color: "bg-blue-50 border-blue-100 text-blue-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" /> Life Graph Agenda
          </h2>
          <p className="text-xs text-slate-500">
            A real-time, consolidated chronological view of all upcoming family financial and care obligations.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Real-time search bar */}
          <div className="relative flex-grow sm:flex-grow-0 min-w-[260px]">
            <span className="absolute left-3.5 top-2.5 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl pl-10 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 transition-all text-xs font-bold"
              >
                ✕
              </button>
            )}
            {searchQuery && (
              <span className="absolute right-7 top-1.5 bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black px-1.5 py-0.5 rounded-md select-none">
                {filteredItems.length} match
              </span>
            )}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Custom Event
          </button>
        </div>
      </div>

      {/* Care & Obligation Heatmap Visual */}
      <CareObligationHeatmap items={filteredItems} showToast={showToast} />

      {/* Analytical Care and Obligation Recharts/D3 Severity Space */}
      <CareMapChart items={filteredItems} showToast={showToast} />

      {/* 4 Dashboard repeating-group panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => {
          const groupItems = getCategorizedItems(cat.type);
          
          return (
            <div key={cat.type} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[320px]">
              {/* Panel Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${cat.color}`}>
                    {cat.icon}
                  </div>
                  <span className="text-sm font-bold text-slate-900">{cat.title}</span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded-full border border-slate-300">
                  {groupItems.length} active
                </span>
              </div>

              {/* Panel Repeat-List Group */}
              <div className="flex-grow overflow-y-auto p-4 space-y-3.5">
                {groupItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <p className="text-xs font-semibold text-slate-400">
                      {searchQuery ? "No matching results" : "No upcoming items"}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      {searchQuery ? "Try a different search query." : "Sync with Gmail or click 'Add' to enter details."}
                    </p>
                  </div>
                ) : (
                  groupItems.map((item) => (
                    <div 
                      key={item.id} 
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        item.status === "Paid" || item.status === "Completed"
                          ? "bg-slate-50/60 border-slate-200/50 opacity-70"
                          : "bg-white border-slate-200 hover:border-blue-200 shadow-sm animate-in fade-in-50 duration-200"
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <span className={`text-xs font-bold block truncate ${
                          item.status === "Paid" || item.status === "Completed"
                            ? "line-through text-slate-400" 
                            : "text-slate-800"
                        }`}>
                          {item.name}
                        </span>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            📅 {formatDate(item.dueDate)}
                          </span>
                          
                          {item.amount && (
                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                              {formatCurrency(item.amount)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {item.status === "Pending" ? (
                          <button
                            onClick={() => {
                              const newStatus = cat.type === "Appointments" ? "Completed" : "Paid";
                              onUpdateStatus(item.id, newStatus);
                              showToast(`Successfully marked "${item.name}" as ${newStatus}!`, "success");
                            }}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 cursor-pointer"
                          >
                            Mark {cat.type === "Appointments" ? "Done" : "Paid"}
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">
                            ✓ {item.status}
                          </span>
                        )}

                        <button
                          onClick={() => {
                            onDeleteItem(item.id);
                            showToast(`Removed "${item.name}" from your Life Graph.`, "info");
                          }}
                          className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded cursor-pointer transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Entry Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Custom Event to Life Graph</h3>
            
            <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Obligation Category</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as ItemType)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="Bills">Bills / Utilities</option>
                  <option value="Appointments">Appointments / Medicals</option>
                  <option value="School Fees">School Fees</option>
                  <option value="Loans/EMIs">Loans & EMIs</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Obligation Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity Bill renewal, Dentist appointment"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Due / Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Amount ($ - Optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 150"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-250 text-slate-500 rounded-xl hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
                >
                  Confirm Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
