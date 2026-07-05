export interface User {
  id: string;
  email: string;
  name: string;
  role: "User" | "Nominee";
  mfaEnabled?: boolean;
}

export interface EmergencyProfile {
  name: string;
  age: number;
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  nomineeName: string;
  nomineePhone: string;
  nomineePin: string; // The PIN for nominee dashboard verification
}

export type DocumentType = "Insurance" | "Medical Report" | "Aadhaar" | "Other";

export interface PolicyExtraction {
  policy_number: string | null;
  expiry_date: string | null;
  coverage: string | null;
  nominee: string | null;
  hospital_name: string | null;
}

export interface VaultDocument {
  id: string;
  userId: string;
  type: DocumentType;
  fileName: string;
  fileSize: string;
  uploadedDate: string;
  notes: string;
  isPrivate: boolean;
  extraction?: PolicyExtraction;
}

export type EmailCategory = "Bills" | "Insurance" | "Travel" | "Healthcare" | "Appointments";

export interface EmailRecord {
  id: string;
  subject: string;
  sender: string;
  category: EmailCategory;
  date: string;
  extracted_summary: string;
  raw_snippet: string;
  due_date: string | null;
  amount: number | null;
}

export type ItemType = "Bills" | "Appointments" | "School Fees" | "Loans/EMIs";
export type ItemStatus = "Pending" | "Paid" | "Completed" | "Postponed" | "Canceled";

export interface LifeGraphItem {
  id: string;
  type: ItemType;
  name: string;
  dueDate: string;
  amount: number | null;
  status: ItemStatus;
}

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  description: string;
  category: "Medical" | "Family" | "Finance" | "Meeting" | "Personal";
}

export interface ContinuityPlan {
  urgent_tasks_today: string[];
  things_to_pay_this_week: { item: string; amount: number; dueDate: string }[];
  pending_bills: string[];
  upcoming_appointments: string[];
  medicines_to_refill: string[];
  insurance_claim_checklist: string[];
  important_emails: string[];
  general_brief: string;
  createdAt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  actionSuggested?: {
    action: "cancel" | "postpone";
    eventId: string;
    eventTitle: string;
    explanation: string;
  } | null;
}

export interface MedicalProfile {
  id?: string;
  userId?: string;
  conditions: string;
  allergies: string;
  medications: string;
  bloodGroup: string;
  insuranceProvider: string;
  policyNumber: string;
}

export interface TrustedContact {
  id?: string;
  userId?: string;
  name: string;
  phone: string;
  email: string;
  relation: string;
  accessGranted: boolean;
}
