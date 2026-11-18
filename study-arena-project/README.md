# Study Arena — ساحة التحدي

واجهة عربية RTL داكنة ومتجاوبة لمنافسات المذاكرة. يحتوي المشروع على واجهة تجريبية قابلة للتشغيل، مع بداية Backend باستخدام Firebase Functions وFirestore Rules.

## التشغيل محليًا
1. ثبّت Node.js 20 أو أحدث.
2. فك الضغط ثم نفّذ:
   ```bash
   npm install
   npm run dev
   ```
3. افتح الرابط الذي يظهر في الطرفية.

### حساب العرض
- الهاتف: `01000000000`
- كلمة المرور: `123456`

يمكن تجربة الواجهة محليًا: الأصدقاء والملف الشخصي والسجل محفوظة في LocalStorage على نفس المتصفح. المنافسة التجريبية تعمل على جهاز واحد، وتعرض أسئلة نموذجية؛ لا تعتبرها منافسة حقيقية بين لاعبين.

## ربط Firebase
1. أنشئ مشروع Firebase وفعّل Authentication (Email/Password) وFirestore.
2. أنشئ Web App وانسخ إعداداته في `public/firebase-config.js` (أنشئ الملف من المثال أدناه) أو عرّف `window.STUDY_ARENA_FIREBASE` قبل تحميل التطبيق.
3. انسخ قواعد `firestore.rules` وانشرها.
4. داخل مجلد `functions` نفّذ `npm install`.
5. من جذر المشروع:
   ```bash
   firebase functions:secrets:set INVITE_CODE
   firebase functions:secrets:set OPENAI_API_KEY
   firebase deploy
   ```
   أدخل رمز الدعوة `AY2009` عند طلب السر. لا تضعه في ملفات الواجهة.
6. يجب أن تضيف استخراج PDF/DOCX على الخادم قبل الاعتماد على توليد الأسئلة من هذه الأنواع. النسخة الحالية ترسل النص فقط إذا كان الملف TXT.

مثال إعداد Firebase (لا تضع أي أسرار فيه):
```js
window.STUDY_ARENA_FIREBASE = {
  apiKey: "YOUR_FIREBASE_WEB_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID"
};
```
ضع هذا قبل سكربت التطبيق في `index.html` أو أضف ملف إعدادات محليًا غير مرفوع للمستودع.

## مهم قبل الإطلاق العام
هذا إصدار تأسيسي وليس نظامًا إنتاجيًا مكتملًا. يلزم استكمال:
- نقل إدارة الأصدقاء والدعوات والنتائج بالكامل إلى Cloud Functions مع تحقق صلاحيات كل طرف.
- غرفة منافسة حقيقية متزامنة للاعبين، حالة جاهزية للطرفين، ومزامنة عبر Firestore.
- حفظ مفتاح الإجابة في مستند خاص لا يستطيع العميل قراءته، والتحقق من الإجابات والنقاط والمؤقت على الخادم. لا تعرض `answer` للعميل كما في نموذج الدالة الحالي قبل تحويله إلى تدفق آمن.
- استخراج النص من PDF وDOCX على الخادم، وفحص نوع الملف وحجمه وتخزينه في Cloud Storage مع قواعد وصول.
- إضافة rate limiting، حماية إساءة الاستخدام، مراجعة قواعد Firestore، واختبارات أمنية.
- تسجيل الدخول بالهاتف الحالي يستخدم alias داخليًا لـ Firebase Email/Password؛ إن أردت OTP حقيقيًا فاستبدله بـ Firebase Phone Authentication.

## الملفات
- `src/main.js` واجهة التطبيق وسير التفاعل التجريبي.
- `src/style.css` التصميم المتجاوب.
- `functions/index.js` وظائف Backend أولية.
- `firestore.rules` قواعد مبدئية.
- `public/manifest.webmanifest` إعداد PWA.
