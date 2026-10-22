/* =========================================================================
   المشاريع — Projects
   لإضافة مشروع جديد: انسخ مشروعًا كاملًا من { إلى } والصقه في أول القائمة
   (أول مشروع في القائمة يظهر أولًا في الموقع)، ثم عدّل البيانات.
   صفحة دراسة الحالة تُنشأ تلقائيًا على الرابط: project.html?p=slug

   ملاحظات:
   - slug: اسم قصير بالإنجليزي بدون مسافات (يُستخدم في الرابط وفي اسم مجلد الصور)
   - أي نص يمكن كتابته بلغة واحدة فقط "نص" أو بلغتين { ar: "...", en: "..." }
   - url: رابط الموقع الحقيقي. لو تركته فارغًا "" سيختفي زر "زيارة الموقع"
   - brief و year اختياريان: لو تركتهما "" لن يظهرا في صفحة المشروع
   - الصور: ضعها في assets/projects/<slug>/ (التفاصيل في README.md)
   - mobile: صورة 1600×1000 تعرض الموقع على الموبايل (اختيارية)
   ========================================================================= */
window.PROJECTS = [
  {
    slug: "mad-watches",
    name: "Mad Watches",
    url: "https://mad-watches.vercel.app/",
    year: "",
    color: "#2B5A8C",        // لون خلفية الصورة المؤقتة فقط (يظهر لو صورة ناقصة)

    type: { ar: "متجر إلكتروني", en: "E-commerce store" },
    summary: {
      ar: "متجر إلكتروني للساعات في مصر — «⁨Beauty & Simplicity⁩».",
      en: "Online watch store in Egypt — “Beauty & Simplicity.”"
    },

    idea: {
      ar: "متجر إلكتروني للساعات في مصر، مبني حول شعار العلامة «⁨Beauty & Simplicity⁩»: تصميم هادئ ونظيف يجعل الساعة هي البطل، وطلب سهل من السلة أو عبر واتساب.",
      en: "An online watch store in Egypt, built around the brand’s tagline, “Beauty & Simplicity”: a calm, clean design that lets the watch take center stage, with easy ordering from the cart or on WhatsApp."
    },
    brief: "",
    built: {
      ar: [
        "تصميم نظيف وهادئ يعبّر عن شعار العلامة",
        "صفحة المتجر لتصفّح الساعات",
        "صفحة لكل منتج بالصور والسعر والتفاصيل",
        "سلة مشتريات",
        "الطلب والتواصل عبر واتساب",
        "دعم اللغتين العربية والإنجليزية"
      ],
      en: [
        "Clean, calm design that reflects the brand’s tagline",
        "Shop page to browse the watches",
        "A page for every product with photos, price, and details",
        "Shopping cart",
        "WhatsApp ordering and chat",
        "Arabic and English support"
      ]
    },

    cover: "assets/projects/mad-watches/cover.jpg",
    screenshots: [
      "assets/projects/mad-watches/shot-1.jpg",
      "assets/projects/mad-watches/shot-2.jpg",
      "assets/projects/mad-watches/shot-3.jpg"
    ],
    mobile: "assets/projects/mad-watches/mobile.jpg"
  },

  {
    slug: "ahmed-ark",
    name: "Ahmed Ark",
    url: "https://motion-portfolio-umber.vercel.app/",
    year: "",
    color: "#7C4DFF",

    type: { ar: "موقع شخصي لمونتير وموشن ديزاينر", en: "Portfolio for a video editor & motion designer" },
    summary: {
      ar: "بورتفوليو سينمائي لأحمد آرك، مونتير وموشن ديزاينر متخصص في After Effects.",
      en: "A cinematic portfolio for Ahmed Ark, a video editor and motion designer specializing in After Effects."
    },

    idea: {
      ar: "بورتفوليو سينمائي لأحمد آرك، المونتير والموشن ديزاينر المتخصص في After Effects، يعرض أعماله في الفيديو لعملاء من كل أنحاء العالم — بتصميم داكن مستوحى من السينما يترك الأعمال تتحدث عن نفسها.",
      en: "A cinematic portfolio for Ahmed Ark, a video editor and motion designer specializing in After Effects, built to showcase his video work to clients worldwide — with a dark, film-inspired design that lets the work speak for itself."
    },
    brief: "",
    built: {
      ar: [
        "تصميم داكن وسينمائي يناسب عالم الموشن والفيديو",
        "معرض فيديو مع تصفية الأعمال حسب الفئة (موشن جرافيك، إعلانات، ريلز للسوشيال ميديا)",
        "صفحة مخصصة لكل مشروع",
        "قسم «عنّي» مع أدواته (After Effects، Premiere، DaVinci Resolve وغيرها)",
        "قسم الخدمات",
        "نموذج تواصل يرسل الطلب مباشرة إلى واتساب، مع خانات لنوع المشروع والميزانية",
        "دعم اللغتين العربية والإنجليزية"
      ],
      en: [
        "Dark, cinematic design that fits the motion and video industry",
        "Video showcase with work filtered by category (Motion Graphics, Commercials / Ads, Social Media Reels)",
        "A dedicated page for each project",
        "About section with his toolkit (After Effects, Premiere, DaVinci Resolve, and more)",
        "Services section",
        "Contact form that sends the inquiry straight to WhatsApp, with project type and budget fields",
        "Arabic and English support"
      ]
    },

    cover: "assets/projects/ahmed-ark/cover.jpg",
    screenshots: [
      "assets/projects/ahmed-ark/shot-1.jpg",
      "assets/projects/ahmed-ark/shot-2.jpg",
      "assets/projects/ahmed-ark/shot-3.jpg"
    ],
    mobile: "assets/projects/ahmed-ark/mobile.jpg"
  }
];
