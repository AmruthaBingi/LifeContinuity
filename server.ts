import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import cookieParser from "cookie-parser";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("GoogleGenAI initialized successfully with API Key.");
  } catch (error) {
    console.error("Error initializing GoogleGenAI:", error);
  }
} else {
  console.warn("GEMINI_API_KEY not found in environment. Running in sandbox simulation mode.");
}

// Helper to safely clean up and parse JSON responses from Gemini
function cleanAndParseJSON(text: string): any {
  let cleaned = text.trim();
  
  // Remove markdown code block syntax if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "");
  }
  
  cleaned = cleaned.trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    // If it fails, let's try a second level of sanitization:
    // Try to find the first '{' or '[' and the last '}' or ']'
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");
    
    let subStr = "";
    if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      subStr = cleaned.slice(firstBrace, lastBrace + 1);
    } else if (firstBracket !== -1 && lastBracket !== -1) {
      subStr = cleaned.slice(firstBracket, lastBracket + 1);
    }
    
    if (subStr) {
      try {
        return JSON.parse(subStr);
      } catch (innerErr) {
        // Fix trailing commas
        let fixed = subStr.replace(/,\s*([}\]])/g, "$1");
        try {
          return JSON.parse(fixed);
        } catch (fixedErr: any) {
          throw new Error("Unable to parse JSON from response: " + fixedErr.message);
        }
      }
    }
    throw err;
  }
}

// ────────────────────────────────────────────────────────────────────────
// API ROUTE 1 — AI OCR & DATA EXTRACTION (MODULE 4)
// ────────────────────────────────────────────────────────────────────────
app.post("/api/extract", async (req, res) => {
  const { textContent, documentType } = req.body;

  if (!textContent) {
    return res.status(400).json({ error: "Missing document text content." });
  }

  if (!ai) {
    // Return fallback structured data if Gemini is not initialized
    return res.json({
      success: true,
      data: getFallbackExtraction(textContent, documentType),
      simulated: true,
    });
  }

  try {
    const prompt = `You are an expert OCR and medical/insurance data extraction agent. 
Analyze the following document text and extract structured information.
Document Type provided is: ${documentType || "Unknown"}.

Document Content:
"""
${textContent}
"""

Return structured JSON containing the following fields:
- policy_number (string or null): Any policy, document, ID, or account number found.
- expiry_date (string or null): Expire/valid-thru date, formatted as YYYY-MM-DD if possible.
- coverage (string or null): Brief description of what is covered or key insurance/medical details.
- nominee (string or null): Mentioned nominee, beneficiary, or emergency contact.
- hospital_name (string or null): Hospital, clinic, or institution name.
- document_type (string): Must be one of: 'Insurance', 'Medical Report', 'Aadhaar', 'Other'.

Do not include any other markdown, chat text, or wrappers outside the raw JSON object. Ensure the JSON is valid and parsable.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            policy_number: { type: Type.STRING, description: "Any policy, document, ID, or account number found." },
            expiry_date: { type: Type.STRING, description: "Expiry/valid-thru date (YYYY-MM-DD)." },
            coverage: { type: Type.STRING, description: "Brief description of coverage or medical details." },
            nominee: { type: Type.STRING, description: "Nominee, beneficiary, or emergency contact name." },
            hospital_name: { type: Type.STRING, description: "Hospital or clinic name." },
            document_type: {
              type: Type.STRING,
              description: "Must be one of: 'Insurance', 'Medical Report', 'Aadhaar', 'Other'."
            }
          },
          required: ["document_type"]
        }
      },
    });

    const jsonText = response.text || "{}";
    const extractedData = cleanAndParseJSON(jsonText);

    res.json({
      success: true,
      data: extractedData,
      simulated: false,
    });
  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    res.json({
      success: true,
      data: getFallbackExtraction(textContent, documentType),
      error: error.message,
      simulated: true,
    });
  }
});

// ────────────────────────────────────────────────────────────────────────
// API ROUTE 2 — GMAIL CLASSIFIER & SUMMARIZER (MODULE 4)
// ────────────────────────────────────────────────────────────────────────
app.post("/api/classify-emails", async (req, res) => {
  const { emails } = req.body;

  if (!emails || !Array.isArray(emails)) {
    return res.status(400).json({ error: "Invalid or missing emails array." });
  }

  if (!ai) {
    return res.json({
      success: true,
      data: emails.map((e, index) => getFallbackEmailClassification(e, index)),
      simulated: true,
    });
  }

  try {
    const prompt = `You are an email intelligence assistant. Analyze the following list of emails and classify each one.
For each email, extract structured details. Return a JSON array containing objects with the following fields:
- id (string): the original email ID
- subject (string)
- sender (string)
- date (string)
- category (string): must be one of 'Bills', 'Insurance', 'Travel', 'Healthcare', 'Appointments'
- extracted_summary (string): a brief 1-sentence action-oriented summary of the email (e.g., 'Pay electricity bill of $120 by July 15' or 'Appointment with Dr. Sharma on July 4 at 10:00 AM')
- raw_snippet (string): a short excerpt of the email text (max 60 characters)
- due_date (string or null): if there is a payment, deadline, travel date, or appointment date, format it as YYYY-MM-DD
- amount (number or null): if there is a payment or bill amount, return it as a number, otherwise null

Emails to classify:
${JSON.stringify(emails, null, 2)}

Return only a valid JSON array matching this structure. No conversational text or markdown code blocks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              subject: { type: Type.STRING },
              sender: { type: Type.STRING },
              date: { type: Type.STRING },
              category: { type: Type.STRING, description: "Must be one of: 'Bills', 'Insurance', 'Travel', 'Healthcare', 'Appointments'." },
              extracted_summary: { type: Type.STRING },
              raw_snippet: { type: Type.STRING },
              due_date: { type: Type.STRING, description: "YYYY-MM-DD date if applicable, else null." },
              amount: { type: Type.NUMBER, description: "Payment/bill amount, or null." }
            },
            required: ["id", "subject", "sender", "date", "category", "extracted_summary", "raw_snippet"]
          }
        }
      },
    });

    const jsonText = response.text || "[]";
    const classifiedEmails = cleanAndParseJSON(jsonText);

    res.json({
      success: true,
      data: classifiedEmails,
      simulated: false,
    });
  } catch (error: any) {
    console.error("Gemini Email Classification Error:", error);
    res.json({
      success: true,
      data: emails.map((e, index) => getFallbackEmailClassification(e, index)),
      error: error.message,
      simulated: true,
    });
  }
});

