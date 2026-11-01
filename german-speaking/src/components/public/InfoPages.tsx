"use client";

import Link from "next/link";
import { BrandMark, PublicPage, StartBand, useTr, type Tri } from "./kit";
import { useSite } from "@/components/site/SiteProvider";

// 📄 About · FAQ · Privacy · Terms — the public pages a serious learning brand needs.

const MADE_BY_URL = "https://mohammed-emad-portfolio.vercel.app/";

export function AboutPage() {
  const tr = useTr();
  const { links } = useSite();
  const values: { icon: string; c: string; title: Tri; text: Tri }[] = [
    { icon: "🗣️", c: "#2563eb", title: { ar: "الكلام أولًا", de: "Sprechen zuerst", en: "Speaking first" }, text: { ar: "اللغة اتعملت عشان نتكلم بيها. كل حاجة في الموقع بتوصلك إنك تفتح بُقّك وتتكلم.", de: "Sprache ist zum Sprechen da. Alles hier führt dich zum Sprechen.", en: "Language is for speaking. Everything here leads you to talk." } },
    { icon: "🇪🇬", c: "#059669", title: { ar: "بلغتنا", de: "In unserer Sprache", en: "In our language" }, text: { ar: "الشرح بالمصري البسيط، من حد لسه ماشي في نفس الطريق.", de: "Erklärungen auf einfachem Ägyptisch – von jemandem auf demselben Weg.", en: "Explanations in simple Egyptian Arabic – from someone on the same path." } },
    { icon: "🧭", c: "#f59e0b", title: { ar: "طريق واضح", de: "Ein klarer Weg", en: "A clear path" }, text: { ar: "خطة يوم بيوم من A1 لحد B2، بدل ما تتوه بين مية مصدر.", de: "Ein Plan Tag für Tag von A1 bis B2 – statt hundert Quellen.", en: "A day-by-day plan from A1 to B2 – instead of a hundred sources." } },
    { icon: "🤝", c: "#db2777", title: { ar: "مع بعض", de: "Gemeinsam", en: "Together" }, text: { ar: "ذاكر مع ناس تانية، واتكلم، وشارك رأيك. محدش بيتعلم لغة لوحده.", de: "Mit anderen lernen, sprechen, Meinung teilen – niemand lernt allein.", en: "Study with others, talk and share – nobody learns a language alone." } },
  ];
  return (
    <PublicPage eyebrow="Über uns" title={tr({ ar: "عن Sprich Deutsch", de: "Über Sprich Deutsch", en: "About Sprich Deutsch" })} intro={tr({ ar: "موقع اتعمل من رحلة حقيقية مع الألماني، عشان أي حد بيتكلم عربي يلاقي طريق واضح يوصّله إنه يتكلم.", de: "Eine Seite aus einer echten Deutsch-Reise – damit jeder Arabischsprachige einen klaren Weg zum Sprechen findet.", en: "A site born from a real German journey – so every Arabic speaker finds a clear way to speaking." })} testid="about-page">
      {/* The story */}
      <section className="card p-6 sm:p-8 grid gap-6 md:grid-cols-[auto_1fr] items-start">
        <span className="grid place-items-center w-24 h-24 rounded-3xl text-white text-4xl font-black" style={{ background: "linear-gradient(135deg,#b91c1c,#7f1d1d)" }} aria-hidden="true">
          M
        </span>
        <div className="space-y-3 leading-relaxed">
          <h2 className="text-2xl font-extrabold">{tr({ ar: "أنا محمد عماد 👋", de: "Ich bin Mohammed Emad 👋", en: "I'm Mohammed Emad 👋" })}</h2>
          <p>{tr({ ar: "بقالي حوالي سنتين بتعلّم ألماني، ولسه بتعلّم كل يوم. في الطريق ده جرّبت حاجات كتير: كتب، فيديوهات، تطبيقات، ومحادثات… وعرفت إيه اللي بيفرق فعلًا وإيه اللي بيضيّع وقت.", de: "Ich lerne seit etwa zwei Jahren Deutsch – und lerne jeden Tag weiter. Unterwegs habe ich viel ausprobiert: Bücher, Videos, Apps, Gespräche – und gelernt, was wirklich hilft.", en: "I've been learning German for about two years – and I'm still learning every day. Along the way I tried a lot: books, videos, apps, conversations – and found out what really helps." })}</p>
          <p>{tr({ ar: "عملت Sprich Deutsch عشان أجمع الحاجات اللي ساعدتني في مكان واحد منظم، وأشارك رحلتي مع أي حد عايز يتكلم ألماني — من غير تعقيد ومن غير ما يتوه.", de: "Mit Sprich Deutsch bringe ich alles, was mir geholfen hat, an einen geordneten Ort – und teile meine Reise mit allen, die Deutsch sprechen wollen.", en: "I built Sprich Deutsch to gather what helped me in one organised place – and share my journey with anyone who wants to speak German." })}</p>
          <p className="text-muted">{tr({ ar: "وكمان بشارك على يوتيوب فلوجات وتجاربي مع الألماني.", de: "Auf YouTube teile ich außerdem Vlogs und Erfahrungen mit Deutsch.", en: "I also share vlogs and experiences with German on YouTube." })}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {links.channelUrl && (
              <a href={links.channelUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary !min-h-[42px]">
                ▶ {tr({ ar: "قناتي على يوتيوب", de: "Mein YouTube-Kanal", en: "My YouTube channel" })}
              </a>
            )}
            <Link href="/test" className="btn btn-ghost !min-h-[42px]">
              🎯 {tr({ ar: "اعرف مستواك", de: "Niveau testen", en: "Check your level" })}
            </Link>
          </div>
        </div>
      </section>

      {/* What we believe */}
      <section className="space-y-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold">{tr({ ar: "بنؤمن بإيه", de: "Woran wir glauben", en: "What we believe" })}</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {values.map((v) => (
            <li key={v.icon} className="card p-5 flex gap-4 items-start" style={{ borderInlineStart: `5px solid ${v.c}` }}>
              <span className="text-3xl" aria-hidden="true">
                {v.icon}
              </span>
              <span>
                <span className="block text-lg font-extrabold">{tr(v.title)}</span>
                <span className="block text-muted mt-1 leading-relaxed">{tr(v.text)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* What's inside */}
      <section className="card p-6 sm:p-8 space-y-4">
        <h2 className="text-2xl font-extrabold">{tr({ ar: "جوه الموقع", de: "Was dich erwartet", en: "What's inside" })}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-center">
          {[
            ["4", { ar: "مستويات من A1 لحد B2", de: "Niveaus A1–B2", en: "levels A1–B2" }],
            ["100", { ar: "موضوع من الحياة اليومية", de: "Alltagsthemen", en: "everyday topics" }],
            ["100", { ar: "جملة في كل موضوع", de: "Sätze pro Thema", en: "sentences per topic" }],
            ["5", { ar: "مهارات: كلام، استماع، قراءة، كتابة، قواعد", de: "Fertigkeiten", en: "skills" }],
          ].map(([n, label], i) => (
            <div key={i} className="rounded-2xl bg-surface-2 p-4">
              <p className="text-4xl font-black de text-[#1f3a5f] dark:text-sky-300">{n as string}</p>
              <p className="text-sm text-muted mt-1">{tr(label as Tri)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Built by */}
      <section className="card p-5 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <BrandMark size={44} />
          <span>
            <span className="block font-extrabold de" dir="ltr">Sprich Deutsch</span>
            <span className="block text-sm text-muted">
              {tr({ ar: "تصميم وتنفيذ", de: "Gestaltet und gebaut von", en: "Designed and built by" })}{" "}
              <a href={MADE_BY_URL} target="_blank" rel="noopener" className="font-bold text-ink underline-offset-4 hover:underline de">
                ME Web
              </a>{" "}
              · Websites &amp; Automation
            </span>
          </span>
        </span>
        <Link href="/faq" className="btn btn-ghost !min-h-[42px]">
          {tr({ ar: "الأسئلة الشائعة", de: "FAQ", en: "FAQ" })}
        </Link>
      </section>
      <StartBand />
    </PublicPage>
  );
}

const FAQ: { q: Tri; a: Tri }[] = [
  { q: { ar: "الموقع ده لمين؟", de: "Für wen ist die Seite?", en: "Who is this site for?" }, a: { ar: "لأي حد بيتكلم عربي وعايز يتكلم ألماني: للشغل، للدراسة، للسفر، أو لنفسه. من الصفر لحد B2.", de: "Für alle Arabischsprachigen, die Deutsch sprechen wollen – für Job, Studium, Reise oder sich selbst. Von null bis B2.", en: "For any Arabic speaker who wants to speak German – for work, study, travel or themselves. From zero to B2." } },
  { q: { ar: "لازم أكون عارف ألماني قبل كده؟", de: "Muss ich schon Deutsch können?", en: "Do I need to know German already?" }, a: { ar: "لا خالص. ابدأ من A1، أو اعمل اختبار المستوى وهو يقولك تبدأ منين.", de: "Nein. Starte mit A1 oder mach den Einstufungstest.", en: "Not at all. Start with A1, or take the placement test." } },
  { q: { ar: "الموقع ببلاش؟", de: "Ist die Seite kostenlos?", en: "Is the site free?" }, a: { ar: "تقدر تعمل حساب وتستخدم المستويات والخطة والتمارين. بعض جلسات شبراخ كافيه ممكن يكون ليها سعر، والسعر بيبقى مكتوب على الجلسة قبل ما تحجز.", de: "Konto, Niveaus, Plan und Übungen kannst du nutzen. Manche Sprachcafé-Termine können etwas kosten – der Preis steht vor der Buchung dabei.", en: "You can create an account and use the levels, plan and exercises. Some Sprachcafé sessions may have a price, shown on the session before you book." } },
  { q: { ar: "المحادثة مع Gemini بتشتغل إزاي؟", de: "Wie funktioniert das Gespräch mit Gemini?", en: "How does the Gemini conversation work?" }, a: { ar: "تدوس «ابدأ مع Gemini»، والموقع يفتحلك Gemini ومعاه تعليمات معمولة لمستواك وموضوعك. تبعتها، تدوس Live وتتكلم. وفي الآخر تقول «Bericht» ياخدلك تقرير بأخطاءك. Gemini خدمة من Google وبتستخدم حسابك عندهم.", de: "„Mit Gemini starten“ öffnet Gemini mit einer Anleitung für dein Niveau und Thema. Senden, Live tippen, sprechen – am Ende „Bericht“ sagen. Gemini ist ein Dienst von Google mit deinem Google-Konto.", en: "“Start with Gemini” opens Gemini with instructions for your level and topic. Send them, tap Live and talk – say “Bericht” at the end for a report. Gemini is a Google service using your Google account." } },
  { q: { ar: "الموقع بيصحّح نطقي إزاي؟", de: "Wie wird meine Aussprache geprüft?", en: "How is my pronunciation checked?" }, a: { ar: "بتسمح للمتصفح يستخدم المايك، وانت بتقول الجملة الموقع بيقارن اللي اتسمع بالجملة الصح ويقولك قلتها صح ولا لأ.", de: "Du erlaubst das Mikrofon; die Seite vergleicht, was erkannt wurde, mit dem richtigen Satz.", en: "You allow the microphone; the site compares what it heard with the correct sentence." } },
  { q: { ar: "هاخد شهادة؟", de: "Bekomme ich ein Zertifikat?", en: "Do I get a certificate?" }, a: { ar: "الموقع مش جهة امتحانات. هو بيجهزك تتكلم وتمتحن. للشهادة الرسمية في امتحانات زي Goethe و ÖSD — وهتلاقي لينكاتهم الرسمية في آخر صفحة كل مستوى.", de: "Die Seite ist keine Prüfungsstelle. Offizielle Zertifikate gibt es z. B. bei Goethe und ÖSD – Links findest du auf jeder Niveauseite.", en: "The site isn't an exam body. Official certificates come from exams like Goethe and ÖSD – links are on every level page." } },
  { q: { ar: "ينفع أذاكر مع صحابي؟", de: "Kann ich mit Freunden lernen?", en: "Can I study with friends?" }, a: { ar: "أيوه. في «المجتمع» اعمل غرفة خاصة وابعتلهم رابط الدعوة، وذاكروا مع بعض بالصوت والشات وتايمر واحد.", de: "Ja. Erstelle in der Community einen privaten Raum und teile den Einladungslink.", en: "Yes. Create a private room in the Community and share the invite link." } },
  { q: { ar: "ينفع على الموبايل؟", de: "Funktioniert es am Handy?", en: "Does it work on my phone?" }, a: { ar: "أيوه، الموقع شغال على الموبايل والتابلت والكمبيوتر. وتقدر تعمله «إضافة للشاشة الرئيسية» ويفتح زي التطبيق.", de: "Ja – auf Handy, Tablet und Computer. „Zum Startbildschirm hinzufügen“ öffnet es wie eine App.", en: "Yes – phone, tablet and computer. “Add to home screen” opens it like an app." } },
  { q: { ar: "بياناتي في أمان؟", de: "Sind meine Daten sicher?", en: "Is my data safe?" }, a: { ar: "كلمة السر محفوظة متشفّرة ومحدش يقدر يشوفها، والموقع مفيهوش إعلانات. التفاصيل كلها في صفحة الخصوصية.", de: "Passwörter werden verschlüsselt (gehasht) gespeichert, keine Werbung. Details im Datenschutz.", en: "Passwords are stored hashed, and there are no ads. Details on the privacy page." } },
];

export function FaqPage() {
  const tr = useTr();
  return (
    <PublicPage eyebrow="Häufige Fragen" title={tr({ ar: "الأسئلة الشائعة", de: "Häufige Fragen", en: "Frequently asked questions" })} intro={tr({ ar: "إجابات سريعة لأكتر حاجات بتتسأل.", de: "Kurze Antworten auf die häufigsten Fragen.", en: "Quick answers to the most common questions." })} testid="faq-page">
      <div className="space-y-3">
        {FAQ.map((f, i) => (
          <details key={i} className="card group overflow-hidden" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 min-h-[56px] font-bold text-lg [&::-webkit-details-marker]:hidden">
              {tr(f.q)}
              <span className="grid place-items-center w-8 h-8 shrink-0 rounded-full bg-surface-2 transition-transform group-open:rotate-180" aria-hidden="true">
                ⌄
              </span>
            </summary>
            <p className="px-5 pb-5 text-muted leading-relaxed">{tr(f.a)}</p>
          </details>
        ))}
      </div>
      <StartBand />
    </PublicPage>
  );
}

function Legal({ eyebrow, title, sections }: { eyebrow: string; title: Tri; sections: { h: Tri; p: Tri }[] }) {
  const tr = useTr();
  return (
    <PublicPage eyebrow={eyebrow} title={tr(title)} intro={tr({ ar: "آخر تحديث: نوفمبر 2026", de: "Stand: November 2026", en: "Last updated: November 2026" })}>
      <div className="card p-6 sm:p-8 space-y-6 leading-relaxed">
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="text-xl font-extrabold">{tr(s.h)}</h2>
            <p className="mt-2 text-muted">{tr(s.p)}</p>
          </section>
        ))}
      </div>
    </PublicPage>
  );
}

export function PrivacyPage() {
  return (
    <Legal
      eyebrow="Datenschutz"
      title={{ ar: "سياسة الخصوصية", de: "Datenschutzerklärung", en: "Privacy policy" }}
      sections={[
        { h: { ar: "بنجمع إيه", de: "Welche Daten", en: "What we collect" }, p: { ar: "اسمك واسم المستخدم وكلمة السر (محفوظة متشفّرة)، وصورتك لو حطيت واحدة. وتقدّمك في الموقع: الجمل اللي قلتها، الكتابة، خطتك، الوقت في التايمر، حجوزاتك، رسايل الغرف، والريفيوز اللي كتبتها.", de: "Name, Benutzername und Passwort (gehasht), optional ein Foto. Dein Lernfortschritt: Sätze, Texte, Plan, Timer-Zeit, Buchungen, Raumnachrichten und deine Bewertungen.", en: "Your name, username and password (hashed), and a photo if you add one. Your progress: sentences, writing, plan, timer time, bookings, room messages and reviews you write." } },
        { h: { ar: "بنستخدمها في إيه", de: "Wofür", en: "Why" }, p: { ar: "عشان الموقع يشتغل ليك: يحفظ تقدّمك، يكمّلك من مكان ما وقفت، ويوريك إحصائياتك. مش بنبيع بياناتك ومفيش إعلانات.", de: "Damit die Seite für dich funktioniert: Fortschritt speichern, weitermachen, Statistiken zeigen. Kein Verkauf von Daten, keine Werbung.", en: "To make the site work for you: save progress, resume where you stopped, show your stats. We don't sell your data and there are no ads." } },
        { h: { ar: "إيه اللي بيظهر للناس", de: "Was andere sehen", en: "What others see" }, p: { ar: "في المجتمع بيظهر اسمك وصورتك بس لو فعّلت «اظهر إني متاح»، ورسايلك بتظهر لأعضاء الغرفة. الريفيوز بتظهر باسمك الأول بس، وبعد المراجعة.", de: "In der Community nur, wenn du „verfügbar“ aktivierst; Nachrichten sehen Raummitglieder. Bewertungen nur mit Vornamen, nach Prüfung.", en: "In the Community only if you turn on “available”; room messages are seen by room members. Reviews show your first name only, after review." } },
        { h: { ar: "الكوكيز", de: "Cookies", en: "Cookies" }, p: { ar: "بنستخدم كوكيز ضرورية بس: واحدة عشان تفضل مسجّل دخول، وواحدة للغة، وواحدة لآخر مستوى فتحته.", de: "Nur notwendige Cookies: Anmeldung, Sprache und zuletzt geöffnetes Niveau.", en: "Only necessary cookies: staying logged in, language, and your last level." } },
        { h: { ar: "خدمات تانية", de: "Andere Dienste", en: "Other services" }, p: { ar: "فيديوهات يوتيوب مش بتتحمّل غير لما تدوس تشغيل. ولما تفتح Gemini أو Google Meet، انت بتتعامل مع Google مباشرة وبتسري عليك سياستهم.", de: "YouTube-Videos laden erst nach Klick. Bei Gemini oder Google Meet gilt die Datenschutzerklärung von Google.", en: "YouTube videos load only after you press play. When you open Gemini or Google Meet, Google's policy applies." } },
        { h: { ar: "حقوقك", de: "Deine Rechte", en: "Your rights" }, p: { ar: "تقدر تغيّر اسمك وصورتك أو تشيل صورتك من قايمة البروفايل. ولو عاوز تمسح حسابك وكل بياناتك، كلّمنا وهنمسحها.", de: "Name und Foto änderst (oder entfernst) du im Profilmenü. Willst du dein Konto samt Daten löschen, schreib uns – wir löschen es.", en: "Change your name and photo (or remove the photo) in the profile menu. To delete your account and all data, contact us and we will delete it." } },
        { h: { ar: "تواصل معانا", de: "Kontakt", en: "Contact" }, p: { ar: "لأي سؤال عن خصوصيتك، تواصل معانا من خلال ME Web أو قناة اليوتيوب.", de: "Fragen zum Datenschutz? Über ME Web oder den YouTube-Kanal.", en: "Privacy questions? Reach us via ME Web or the YouTube channel." } },
      ]}
    />
  );
}

export function TermsPage() {
  return (
    <Legal
      eyebrow="Nutzungsbedingungen"
      title={{ ar: "شروط الاستخدام", de: "Nutzungsbedingungen", en: "Terms of use" }}
      sections={[
        { h: { ar: "حسابك", de: "Dein Konto", en: "Your account" }, p: { ar: "حسابك ليك انت بس، وانت المسؤول عن كلمة السر بتاعتك.", de: "Dein Konto gehört dir; du bist für dein Passwort verantwortlich.", en: "Your account is yours alone; you're responsible for your password." } },
        { h: { ar: "الاحترام", de: "Respekt", en: "Respect" }, p: { ar: "في الغرف والشات والريفيوز: احترم الناس. ممنوع الإساءة أو الإعلانات أو أي محتوى مش مناسب. الإدارة ممكن تمسح أي محتوى أو توقف أي حساب بيخالف ده.", de: "In Räumen, Chat und Bewertungen: respektvoll bleiben. Keine Beleidigungen, Werbung oder unpassende Inhalte – sonst kann der Admin Inhalte löschen oder Konten sperren.", en: "In rooms, chat and reviews: be respectful. No abuse, ads or inappropriate content – admins may remove content or suspend accounts." } },
        { h: { ar: "المحتوى", de: "Inhalte", en: "Content" }, p: { ar: "محتوى الموقع للمذاكرة الشخصية. فيديوهات DW و Easy German وغيرهم ملك أصحابها وبتتعرض من يوتيوب الرسمي.", de: "Inhalte sind zum persönlichen Lernen. Videos von DW, Easy German u. a. gehören ihren Urhebern und laufen über den offiziellen YouTube-Player.", en: "Content is for personal study. Videos by DW, Easy German and others belong to their owners and play via the official YouTube player." } },
        { h: { ar: "شبراخ كافيه", de: "Sprachcafé", en: "Sprachcafé" }, p: { ar: "مواعيد الجلسات وأسعارها مكتوبة على كل جلسة. لينك الاجتماع للحاجزين بس، ومينفعش تشاركه مع حد تاني.", de: "Termine und Preise stehen bei jeder Sitzung. Der Meeting-Link ist nur für Gebuchte und darf nicht weitergegeben werden.", en: "Times and prices are shown on each session. The meeting link is for booked learners only and must not be shared." } },
        { h: { ar: "مفيش ضمانات", de: "Keine Garantie", en: "No guarantee" }, p: { ar: "بنعمل كل اللي نقدر عليه عشان الموقع يساعدك، بس النتيجة بتعتمد على مجهودك واستمرارك. الموقع مش جهة امتحانات رسمية.", de: "Wir tun alles, damit die Seite hilft – der Erfolg hängt von deiner Übung ab. Keine offizielle Prüfungsstelle.", en: "We do our best to help, but results depend on your practice. The site is not an official exam body." } },
      ]}
    />
  );
}
