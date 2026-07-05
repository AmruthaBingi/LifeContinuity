export interface RawGmailMessage {
  id: string;
  snippet: string;
  subject: string;
  sender: string;
  date: string;
  body: string;
}

/**
 * Fetch real emails from the user's Gmail mailbox using their Google OAuth Access Token
 */
export async function fetchGmailEmails(accessToken: string, limit = 8, customQuery?: string): Promise<RawGmailMessage[]> {
  try {
    // Search query focusing on important financial/medical/life continuity keywords
    const query = customQuery || "subject:(bill OR invoice OR premium OR policy OR medical OR appointment OR hospital OR health OR insurance OR electricity OR water OR gas OR loan OR mortgage OR emi OR bank OR statement OR credit)";
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}&q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gmail API request failed with status ${response.status}: ${errText}`);
    }

    const listData = await response.json();
    if (!listData.messages || listData.messages.length === 0) {
      return [];
    }

    // Fetch full details of each message
    const emailPromises = listData.messages.map(async (msg: { id: string }) => {
      try {
        const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
        const msgRes = await fetch(msgUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });

        if (!msgRes.ok) return null;

        const msgData = await msgRes.json();
        const headers: { name: string; value: string }[] = msgData.payload?.headers || [];

        const getHeader = (name: string) => {
          return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
        };

        const subject = getHeader("subject") || "No Subject";
        const sender = getHeader("from") || "Unknown Sender";
        const date = getHeader("date") || "No Date";
        const snippet = msgData.snippet || "";

        // Extract body text if available
        let body = "";
        const parts = msgData.payload?.parts;
        if (parts) {
          const findPlainTextPart = (partsList: any[]): string => {
            for (const part of partsList) {
              if (part.mimeType === "text/plain" && part.body?.data) {
                return part.body.data;
              }
              if (part.parts) {
                const found = findPlainTextPart(part.parts);
                if (found) return found;
              }
            }
            return "";
          };
          const base64Body = findPlainTextPart(parts);
          if (base64Body) {
            try {
              // Decode base64 URL-safe string
              const normalized = base64Body.replace(/-/g, "+").replace(/_/g, "/");
              body = decodeURIComponent(
                atob(normalized)
                  .split("")
                  .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                  .join("")
              );
            } catch (e) {
              console.warn("UTF8 body decoding fallback error:", e);
              try {
                body = atob(base64Body.replace(/-/g, "+").replace(/_/g, "/"));
              } catch (fallbackErr) {
                console.error("Base64 decode failed entirely:", fallbackErr);
              }
            }
          }
        }

        return {
          id: msg.id,
          snippet,
          subject,
          sender,
          date,
          body: body || snippet,
        };
      } catch (detailErr) {
        console.error(`Error loading details for message ${msg.id}:`, detailErr);
        return null;
      }
    });

    const results = await Promise.all(emailPromises);
    return results.filter((r): r is RawGmailMessage => r !== null);
  } catch (err) {
    console.error("fetchGmailEmails service error:", err);
    throw err;
  }
}
