# quiz-analyzer

שירות שרת מינימלי (Express, endpoint יחיד) שמנתח one-pager שהמשתמש מעלה בשאלון
`quiz.inno-tech.io`, קורא ל-Claude API בצד השרת (המפתח לעולם לא נחשף לדפדפן),
ומחזיר JSON עם השדות המחולצים למילוי אוטומטי של השאלון.

אין כאן מסד נתונים ואין שמירת מידע — כל קובץ מעובד בזיכרון ונזרק מיד אחרי התשובה.

---

## פריסה על Render — שלב אחר שלב

### שלב 1 — צור Web Service חדש

1. היכנס ל-https://dashboard.render.com
2. **New +** → **Web Service**
3. חבר את הריפו הזה (או ריפו נפרד שתעלה עם 3 הקבצים: `server.js`, `package.json`, `render.yaml`)
4. Render יזהה את `render.yaml` אוטומטית ויציע את ההגדרות הבאות (אפשר גם להזין ידנית):
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

### שלב 2 — הגדר משתני סביבה

בעמוד ה-Service, תחת **Environment**:

| משתנה | ערך |
|---|---|
| `ANTHROPIC_API_KEY` | מפתח ה-API שלך מ-https://console.anthropic.com/settings/keys |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` (כבר מוגדר כברירת מחדל ב-`render.yaml`) |
| `ALLOWED_ORIGINS` | `https://quiz.inno-tech.io` — הדומיין שממנו מותר לקרוא לשירות (אפשר כמה, מופרדים בפסיק) |

**חשוב:** `ANTHROPIC_API_KEY` מוגדר ב-`render.yaml` עם `sync: false` — כלומר Render **לא** ישמור אותו בקובץ, ואתה **חייב** להזין אותו ידנית בדשבורד אחרי הפריסה הראשונה.

### שלב 3 — Deploy

לחץ **Create Web Service**. אחרי כמה דקות תקבל כתובת כמו:
```
https://quiz-analyzer.onrender.com
```

### שלב 4 — עדכן את ה-frontend

פתח את `index.html` (בריפו `quiz`), ועדכן את השורה:
```javascript
var ANALYZE_URL = "https://quiz-analyzer.onrender.com/api/analyze";
```
עם הכתובת האמיתית שקיבלת משלב 3, כולל `/api/analyze` בסוף.

### שלב 5 — בדיקה

1. היכנס ל-`https://quiz-analyzer.onrender.com/health` — אמור להחזיר `{"ok":true}`
2. בשאלון עצמו — העלה one-pager לדוגמה, ובדוק שהשדות מתמלאים

---

## הערת עלות ותזמון

- Render בתוכנית ה-**Free/Starter** "נרדם" אחרי חוסר פעילות — קריאה ראשונה אחרי שינה עלולה לקחת 30-60 שניות. אם זה בעייתי בפועל, שדרג ל-plan בתשלום שנשאר "ער" תמיד.
- עלות קריאה בודדת ל-Anthropic API זניחה (סנט אחד או פחות) — ראה את הפירוט שכבר חושב בשיחה.
