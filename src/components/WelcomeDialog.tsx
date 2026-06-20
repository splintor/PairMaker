"use client";
import { useEffect, useState } from "react";

const COOKIE_NAME = "pair_maker_welcome_seen";

const RULES: { title: string; body: string }[] = [
  {
    title: "שמירה על פרטיות המועמדים",
    body: "המידע המופיע באתר נועד לצורך יצירת היכרות בלבד. אין להעביר, לצלם, להעתיק או לשתף פרטים, תמונות או מידע של מועמד/ת עם גורם אחר ללא הסכמה מפורשת של השדכן השני. השימוש הינו למטרת שידוכים בלבד. האתר מיועד אך ורק לצורך יצירת חיבורים והצעות שידוך. אין לעשות במידע כל שימוש אחר.",
  },
  {
    title: "רגישות וכבוד האדם",
    body: "מאחורי כל כרטיס עומד אדם. יש להתייחס לכל מועמד/ת בכבוד, בדיסקרטיות וברגישות, גם כאשר מחליטים שלא להמשיך בהצעה.",
  },
  {
    title: "מסירת מידע אמין",
    body: "בעת העלאת פרטים או הצעת מועמדות, יש להקפיד שהמידע יהיה מדויק, עדכני ונמסר בתום לב.",
  },
  {
    title: "שמירה על שיח מכבד",
    body: "אין לפרסם הערות פוגעניות, רכילות, לשון הרע או מידע שאינו רלוונטי לתהליך ההיכרות.",
  },
  {
    title: "קבלת הסכמה",
    body: "יש להציע מועמד/ת רק לאחר שקיבלתם את הסכמתם להופיע במיזם ולשתף את פרטיהם.",
  },
  {
    title: "אחריות המשתמשים",
    body: "המיזם מהווה פלטפורמה ליצירת חיבורים בלבד. האחריות לבדיקת ההתאמה, קיום ההיכרות והמשך הקשר היא של הצדדים עצמם.",
  },
  {
    title: "שמירה על רוח הקהילה",
    body: "אנו מבקשים מכל המשתתפים לפעול מתוך רצון טוב, עין טובה ואמונה בכוחה של הקהילה לסייע בבניית בתים בישראל.",
  },
];

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = document.cookie
      .split("; ")
      .some((c) => c.startsWith(`${COOKIE_NAME}=`));
    if (!seen) setOpen(true);
  }, []);

  function close() {
    // Remember on this device for ~5 years.
    document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${60 * 60 * 24 * 365 * 5}; SameSite=Lax`;
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={close}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl2 bg-white text-start shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-brand-100 p-5">
          <h2 className="text-lg font-bold text-brand-700">חברים יקרים,</h2>
          <button
            type="button"
            onClick={close}
            aria-label="סגירה"
            className="-m-1 shrink-0 rounded-lg p-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-5 text-sm leading-relaxed text-slate-700">
          <p>
            המיזם הוקם מתוך רצון לסייע ביצירת חיבורים משמעותיים בקהילה, באווירה
            מכבדת, רגישה ואחראית. כדי לשמור על אמון המשתתפים ועל הצלחת המיזם,
            נבקש להקפיד על הכללים הבאים:
          </p>
          <ul className="space-y-2.5">
            {RULES.map((rule) => (
              <li key={rule.title} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                <span>
                  <span className="font-semibold text-slate-800">
                    {rule.title}
                  </span>{" "}
                  – {rule.body}
                </span>
              </li>
            ))}
          </ul>
          <p className="font-semibold text-slate-800">
            כניסה לאתר ושימוש בו מהווים הסכמה לכללים אלו.
          </p>
          <p>
            יהי רצון שמיזם זה יהיה כלי להוספת חיבורים טובים, שמחה וברכה, ושנזכה
            לבשר בשורות טובות בקרוב ❤️
          </p>
        </div>

        <div className="border-t border-brand-100 p-4">
          <button
            type="button"
            onClick={close}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            הבנתי, אפשר להמשיך
          </button>
        </div>
      </div>
    </div>
  );
}
