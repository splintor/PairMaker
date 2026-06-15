/**
 * Hebrew (RTL) magic sign-in email. Used for both regular login and the
 * "send invitation" flow — clicking the button signs the recipient straight in.
 */
export function magicLinkEmail(url: string): { subject: string; text: string; html: string } {
  const subject = "כניסה ל-Pair Maker";
  const lead = "ברוך הבא ל-Pair Maker - מערכת לניהול מועמדים לשידוך.";
  const cta = "אתה מוזמן להכנס למערכת בלחיצה על הכפתור.";
  const button = "כניסה למערכת";

  const text = `${lead}\n${cta}\n\n${url}`;

  const html = `<!doctype html>
<html dir="rtl" lang="he">
  <body style="margin:0;background:#f1f5f9;font-family:system-ui,-apple-system,'Segoe UI','Noto Sans Hebrew',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px;text-align:right;" dir="rtl">
          <tr><td>
            <h1 style="margin:0 0 16px;font-size:22px;color:#4338ca;">💞 ברוך הבא ל-Pair Maker</h1>
            <p style="margin:0 0 8px;font-size:15px;color:#334155;line-height:1.6;">מערכת לניהול מועמדים לשידוך.</p>
            <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.6;">${cta}</p>
            <a href="${url}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:10px;">${button}</a>
            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">אם לא ביקשת להיכנס למערכת, אפשר להתעלם מהודעה זו.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
