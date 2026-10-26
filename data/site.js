/* =========================================================================
   إعدادات الموقع العامة — Site settings
   عدّل القيم هنا فقط. أي قيمة تتركها فارغة "" سيتم إخفاؤها من الموقع تلقائيًا.
   ========================================================================= */
window.SITE = {
  // اسمك كما يظهر في الموقع موجود في js/i18n.js تحت brand.name

  // عنوان الموقع على الإنترنت بدون / في الآخر. لو اشتريت دومين بعدين غيّره هنا
  // (وفي sitemap.xml و robots.txt) عشان جوجل يعرف العنوان الأساسي للموقع.
  siteUrl: "https://mohammed-emad-portfolio.vercel.app",

  // لغة الموقع الافتراضية: "ar" للعربية أو "en" للإنجليزية
  defaultLang: "ar",

  // رقم واتساب بالصيغة الدولية بدون + أو مسافات
  whatsapp: "201105684641",
  // نفس الرقم كما يظهر للزوار
  whatsappDisplay: "+20 110 568 4641",

  // بريدك الإلكتروني
  email: "mohammed.emad.official110@gmail.com",

  // روابط السوشيال: المكان الوحيد اللي بتتحط فيه الروابط.
  // حط الرابط كامل بين علامتي التنصيص، والأيقونة هتظهر لوحدها في كل الموقع
  // (قسم التواصل والفوتر). أي رابط فاضي "" أيقونته مش بتظهر خالص.
  // ترتيب الظهور: Instagram ثم Facebook ثم YouTube ثم TikTok.
  social: {
    instagram: "https://www.instagram.com/me.web.design/",
    tiktok: "https://www.tiktok.com/@me.web.design",
    facebook: "",
    youtube: "https://www.youtube.com/@MohammedEmad-ilden"
  },

  // يظهر شارة "متاح لمشاريع جديدة" أعلى الصفحة. اجعلها false لإخفائها
  available: true,

  // الرسالة الجاهزة التي تُكتب تلقائيًا عند فتح واتساب
  whatsappMessage: {
    ar: "أهلًا ME Web، حابب أبدأ مشروع موقع.",
    en: "Hi ME Web, I'd like to start a website project."
  },

  // الرسالة الجاهزة لزر "احجز اجتماعًا مجانيًا"
  consultMessage: {
    ar: "أهلًا ME Web، حابب أحجز استشارة مجانية بخصوص موقعي",
    en: "Hi ME Web, I'd like to book a free consultation about my website"
  }
};
