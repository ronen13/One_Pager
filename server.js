const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

// ── CORS: רק המקורות שמותר להם לקרוא ל-endpoint הזה ──
// הוסף/הסר מקורות לפי הצורך (הדומיין הסופי של quiz.inno-tech.io + כתובת ה-Render של השאלון עצמו)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://quiz.inno-tech.io')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // בקשות בלי Origin (למשל curl/health checks) מותרות תמיד
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Origin not allowed'));
  }
}));

// ── קובץ יחיד בשם "file", עד 10MB, בזיכרון (לא נשמר לדיסק) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.get('/health', (req, res) => res.json({ ok: true }));

// ── סכימת השאלון: השדות והערכים המדויקים כפי שהם מופיעים ב-checkboxes/radios של index.html ──
const SCHEMA_INSTRUCTIONS = `
אתה מנתח מסמך "one-pager" עסקי (PDF או תמונה) ומחלץ ממנו מידע כדי למלא טופס מובנה עבור שאלון התאמה למענקים.

--- שדות הטופס ---
- name (טקסט): שם איש הקשר / היזם, אם מוזכר. אם לא מוזכר שם אדם ספציפי — השאר ריק.
- company (טקסט): שם החברה / המיזם.
- year (טקסט): שנת הקמה, אם מוזכרת.
- website (טקסט): אתר או עמוד רשת, אם מוזכר.
- country (טקסט): ארץ הפעילות העיקרית.
- description (טקסט חופשי): תיאור קצר (2-4 משפטים) של מה המיזם עושה/מציע, על בסיס המסמך.
- sector (מערך): בחר אך ורק מהרשימה הבאה, אחד או יותר לפי מה שמתאים בפועל למיזם:
  ["טכנולוגיה / חדשנות","בריאות / ביוטק","חקלאות / אגריטק","אנרגיה / קיימות","חינוך / אימפקט חברתי","תחבורה / לוגיסטיקה","אחר"]
  אם התחום לא מתאים לאף אחת מהאפשרויות, בחר "אחר" ותאר אותו בשדה sector_other.
- sector_other (טקסט): פירוט אם נבחר "אחר" ב-sector. אחרת השאר ריק.
- stage (טקסט, ערך יחיד): בחר בדיוק אחד מהרשימה:
  ["רעיון / שלב מוקדם","אבטיפוס / פיתוח","השקה / מכירות ראשונות","צמיחה / הרחבה לשווקים חדשים"]
  אם לא ניתן לקבוע בביטחון סביר מהמסמך — השאר ריק ("").
- goal (מערך): בחר מהרשימה הבאה לפי מטרות המימון שמוזכרות או משתמעות במסמך:
  ["מחקר ופיתוח","גיוס עובדים / הרחבת הצוות","חדירה לשווקים חדשים","רכישת ציוד / טכנולוגיה","פעילות שיווקית / עסקית","אחר"]
  אם לא ברור מהמסמך למה מיועד המימון — השאר מערך ריק [].
- goal_other (טקסט): פירוט אם נבחר "אחר" ב-goal. אחרת השאר ריק.
- funding (טקסט, ערך יחיד): בחר בדיוק אחד מהרשימה, אך ורק אם סכום מימון מבוקש מוזכר במפורש במסמך:
  ["עד 50,000 ₪","50,000–250,000 ₪","250,000–1,000,000 ₪","מעל 1,000,000 ₪"]
  אם אין אזכור מפורש לסכום מבוקש — השאר ריק (""). אל תנחש.
- region (מערך): בחר מהרשימה הבאה לפי אזורי הפעילות/עניין שמוזכרים במסמך:
  ["ישראל","אירופה","ארה\\"ב","אפריקה","אחר"]
  אם לא ברור — השאר מערך ריק [].
- region_other (טקסט): פירוט אם נבחר "אחר" ב-region. אחרת השאר ריק.
- intl (טקסט, ערך יחיד): בחר בדיוק אחד מהרשימה אם ניתן להסיק מהמסמך, אחרת השאר ריק:
  ["כן","לא","אולי – תלוי בהזדמנות"]
- past_grants (טקסט חופשי): אזכור של מענקים/מימון קודמים שהתקבלו, אם מוזכר. אחרת ריק.
- deadline (טקסט חופשי): דדליין קרוב או תכנית ספציפית שהמיזם מתכנן להגיש אליה, אם מוזכר. אחרת ריק.
- notes (טקסט חופשי): כל מידע רלוונטי נוסף מהמסמך שלא נכנס לשדות האחרים ושיכול לעזור בהתאמת מענקים.

--- כללים קריטיים ---
1. אל תמציא מידע שאינו במסמך. אם שדה לא ברור מהמסמך — השאר אותו ריק ("" לטקסט, [] למערך). עדיף שדה ריק מניחוש שגוי.
2. אל תבחר ערכים שאינם ברשימות הסגורות שלמעלה — אלו הערכים היחידים שהמערכת מכירה.
3. החזר אך ורק אובייקט JSON תקין אחד, בדיוק בשמות השדות שלמעלה, בלי טקסט נוסף, בלי הסברים, בלי markdown fences.
`.trim();

app.post('/api/analyze', upload.single('file'), async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'השרת לא הוגדר כראוי (חסר מפתח API)' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'לא התקבל קובץ' });
  }

  const mime = req.file.mimetype;
  const isPdf = mime === 'application/pdf';
  const isImage = /^image\/(png|jpe?g|webp|gif)$/.test(mime);

  if (!isPdf && !isImage) {
    return res.status(400).json({ error: 'סוג קובץ לא נתמך — יש להעלות PDF או תמונה (PNG/JPG)' });
  }

  const base64 = req.file.buffer.toString('base64');
  const documentBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } };

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1200,
        system: SCHEMA_INSTRUCTIONS,
        messages: [{
          role: 'user',
          content: [
            documentBlock,
            { type: 'text', text: 'נתח את המסמך המצורף והחזר את אובייקט ה-JSON כפי שהוגדר בהנחיות.' }
          ]
        }]
      })
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error('Anthropic API error:', apiRes.status, errText);
      return res.status(502).json({ error: 'שגיאה בניתוח המסמך — נסה שוב' });
    }

    const data = await apiRes.json();
    const rawText = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();

    // הגנה למקרה שהמודל בכל זאת עוטף ב-markdown fences
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');

    let extracted;
    try {
      extracted = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse model output as JSON:', rawText);
      return res.status(502).json({ error: 'לא הצלחנו לפרש את תוצאת הניתוח — נסה שוב' });
    }

    res.json({ ok: true, data: extracted });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: 'שגיאה כללית בעת ניתוח המסמך' });
  }
});

app.listen(PORT, () => console.log(`✅ Quiz analyzer running on port ${PORT}`));