// ────────────────────────────────────────────────────────────────────────
// API ROUTE 2B — VIRTUAL EMAIL GENERATOR (For Accessing Any Mailbox / Bypass Google Blocks)
// ────────────────────────────────────────────────────────────────────────
app.post("/api/generate-virtual-emails", async (req, res) => {
  const { emailAddress } = req.body;
  if (!emailAddress || typeof emailAddress !== "string") {
    return res.status(400).json({ error: "Missing or invalid emailAddress parameter." });
  }

  const namePart = emailAddress.split("@")[0].replace(/[._-]/g, " ");
  const displayName = namePart
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Valued Customer";

  const isIndianEmail = emailAddress.toLowerCase().includes(".in") || emailAddress.toLowerCase().includes("hyderabad") || emailAddress.toLowerCase().includes("india");

  // Load custom verification / reset emails sent to this user from filesystem
  const emailSanitized = emailAddress.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const virtualEmailFile = path.join(process.cwd(), "data", `virtual_emails_${emailSanitized}.json`);
  let customEmails: any[] = [];
  try {
    if (fs.existsSync(virtualEmailFile)) {
      customEmails = JSON.parse(fs.readFileSync(virtualEmailFile, "utf8"));
    }
  } catch (err) {
    console.error("Error loading custom virtual emails:", err);
  }

  if (!ai) {
    const fallbackEmails = getFallbackVirtualEmails(emailAddress, displayName, isIndianEmail);
    return res.json({
      success: true,
      emails: [...customEmails, ...fallbackEmails],
      simulated: true,
    });
  }

  try {
    const prompt = `You are an email inbox simulator for an AI Life Planner & Continuity Hub.
Given the target email address "${emailAddress}" and the user's name "${displayName}", generate 6 highly realistic, rich, diverse email notifications representing critical life event alerts.

The list of emails MUST contain:
1. One Bill/Invoice email (e.g. Electricity, Water, Broadband, Rent, or Credit Card EMI).
2. One Insurance statement or policy premium notice (e.g. Life Insurance, Health Insurance, or Motor Insurance).
3. One Healthcare record or report (e.g. Lab results, clinical report, or discharge brief).
4. One Medical Appointment or Doctor schedule confirmation.
5. One Travel/Flight/Train booking itinerary or ticket confirmation.
6. One General/Home Service commitment or renewal notice.

IMPORTANT customization rules:
- Tailor the location, company names, currencies, and languages to the user's email address profile.
- If the email suggests an Indian origin (e.g., contains '.in', or contains keywords like 'hyderabad' or typical Indian names/domains, or contains 'ruthvikaniathyderabad'), customize the emails with Indian service providers (e.g., TSSPDCL, Airtel, Reliance Jio, HDFC Ergo, Apollo Hospitals, Max Bupa, LIC, local electricity boards), use Rupees (INR / ₹) or local currency, and refer to Hyderabad/India locations.
- Otherwise, use default providers (e.g., Pacific Gas & Electric, Comcast, UnitedHealthcare, Blue Shield, Memorial Hospital, Delta Airlines, CVS Pharmacy) and USD ($).
- Explicitly address the user by their name ("${displayName}") or email handle in the email bodies to make it feel deeply personalized.
- Make sure to include realistic parameters like account numbers, doctor names, specific dates in the immediate future (July or August 2026), and clear monetary values.

Return a JSON object containing:
- emails (array of objects):
  Each object MUST have:
  - id (string): e.g., "v-em-1", "v-em-2"
  - subject (string): the email subject line
  - sender (string): the sender name and email in "Name <email@domain.com>" format
  - date (string): the receipt date formatted as "YYYY-MM-DD" (use dates around June 28, 2026 to July 4, 2026)
  - snippet (string): a short, realistic 50-70 character preview of the email body
  - body (string): the full detailed text content of the email body (minimum 3-4 sentences, including billing codes, clinic names, payment links, and instructions).

No markdown formatting or text around the outer JSON. Return only the raw JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emails: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  sender: { type: Type.STRING },
                  date: { type: Type.STRING },
                  snippet: { type: Type.STRING },
                  body: { type: Type.STRING }
                },
                required: ["id", "subject", "sender", "date", "snippet", "body"]
              }
            }
          },
          required: ["emails"]
        }
      }
    });

    const jsonText = response.text || "{}";
    const parsed = cleanAndParseJSON(jsonText);

    res.json({
      success: true,
      emails: [...customEmails, ...(parsed.emails || [])],
      simulated: false,
    });
  } catch (error: any) {
    console.error("Virtual Email Generation Error:", error);
    const fallbackEmails = getFallbackVirtualEmails(emailAddress, displayName, isIndianEmail);
    res.json({
      success: true,
      emails: [...customEmails, ...fallbackEmails],
      error: error.message,
      simulated: true,
    });
  }
});

// ────────────────────────────────────────────────────────────────────────
// API ROUTE 3 — EMERGENCY CONTINUITY PLANNER (MODULE 6)
// ────────────────────────────────────────────────────────────────────────
app.post("/api/summarize-continuity", async (req, res) => {
  const { profile, items, documents, emails } = req.body;

  if (!ai) {
    return res.json({
      success: true,
      data: getFallbackContinuityPlan(profile, items, documents, emails),
      simulated: true,
    });
  }

  try {
    const prompt = `You are a family emergency coordinator. Given the user's emergency profile, active database items, documents, and classified emails, synthesize a consolidated emergency continuity plan.
The family member (e.g. mother or spouse) has been hospitalized. Generate a reassuring, actionable, highly structured plan.

User Profile:
${JSON.stringify(profile, null, 2)}

Active Life Graph Items (Bills, Appointments, etc.):
${JSON.stringify(items, null, 2)}

Vault Documents:
${JSON.stringify(documents, null, 2)}

Classified Email Records:
${JSON.stringify(emails, null, 2)}

Generate a structured JSON response containing:
- urgent_tasks_today (array of strings): Urgent things to pay or do today (e.g., 'Refill mother\\'s blood pressure meds', 'Pay home loan EMI').
- things_to_pay_this_week (array of objects with { item: string, amount: number, dueDate: string }): Payments due within 7 days.
- pending_bills (array of strings): Outstanding bills and amounts.
- upcoming_appointments (array of strings): Upcoming doctor or family appointments.
- medicines_to_refill (array of strings): Medicine schedules or active prescriptions that need refills.
- insurance_claim_checklist (array of strings): Checklist steps to file insurance claims based on the user\\'s insurance documents.
- important_emails (array of strings): Critical emails that require attention.
- general_brief (string): A reassuring, concise natural-language summary summarizing the situation, e.g., 'Your mother is hospitalized. We have compiled 3 urgent tasks for today: refill diabetes medication, submit the insurance claim, and cancel your business appointment.'

Return only a valid JSON object matching this structure. No conversational text outside the JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            urgent_tasks_today: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Urgent tasks to perform today."
            },
            things_to_pay_this_week: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING, description: "Name of the bill or item." },
                  amount: { type: Type.NUMBER, description: "Amount to pay." },
                  dueDate: { type: Type.STRING, description: "Due date (YYYY-MM-DD)." }
                },
                required: ["item", "amount", "dueDate"]
              }
            },
            pending_bills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of pending bills."
            },
            upcoming_appointments: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of upcoming appointments."
            },
            medicines_to_refill: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of medicines to refill."
            },
            insurance_claim_checklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Actionable checklist to file an insurance claim."
            },
            important_emails: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Critical email alerts requiring attention."
            },
            general_brief: {
              type: Type.STRING,
              description: "Reassuring summary of the family continuity situation."
            }
          },
          required: [
            "urgent_tasks_today",
            "things_to_pay_this_week",
            "pending_bills",
            "upcoming_appointments",
            "medicines_to_refill",
            "insurance_claim_checklist",
            "important_emails",
            "general_brief"
          ]
        }
      },
    });

    const jsonText = response.text || "{}";
    const plan = cleanAndParseJSON(jsonText);

    res.json({
      success: true,
      data: plan,
      simulated: false,
    });
  } catch (error: any) {
    console.error("Gemini Continuity Planner Error:", error);
    res.json({
      success: true,
      data: getFallbackContinuityPlan(profile, items, documents, emails),
      error: error.message,
      simulated: true,
    });
  }
});

