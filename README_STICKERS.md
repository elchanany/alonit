
# מדריך סטיקרים ו-GIFs (Tenor מבית Google)

בהתאם לבקשתך לפתרון **חינמי לחלוטין** וללא הגבלות קשוחות, העברתי את המערכת ל-**Tenor API** (בבעלות Google).

## למה Tenor?
*   **חינם:** חלק מ-Google Cloud (מכסה ענקית בחינם).
*   **איכות:** המקור של המקלדת של גוגל (Gboard) ודיסקורד.
*   **סטיקרים שקופים:** תמיכה מלאה בסטיקרים ללא רקע.

## איך מפעילים? (תהליך חד-פעמי)

1.  כנס ל- [Google Cloud Console](https://console.cloud.google.com/).
2.  צור פרויקט חדש (או בחר קיים).
3.  בתפריט בצד, לך ל-**APIs & Services** > **Library**.
4.  חפש **"Tenor API"** ולחץ על **Enable**.
5.  לך ל-**Credentials** ולחץ על **Create Credentials** -> **API Key**.
6.  העתק את המפתח שנוצר.

## הגדרת המפתח באתר
פתח את הקובץ `.env.local` בתיקייה הראשית והוסף את השורה הבאה:

```env
NEXT_PUBLIC_TENOR_API_KEY=YOUR_COPIED_KEY_HERE
```

זהו! עכשיו יש לך גישה למיליוני סטיקרים ו-GIFs בחינם. 🚀
