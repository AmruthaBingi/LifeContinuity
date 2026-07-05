import { EmailRecord, CalendarEvent, LifeGraphItem, VaultDocument, EmergencyProfile } from "./types";

export const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export const formatDate = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// PRELOADED SAMPLE INBOX EMAILS FOR GMAIL OCR EXTRACTION SIMULATION
export interface RawEmail {
  id: string;
  subject: string;
  sender: string;
  date: string;
  body: string;
}

export const SAMPLE_INBOX: RawEmail[] = [
  {
    id: "raw-em-1",
    subject: "Home Loan EMI Auto-Debit Failure Notice - Ref #MORT-208293",
    sender: "alerts@bankofindia.com",
    date: "2026-07-02",
    body: "Dear Customer, your Home Loan EMI of $850.00 is scheduled for auto-debit on 2026-07-05. Please maintain sufficient balance in account ending 4829 to avoid bounce penalties. If you wish to pay manually, click pay.bankofindia.com.",
  },
  {
    id: "raw-em-2",
    subject: "Tata Power Electricity Bill for June 2026 - Account 987293",
    sender: "no-reply@tatapower.com",
    date: "2026-07-01",
    body: "Your power consumption bill for June 2026 is ready. Bill Amount: $120.50. Due Date: 2026-07-08. To avoid late surcharge, please make immediate payment online using netbanking, credit card, or UPI.",
  },
  {
    id: "raw-em-3",
    subject: "Delhi Public School Term 1 Fee Reminder - Student ID: DPS-88",
    sender: "billing@dps-school.edu",
    date: "2026-06-29",
    body: "Respected Parents, this is a friendly reminder that the Term-1 tuition fees of $450.00 for your ward is outstanding. Please clear the payment by July 12, 2026, to avoid library suspension and late fee fine.",
  },
  {
    id: "raw-em-4",
    subject: "Appointment Booking Confirmed: Cardiology Dept - Apollo Clinic",
    sender: "appointments@apolloclinic.com",
    date: "2026-07-03",
    body: "Your appointment with Cardiologist Dr. Ajay Gupta has been confirmed for 2026-07-04 at 10:00 AM. Please report 15 mins early at Desk 4, Apollo Healthcare Clinic, Hyderabad.",
  },
  {
    id: "raw-em-5",
    subject: "HDFC ERGO Health Insurance Premium Invoice - Renewal Due",
    sender: "renewals@hdfcergo.com",
    date: "2026-06-28",
    body: "Policy No: HDF-992-B. Your health insurance premium of $350.00 is due for renewal on 2026-07-15. Ensure timely renewal to guarantee seamless cashless claim settlement and continuous cover benefits.",
  },
];

// PRELOADED GOOGLE CALENDAR EVENTS
export const SAMPLE_CALENDAR: CalendarEvent[] = [
  {
    id: "cal-1",
    title: "Cardiology Consult — Dr. Gupta",
    time: "2026-07-04 at 10:00 AM",
    description: "Follow-up consultation for mother. Located at Desk 4, Apollo Clinic.",
    category: "Medical",
  },
  {
    id: "cal-2",
    title: "Home Loan EMI Auto-Debit",
    time: "2026-07-05 at 9:00 AM",
    description: "Scheduled auto-payment of $850.00 from bank account ending 4829.",
    category: "Finance",
  },
  {
    id: "cal-3",
    title: "Quarterly School Meeting (DPS)",
    time: "2026-07-06 at 3:30 PM",
    description: "Parent-teacher conference to discuss academic progress.",
    category: "Family",
  },
  {
    id: "cal-4",
    title: "Project Review with Client",
    time: "2026-07-07 at 11:00 AM",
    description: "Critical review of Q2 deliverables. Bring slides.",
    category: "Meeting",
  },
];

// INITIAL PROFILE
export const INITIAL_PROFILE: EmergencyProfile = {
  name: "Saraswathi Reddy",
  age: 64,
  bloodGroup: "O+ Pos",
  emergencyContactName: "Ruthvik Aniah (Son)",
  emergencyContactPhone: "+1 (415) 882-9382",
  nomineeName: "Ruthvik Aniah",
  nomineePhone: "+1 (415) 882-9382",
  nomineePin: "8829", // PIN for the nominee to login
};

// SAMPLE DOCUMENTS FOR VAULT (CAN AUTOFILL / SIMULATE FOR DEMO)
export const SAMPLE_DOCUMENTS = [
  {
    id: "doc-sample-1",
    name: "HDFC ERGO MyHealth Suraksha Policy.pdf",
    text: `HDFC ERGO GENERAL INSURANCE COMPANY LTD.
POLICY SCHEDULE - MYHEALTH SURAKSHA
Policyholder: Saraswathi Reddy
Nominee: Ruthvik Aniah (Relation: Son)
Policy Number: HDF-992-B
Sum Insured: $15,000
Valid From: 2025-07-16  Valid Thru: 2026-07-15
Coverage: IPD Hospitalization, Room Rent capping $150/day, Cashless network across all corporate institutions.`,
    type: "Insurance" as const,
  },
  {
    id: "doc-sample-2",
    name: "Apollo Hospital Discharge Card.png",
    text: `APOLLO HOSPITALS HYDERABAD
PATIENT DISCHARGE SUMMARY & CARD
Patient Name: Saraswathi Reddy  Age: 64  Gender: Female
Blood Group: O Positive
Admission Date: 2026-07-01  Discharge Date: 2026-07-03
Primary Diagnosis: Transient Ischemic Attack (TIA) - Stabilized.
Attending consultant: Dr. Ajay Gupta, MD DM (Cardiology)
Follow-up: Visit Dr. Gupta on 2026-07-04 at Cardiology OPD.`,
    type: "Medical Report" as const,
  },
];

// PRELOADED LIFE GRAPH ITEMS
export const INITIAL_LIFE_ITEMS: LifeGraphItem[] = [
  {
    id: "item-1",
    type: "Loans/EMIs",
    name: "Home Loan EMI Auto-Debit",
    dueDate: "2026-07-05",
    amount: 850,
    status: "Pending",
  },
  {
    id: "item-2",
    type: "Bills",
    name: "Tata Power Electricity Bill",
    dueDate: "2026-07-08",
    amount: 120.5,
    status: "Pending",
  },
  {
    id: "item-3",
    type: "School Fees",
    name: "DPS Term-1 Tuition Fees",
    dueDate: "2026-07-12",
    amount: 450,
    status: "Pending",
  },
  {
    id: "item-4",
    type: "Appointments",
    name: "Dr. Ajay Gupta (Apollo Cardiology)",
    dueDate: "2026-07-04",
    amount: null,
    status: "Pending",
  },
];