// ────────────────────────────────────────────────────────────────────────
// API ROUTE 4 — ASSISTANT CHATBOT (MODULE 8)
// ────────────────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { message, history, context, thinkingMode, lowLatency } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Missing message." });
  }

  if (!ai) {
    return res.json({
      success: true,
      data: getFallbackChatReply(message, context),
      simulated: true,
    });
  }

  try {
    let modelName = "gemini-3.5-flash";
    if (lowLatency) {
      modelName = "gemini-3.1-flash-lite";
    }

    const prompt = `You are the LifeContinuityAI Family Emergency Assistant. You are highly intelligent, deeply empathetic, clear, and reassuring.
You have access to the following current user state/context:
- User Emergency Profile: ${JSON.stringify(context?.profile || {}, null, 2)}
- Emergency Mode Active: ${context?.emergencyMode ? "YES" : "NO"}
- Active Continuity Plan: ${JSON.stringify(context?.continuityPlan || {}, null, 2)}
- Upcoming Calendar Events: ${JSON.stringify(context?.calendarEvents || [], null, 2)}
- Current Local Time: ${context?.currentTime || new Date().toISOString()}

Your goal is to help the user manage their family emergency. Answer questions clearly, offer comfort, and proactively point out calendar conflicts based on the emergency mode.
For example, if the user's family member is hospitalized, suggest canceling or rescheduling overlapping meetings/appointments.
If the user explicitly asks to cancel, postpone, or reschedule a calendar event (e.g. 'Yes, cancel my dentist appointment' or 'reschedule my meeting'), you MUST include a 'suggest_calendar_action' object with the specific eventId so the application can perform the action on their behalf.

Conversation History:
${JSON.stringify(history || [], null, 2)}

User's New Message: "${message}"

Respond strictly with a JSON object containing:
- reply (string): Your conversational, comforting reply. You can use markdown for bolding/bullet points.
- suggest_calendar_action (object or null): If you detect an event should be canceled, postponed, or rescheduled (either by proposing it, or because the user agreed to do it).
  Structure: { action: 'cancel' | 'postpone', eventId: string, eventTitle: string, explanation: string }

No markdown formatting around the outer JSON. Just output the raw JSON string.`;

    // If thinkingMode is true, we fetch raw text and clean/parse it using gemini-3.5-flash with ThinkingLevel.HIGH, otherwise we use structured schema.
    if (thinkingMode) {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });
      const responseText = response.text || "{}";
      const replyData = cleanAndParseJSON(responseText);
      return res.json({
        success: true,
        data: replyData,
        simulated: false,
        modelUsed: "gemini-3.5-flash (High Thinking Mode)"
      });
    } else {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING, description: "Comforting conversational response." },
              suggest_calendar_action: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING, description: "'cancel' | 'postpone'" },
                  eventId: { type: Type.STRING },
                  eventTitle: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["action", "eventId", "eventTitle", "explanation"]
              }
            },
            required: ["reply"]
          }
        },
      });

      const jsonText = response.text || "{}";
      const replyData = cleanAndParseJSON(jsonText);

      return res.json({
        success: true,
        data: replyData,
        simulated: false,
        modelUsed: modelName
      });
    }
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.json({
      success: true,
      data: getFallbackChatReply(message, context),
      error: error.message,
      simulated: true,
    });
  }
});

// ────────────────────────────────────────────────────────────────────────
// NEW API ROUTE — AUDIO TRANSCRIPTION (GEMINI MULTIMODAL)
// ────────────────────────────────────────────────────────────────────────
app.post("/api/transcribe", async (req, res) => {
  const { audioData, mimeType } = req.body;
  if (!audioData) {
    return res.status(400).json({ error: "Missing audio payload for transcription." });
  }

  if (!ai) {
    return res.json({
      success: true,
      transcription: "This is a simulated transcription of your voice instructions regarding prescription dosage and nominee scheduling updates.",
      simulated: true
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType || "audio/webm",
            data: audioData
          }
        },
        "Transcribe this voice recording accurately. Keep any professional medical terminology, names of drugs, dosages, or clinical notes perfectly clear. Only return the transcription itself. No extra conversational filler or notes."
      ]
    });

    res.json({
      success: true,
      transcription: response.text || "No voice transcription output generated.",
      simulated: false
    });
  } catch (error: any) {
    console.error("Gemini Transcription Error:", error);
    res.json({
      success: true,
      transcription: "This is a simulated transcription of your voice instructions regarding prescription dosage and nominee scheduling updates.",
      error: error.message,
      simulated: true
    });
  }
});

// ────────────────────────────────────────────────────────────────────────
// NEW API ROUTE 5 — AI VOICE BRIEFING (TEXT-TO-SPEECH)
// ────────────────────────────────────────────────────────────────────────
app.post("/api/generate-speech", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Missing text for speech generation." });
  }

  if (!ai) {
    return res.json({
      success: true,
      audio: null,
      simulated: true,
      message: "Speech model not active (no GEMINI_API_KEY). Running in sandbox simulation."
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say warmly and reassuringly: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({
        success: true,
        audio: base64Audio,
        simulated: false
      });
    } else {
      throw new Error("No audio payload returned from Gemini TTS.");
    }
  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// ────────────────────────────────────────────────────────────────────────
// NEW API ROUTE 6 — CLINICAL JARGON DECODER & REPORT ASSISTANT
// ────────────────────────────────────────────────────────────────────────
app.post("/api/decode-report", async (req, res) => {
  const { textContent, notes } = req.body;
  if (!textContent) {
    return res.status(400).json({ error: "Missing text content of the report to decode." });
  }

  if (!ai) {
    return res.json({
      success: true,
      data: getFallbackDecodedReport(textContent, notes),
      simulated: true,
    });
  }

  try {
    const prompt = `You are an empathetic, clinical intelligence assistant. Analyze the following medical report or prescription text and explain it in layperson-friendly terms.
    
    Report Content:
    """
    ${textContent}
    """
    
    Additional Notes: ${notes || "None"}
    
    Return a structured JSON object containing:
    - simplified_summary (string): An easy-to-understand explanation of the overall medical state or doctor's observation.
    - abnormal_metrics (array of objects with { metric: string, value: string, standard_range: string, explanation: string, flag: 'high' | 'low' | 'normal' }): Highlight any vital lab results, blood counts, glucose levels, blood group notes, or abnormal numbers.
    - medication_guide (array of objects with { drug_name: string, purpose: string, dosage: string, potential_side_effects: string }): Decoded medicines.
    - medical_jargon_glossary (array of objects with { term: string, explanation: string }): Define complex abbreviations, clinical terms, or medical jargon.
    - smart_questions_for_doctor (array of strings): 3-4 professional, active questions the family nominee should ask the doctor during the next rounds.
    
    No markdown formatting around the outer JSON. Just output the raw JSON string.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            simplified_summary: { type: Type.STRING },
            abnormal_metrics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  metric: { type: Type.STRING },
                  value: { type: Type.STRING },
                  standard_range: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  flag: { type: Type.STRING, description: "high | low | normal" }
                },
                required: ["metric", "value", "standard_range", "explanation", "flag"]
              }
            },
            medication_guide: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  drug_name: { type: Type.STRING },
                  purpose: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                  potential_side_effects: { type: Type.STRING }
                },
                required: ["drug_name", "purpose", "dosage", "potential_side_effects"]
              }
            },
            medical_jargon_glossary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["term", "explanation"]
              }
            },
            smart_questions_for_doctor: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["simplified_summary", "abnormal_metrics", "medication_guide", "medical_jargon_glossary", "smart_questions_for_doctor"]
        }
      }
    });

    const jsonText = response.text || "{}";
    const decodedData = cleanAndParseJSON(jsonText);

    res.json({
      success: true,
      data: decodedData,
      simulated: false
    });
  } catch (error: any) {
    console.error("Gemini Report Decoding Error:", error);
    res.json({
      success: true,
      data: getFallbackDecodedReport(textContent, notes),
      error: error.message,
      simulated: true
    });
  }
});

// ────────────────────────────────────────────────────────────────────────
// NEW API ROUTE 7 — SMART FAMILY UPDATE DRAFTER
// ────────────────────────────────────────────────────────────────────────
app.post("/api/draft-update", async (req, res) => {
  const { profile, latestBrief, recipientType, tone } = req.body;

  if (!ai) {
    return res.json({
      success: true,
      draft: getFallbackDraftUpdate(profile, latestBrief, recipientType, tone),
      simulated: true
    });
  }

  try {
    const prompt = `You are an empathetic family emergency assistant. Draft a communication message update for a user to send.
    
    Patient Profile:
    - Name: ${profile?.name || "Family Member"}
    - Age: ${profile?.age || "N/A"}
    - Blood Group: ${profile?.bloodGroup || "N/A"}
    
    Latest emergency state/brief:
    "${latestBrief || "The patient is currently hospitalized and stable."}"
    
    Recipient Audience: ${recipientType}
    Requested Tone: ${tone}
    
    Draft an appropriate, ready-to-copy message. Use placeholders like [User Name] or [Your Name] where needed. Do not output anything other than the text of the message draft itself. No JSON, no markdown around it (unless it makes sense for whatsapp bolding or emails). Just output the raw draft text.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({
      success: true,
      draft: response.text || "No draft could be generated.",
      simulated: false
    });
  } catch (error: any) {
    console.error("Gemini Draft Update Error:", error);
    res.json({
      success: true,
      draft: getFallbackDraftUpdate(profile, latestBrief, recipientType, tone),
      error: error.message,
      simulated: true
    });
  }
});

// ────────────────────────────────────────────────────────────────────────
// FALLBACK UTILITIES FOR SANBOX ROBUSTNESS
// ────────────────────────────────────────────────────────────────────────
function getFallbackExtraction(text: string, type?: string) {
  const textLower = text.toLowerCase();
  
  let policyNo = "N/A";
  const policyMatch = text.match(/(?:policy|no|id|aadhaar|number|acc)[\s:#-]*([A-Z0-9-/]{6,16})/i);
  if (policyMatch) policyNo = policyMatch[1];

  let expiry = "2028-12-31";
  const dateMatch = text.match(/(?:expiry|valid|date|expires|due)[\s:#-]*(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})/i);
  if (dateMatch) expiry = dateMatch[1];

  let cov = "General Medical Coverage";
  if (textLower.includes("health")) cov = "Comprehensive Health & Hospitalization Care";
  else if (textLower.includes("life")) cov = "Term Life Insurance - Cash Benefit";
  else if (textLower.includes("car") || textLower.includes("vehicle")) cov = "Comprehensive Motor Vehicle Coverage";

  let hospital = "City Hospital & Research Center";
  if (textLower.includes("apollo")) hospital = "Apollo Hospitals";
  else if (textLower.includes("max")) hospital = "Max Healthcare";
  else if (textLower.includes("fortis")) hospital = "Fortis Medical Centre";

  let nom = "Family Member (Nominee)";
  if (textLower.includes("nominee")) {
    const nomMatch = text.match(/nominee[\s:#-]*([a-zA-Z\s]{3,20})/i);
    if (nomMatch) nom = nomMatch[1].trim();
  }

  return {
    policy_number: policyNo === "N/A" ? "POL-98247-B" : policyNo,
    expiry_date: expiry,
    coverage: cov,
    nominee: nom,
    hospital_name: hospital,
    document_type: type || (textLower.includes("aadhaar") ? "Aadhaar" : "Insurance"),
  };
}

function getFallbackEmailClassification(email: any, index: number) {
  if (!email) {
    return {
      id: `em-${index}`,
      subject: "Life Event Notification",
      sender: "notification@service.com",
      date: new Date().toISOString().split("T")[0],
      category: "Bills",
      extracted_summary: "A general alert was received.",
      raw_snippet: "",
      due_date: null,
      amount: null,
    };
  }

  const subject = email.subject || "No Subject";
  const body = email.body || email.snippet || "";
  const text = (subject + " " + body).toLowerCase();

  // 1. Classify Category based on keywords
  let category = "Bills";
  if (text.includes("insurance") || text.includes("premium") || text.includes("policy") || text.includes("claim") || text.includes("hdfc ergo") || text.includes("bupa")) {
    category = "Insurance";
  } else if (text.includes("flight") || text.includes("ticket") || text.includes("booking") || text.includes("boarding") || text.includes("airline") || text.includes("trip")) {
    category = "Travel";
  } else if (text.includes("appointment") || text.includes("scheduled") || text.includes("visit") || text.includes("consultant") || text.includes("dr.") || text.includes("doctor") || text.includes("dentist")) {
    category = "Appointments";
  } else if (text.includes("hospital") || text.includes("discharge") || text.includes("medical") || text.includes("prescription") || text.includes("lab") || text.includes("clinical")) {
    category = "Healthcare";
  } else if (text.includes("bill") || text.includes("invoice") || text.includes("payment") || text.includes("emi") || text.includes("auto-debit") || text.includes("outstanding") || text.includes("due") || text.includes("charge")) {
    category = "Bills";
  }

  // 2. Extract Amount
  let amount: number | null = null;
  const amountMatch = text.match(/(?:\$[\s]*|usd[\s]*|rs\.?[\s]*|inr[\s]*|amount:?[\s]*\$?)\s*(\d+(?:\.\d{1,2})?)/);
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1]);
  }

  // 3. Extract Due Date / Event Date
  let dueDate: string | null = null;
  // Match YYYY-MM-DD
  const ymdMatch = text.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (ymdMatch) {
    dueDate = `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  } else {
    // Match common relative/word-based dates (e.g. "July 15", "July 8", etc.)
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    for (const m of monthNames) {
      const monthIdx = monthNames.indexOf(m);
      const dateRegex = new RegExp(`(${m}[a-z]*)\\s*(\\d{1,2})`, "i");
      const match = text.match(dateRegex);
      if (match) {
        const day = parseInt(match[2]);
        const padDay = day < 10 ? `0${day}` : `${day}`;
        const padMonth = monthIdx + 1 < 10 ? `0${monthIdx + 1}` : `${monthIdx + 1}`;
        dueDate = `2026-${padMonth}-${padDay}`;
        break;
      }
    }
  }

  // If no date extracted and it is a Bill/Appointment/Travel, set default relative to email date (e.g. email date + 5 days)
  if (!dueDate) {
    const emailDateStr = email.date || new Date().toISOString().split("T")[0];
    try {
      const d = new Date(emailDateStr);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 7); // Default 7 days due
        dueDate = d.toISOString().split("T")[0];
      } else {
        dueDate = "2026-07-10";
      }
    } catch {
      dueDate = "2026-07-10";
    }
  }

  // 4. Create an action-oriented summary based on extracted data
  let summary = `Important ${category} alert detected.`;
  if (category === "Bills") {
    summary = `Please review outstanding payment for "${subject}".` + (amount ? ` Amount: $${amount}.` : "") + (dueDate ? ` Due date: ${dueDate}.` : "");
  } else if (category === "Insurance") {
    summary = `Insurance policy or renewal update for "${subject}".` + (dueDate ? ` Renewal target date: ${dueDate}.` : "");
  } else if (category === "Appointments") {
    summary = `Appointment scheduled: "${subject}".` + (dueDate ? ` Date: ${dueDate}.` : "");
  } else if (category === "Healthcare") {
    summary = `Medical health record update: "${subject}".`;
  } else if (category === "Travel") {
    summary = `Travel travel/booking confirmation: "${subject}".` + (dueDate ? ` Date: ${dueDate}.` : "");
  }

  return {
    id: email.id || `em-${index}`,
    subject,
    sender: email.sender || "notification@service.com",
    date: email.date || new Date().toISOString().split("T")[0],
    category,
    extracted_summary: summary,
    raw_snippet: body ? body.substring(0, 100) : "",
    due_date: dueDate,
    amount,
  };
}

function getFallbackContinuityPlan(profile: any, items: any[], documents: any[], emails: any[]) {
  const patientName = profile?.name || "Family Member";
  
  return {
    urgent_tasks_today: [
      `Secure hospital admission desk authorization for ${patientName}`,
      "Refill prescription medications immediately",
      "Pay outstanding utility bills to prevent service cutoff"
    ],
    things_to_pay_this_week: [
      { item: "Home Loan EMI", amount: 850, dueDate: "2026-07-05" },
      { item: "Electricity Utility Bill", amount: 120, dueDate: "2026-07-08" },
      { item: "Health Insurance Premium", amount: 350, dueDate: "2026-07-15" }
    ],
    pending_bills: [
      "Home Loan EMI ($850 due July 5)",
      "Electricity Bill ($120 due July 8)",
      "Hospital OPD Booking Fee ($45 pending)"
    ],
    upcoming_appointments: [
      "Consultation with Dr. Gupta (Cardiology) - July 4 at 10:00 AM",
      "Nominee consultation at Legal Office - July 9 at 2:00 PM"
    ],
    medicines_to_refill: [
      "Metformin 500mg (Diabetes) - Refill needed today",
      "Amlodipine 5mg (Blood Pressure) - 3 days left"
    ],
    insurance_claim_checklist: [
      "Download medical records and discharge summary from the Vault",
      "Gather pre-admission diagnostic tests reports",
      "Fill out Insurance Reimbursement Claim Form-A",
      "Submit Aadhaar identification and original policy receipt to TPA desk"
    ],
    important_emails: [
      "Urgent: EMI reminder from Bank of India",
      "Hospitalization pre-auth approvals status from Max Bupa"
    ],
    general_brief: `Comprehensive Emergency Guide for ${patientName}. Emergency mode is activated. Your primary focus is on immediate hospital coordination and resolving the 3 key tasks listed under your critical agenda today.`
  };
}

function getFallbackChatReply(msg: string, context: any) {
  const messageLower = msg.toLowerCase();
  const motherHospitalized = context.emergencyMode;
  let reply = "Hello! I am your LifeContinuity AI Assistant. How can I support you and your family today?";
  let suggestAction = null;

  if (messageLower.includes("hospital") || messageLower.includes("emergency") || messageLower.includes("mother")) {
    reply = "I understand this is an incredibly stressful time with your family member being hospitalized. I'm here to take the logistics off your hands.\n\nI have structured your **Emergency Continuity Plan** with medical contacts, upcoming bills, and claiming guides. Would you like me to scan your calendar and postpone any non-essential meetings so you can stay at the hospital?";
  } else if (messageLower.includes("calendar") || messageLower.includes("appointment") || messageLower.includes("dentist")) {
    const dentistEvent = context.calendarEvents?.find((e: any) => e.title.toLowerCase().includes("dentist") || e.title.toLowerCase().includes("appointment"));
    
    if (dentistEvent) {
      reply = `I noticed you have a **${dentistEvent.title}** scheduled for **${dentistEvent.time}**. Since your mother is currently hospitalized, would you like me to cancel or reschedule this event to clear your schedule?`;
      suggestAction = {
        action: "postpone",
        eventId: dentistEvent.id,
        eventTitle: dentistEvent.title,
        explanation: "Rescheduling due to family medical emergency and hospitalization care requirements.",
      };
    } else {
      reply = "I can see your scheduled calendar events. Let me know if you would like me to postpone or reschedule any of them to give you some breathing room.";
    }
  } else if (messageLower.includes("yes") || messageLower.includes("cancel") || messageLower.includes("postpone") || messageLower.includes("reschedule")) {
    const defaultEvent = context.calendarEvents?.[0];
    if (defaultEvent) {
      reply = `Understood. I have initiated a request to **reschedule/postpone "${defaultEvent.title}"** on your Google Calendar to free up your schedule. I will also log this inside your Continuity Plan under postponed items.`;
      suggestAction = {
        action: "cancel",
        eventId: defaultEvent.id,
        eventTitle: defaultEvent.title,
        explanation: "Canceled due to emergency family hospitalization.",
      };
    } else {
      reply = "Perfect, I've cleared that event and notified the organizers. Is there any other task I can handle for you right now?";
    }
  } else if (messageLower.includes("bill") || messageLower.includes("pay")) {
    reply = "You have an upcoming Home Loan EMI of $850 due on July 5, and an electricity bill of $120 due on July 8. I can help guide you through the instant payment portal, or notify your nominee to handle it. Which would you prefer?";
  }

  return {
    reply,
    suggest_calendar_action: suggestAction,
  };
}

function getFallbackDecodedReport(text: string, notes?: string) {
  return {
    simplified_summary: "The medical report indicates standard recovery observation. Vitals are largely stable with slight arterial tension that is being actively managed with oral anti-hypertensives.",
    abnormal_metrics: [
      {
        metric: "Blood Pressure (BP)",
        value: "142/88 mmHg",
        standard_range: "< 120/80 mmHg",
        explanation: "Slightly elevated systolic reading, common under hospital fatigue and clinical anxiety.",
        flag: "high"
      },
      {
        metric: "Hemoglobin",
        value: "12.1 g/dL",
        standard_range: "12.0 - 15.5 g/dL",
        explanation: "Normal reading. Healthy red blood cell count indicating no signs of anemia.",
        flag: "normal"
      }
    ],
    medication_guide: [
      {
        drug_name: "Amlodipine 5mg",
        purpose: "Manage blood pressure and protect cardiac muscle.",
        dosage: "1 tablet once daily (morning) after meals.",
        potential_side_effects: "Mild ankle swelling, occasional dizziness upon standing quickly."
      },
      {
        drug_name: "Pantocid 40mg",
        purpose: "Prevent acidity/gastritis from multiple clinical oral drug intake.",
        dosage: "1 tablet daily on an empty stomach (30 mins before breakfast).",
        potential_side_effects: "Dry mouth or mild headache."
      }
    ],
    medical_jargon_glossary: [
      {
        term: "Arterial Hypertension",
        explanation: "Medical term for persistent high blood pressure."
      },
      {
        term: "Laparoscopy",
        explanation: "A minimally invasive surgical procedure performed through small incisions."
      }
    ],
    smart_questions_for_doctor: [
      "When can we transition from intravenous medications to standard oral prescriptions?",
      "Are there any specific dynamic triggers or foods that might spike their blood pressure?",
      "What are the specific parameters or clinical markers required before we can plan for a discharge?"
    ]
  };
}

function getFallbackDraftUpdate(profile: any, brief: string, recipient: string, tone: string) {
  const patient = profile?.name || "Saraswathi Reddy";
  if (recipient.includes("Boss") || tone.includes("Professional")) {
    return `Subject: Status Update & Temporary Absence — Emergency Family Hospitalization

Dear [Manager's Name],

I am writing to inform you that my family member, ${patient}, has been hospitalized due to an emergency. As a designated primary coordinator, I am assisting with immediate medical care plans and managing hospital continuity.

Currently, the situation is: ${brief || "They are stable but under active clinical monitoring."}

I will need to work remotely or utilize emergency leave for the next few days. I have successfully rescheduled my upcoming conflicting external calendar commitments and will ensure key tasks are delegated. I will keep you updated as the care plan progresses.

Best regards,
[Your Name]`;
  } else if (recipient.includes("Family") || tone.includes("Reassuring")) {
    return `Hey family, quick update on ${patient} ❤️

Just wanted to reassure everyone. ${patient} is settled into the hospital room and doing fine. The doctors have checked vitals, and everything is stable.

${brief || "They are under active observation and getting good rest."}

I am here coordinating the medicines, and the nominee portal is tracking all bills. No need to panic, we have everything under control. Will keep you updated if anything changes!`;
  } else {
    return `Update regarding ${patient}:
Currently hospitalized for monitoring. ${brief || "Stable and resting."} 

I'll be at the clinic coordinating tasks. Please contact me if urgent. Let's keep them in our prayers.`;
  }
}

function getFallbackVirtualEmails(emailAddress: string, displayName: string, isIndianEmail: boolean) {
  const currency = isIndianEmail ? "₹" : "$";
  const electricityProvider = isIndianEmail ? "TSSPDCL Hyderabad Power" : "Pacific Gas & Electric";
  const hospital = isIndianEmail ? "Apollo Hospitals, Jubilee Hills" : "City Memorial General Hospital";
  const insurance = isIndianEmail ? "HDFC ERGO Health Insurance" : "UnitedHealthcare Insurance";
  
  return [
    {
      id: "v-em-1",
      subject: `Urgent: Your ${electricityProvider} Bill is Ready`,
      sender: `Billing Alerts <billing@${isIndianEmail ? "tsspdcl.gov.in" : "pge-alerts.com"}>`,
      date: "2026-07-02",
      snippet: `Dear ${displayName}, your monthly electricity consumption bill of ${currency}${isIndianEmail ? "3,450" : "145.20"} is due soon.`,
      body: `Dear ${displayName},\n\nThis is an automated notification that your utility service bill for Account #9924-8172 has been generated.\nTotal Amount Due: ${currency}${isIndianEmail ? "3,450" : "145.20"}\nDue Date: 2026-07-15\nTo prevent late payment surcharges or service interruption, please settle this bill at your earliest convenience via our online portal or auto-debit.\n\nThank you,\nCustomer Billing Support`
    },
    {
      id: "v-em-2",
      subject: `Renewal Notice: ${insurance} Policy #POL-99214`,
      sender: `Policy Care <support@${isIndianEmail ? "hdfcergo.com" : "unitedhealth.com"}>`,
      date: "2026-07-01",
      snippet: `Hi ${displayName}, your health policy premium is scheduled for renewal. Nominee: Spouse.`,
      body: `Dear ${displayName},\n\nYour health coverage under policy #POL-99214 is expiring on 2026-08-01.\nAnnual Renewal Premium: ${currency}${isIndianEmail ? "18,500" : "420.00"}.\nYour registered Nominee on file is: Family Member / Spouse.\nThis policy includes cashless admission benefits at verified network hospitals including ${hospital}.\nPlease make the payment before the grace period ends to maintain continuous health benefits without lapse.\n\nSincerely,\nRenewals Department`
    },
    {
      id: "v-em-3",
      subject: `Laboratory Diagnostic Report - ${hospital}`,
      sender: `Diagnostics Lab <records@${isIndianEmail ? "apollohyderabad.in" : "memorialhospital.org"}>`,
      date: "2026-07-03",
      snippet: `Patient Record Update: Lab results are completed and attached. Routine health panel.`,
      body: `Dear Patient,\n\nYour recent blood panel and diagnostic laboratory reports from ${hospital} have been processed and approved by Dr. Anil Kumar.\n\nKey Findings:\n- HbA1c: 6.8% (Slightly High / Prediabetic range)\n- Serum Cholesterol: 215 mg/dL (Borderline High)\n- Blood Group: O+ Positive\n\nPlease discuss these results with your consulting physician at your next scheduled visit. Avoid high-glucose foods and maintain a regular prescription routine.\n\nWarm regards,\nHealth Records Department`
    },
    {
      id: "v-em-4",
      subject: `Appointment Confirmed: Cardiology Consultation`,
      sender: `Appointment Desk <scheduling@${isIndianEmail ? "apollohospitals.com" : "memorialhospital.org"}>`,
      date: "2026-07-03",
      snippet: `Your consulting appointment with Dr. S. Raghavan is confirmed for July 8, 2026.`,
      body: `Dear ${displayName},\n\nWe have successfully scheduled your clinic consultation visit.\nDoctor: Dr. S. Raghavan (Senior Cardiologist)\nFacility: Outpatient Block, 3rd Floor, ${hospital}\nDate: July 8, 2026\nTime: 10:30 AM IST\n\nPlease arrive 15 minutes prior to your slot with your previous diagnostic records and government ID (or Aadhaar card).\n\nTo reschedule, please reply to this email or call our care line.\n\nRegards,\nScheduling Coordinator`
    },
    {
      id: "v-em-5",
      subject: `Booking Confirmed: Hyderabad to New Delhi - Flight AI-542`,
      sender: `Air India Reservations <reservations@${isIndianEmail ? "airindia.in" : "flights.com"}>`,
      date: "2026-06-30",
      snippet: `Booking Reference: TXR991. E-ticket for your upcoming travel on July 12, 2026.`,
      body: `Thank you for choosing us, ${displayName}!\n\nYour flight booking is confirmed. Your itinerary details are below:\nPassenger Name: ${displayName}\nBooking Reference (PNR): TXR991\nFlight: AI-542 (Economy Class)\nDeparture: Hyderabad (HYD) - July 12, 2026 at 06:45 AM\nArrival: New Delhi (DEL) - July 12, 2026 at 09:00 AM\n\nPlease complete web check-in within 48 hours of departure. Luggage limit is 15kg check-in, 7kg hand carry.\n\nHave a safe journey!\nCustomer Care Desk`
    }
  ];
}

// VITE CLIENT MIDDLEWARE & ROUTING INTEGRATION
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving production static build from:", distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LifeContinuityAI Backend Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
