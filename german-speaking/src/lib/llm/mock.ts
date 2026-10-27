// Offline stand-in for Claude. Used when ANTHROPIC_API_KEY is missing (or LLM_PROVIDER=mock),
// in tests and for the demo seed. Replies are canned but level-appropriate and react to keywords.

import { LEVEL_CONFIG, LEVELS, type Level } from "../levels";
import { START_SIGNAL } from "../prompts";
import { buildMockReport } from "../report/mockReport";
import type { ReportContext } from "../report/context";
import { withJsonRetries } from "./json";
import type { ChatParams, JsonParams, LLM } from "./types";

const GREETINGS: Record<Level, string[]> = {
  A1: ["Hallo! Ich bin Lena. Wie heißt du?"],
  A2: ["Hey, ich bin Jonas! Schön, dass du da bist. Wie war dein Tag bis jetzt?"],
  B1: ["Hallo, ich bin Mira, ich arbeite hier in der Logistik. Worüber möchtest du heute sprechen?"],
  B2: ["Guten Tag, Tobias Wendt. Freut mich, Sie kennenzulernen. Womit beschäftigen Sie sich beruflich?"],
};

const TOPIC_REPLIES: Record<Level, { match: RegExp; reply: string }[]> = {
  A1: [
    { match: /arbeit|beruf|job|ingenieur|firma/i, reply: "Oh, super! Arbeitest du gern?" },
    { match: /familie|bruder|schwester|kinder|mutter/i, reply: "Schön! Ist deine Familie groß?" },
    { match: /essen|kochen|pizza|kaffee|tee/i, reply: "Lecker! Was isst du gern zum Frühstück?" },
    { match: /ägypten|kairo|alexandria|komme aus/i, reply: "Toll! Ist es in Kairo warm?" },
    { match: /heiße|name ist|ich bin/i, reply: "Freut mich! Woher kommst du?" },
  ],
  A2: [
    { match: /arbeit|beruf|job|firma|kollegen/i, reply: "Klingt interessant! Was hast du heute bei der Arbeit gemacht?" },
    { match: /wochenende|samstag|sonntag/i, reply: "Cool! Was machst du am Wochenende am liebsten?" },
    { match: /reise|urlaub|fahren|fliegen/i, reply: "Oh, schön! Wohin bist du zuletzt gereist?" },
    { match: /deutsch|lernen|kurs/i, reply: "Super, dass du Deutsch lernst! Warum lernst du Deutsch?" },
  ],
  B1: [
    { match: /arbeit|projekt|kunde|meeting|chef/i, reply: "Das kenne ich gut. Wie gehst du mit stressigen Tagen bei der Arbeit um?" },
    { match: /deutschland|umziehen|leben/i, reply: "Spannend! Was würdest du in Deutschland am meisten vermissen?" },
    { match: /hobby|sport|wandern|lesen/i, reply: "Schön! Wie bist du zu diesem Hobby gekommen?" },
  ],
  B2: [
    { match: /homeoffice|remote|büro/i, reply: "Interessant. Aber leidet nicht die Teamkultur, wenn alle von zu Hause arbeiten? Wie sehen Sie das?" },
    { match: /kunde|verhandlung|preis|angebot/i, reply: "Verstehe. Wie würden Sie reagieren, wenn der Kunde den Preis für überzogen hält?" },
    { match: /arbeit|beruf|projekt|firma/i, reply: "Das klingt nach viel Verantwortung. Was war bisher Ihre größte berufliche Herausforderung?" },
  ],
};

const GENERIC: Record<Level, string[]> = {
  A1: ["Ah, okay! Und was machst du gern?", "Gut! Wo wohnst du?", "Schön! Was trinkst du gern?", "Interessant! Hast du Hobbys?"],
  A2: ["Ach so, verstehe! Und was machst du heute Abend?", "Das finde ich gut. Was kochst du gern?", "Echt? Erzähl mal mehr!"],
  B1: ["Das kann ich gut verstehen. Was denkst du, warum das so ist?", "Interessant! Hast du so etwas schon einmal erlebt?", "Klingt gut. Was würdest du als Nächstes machen?"],
  B2: ["Ein nachvollziehbarer Standpunkt. Welche Argumente sprechen Ihrer Meinung nach dagegen?", "Das überzeugt mich noch nicht ganz. Können Sie ein konkretes Beispiel nennen?"],
};

function levelFromSystem(system: string, fallback?: Level): Level {
  const m = system.match(/LEVEL: (A1|A2|B1|B2)/) ?? system.match(/level (A1|A2|B1|B2)/i);
  const l = m?.[1]?.toUpperCase();
  return (LEVELS as readonly string[]).includes(l ?? "") ? (l as Level) : (fallback ?? "A1");
}

function pick<T>(xs: T[], seed: number): T {
  return xs[Math.abs(seed) % xs.length];
}

export class MockLLM implements LLM {
  provider = "mock" as const;

  async chat(p: ChatParams): Promise<string> {
    const level = p.level ?? levelFromSystem(p.system);
    let text: string;
    if (p.purpose === "summary") {
      text = "Earlier the learner talked about: " + p.messages.map((m) => m.content).join(" / ").slice(0, 400);
    } else if (p.purpose === "simplify") {
      text = pick(LEVEL_CONFIG[level].safeFallbacks, p.messages.length);
    } else {
      const lastUser = [...p.messages].reverse().find((m) => m.role === "user")?.content ?? "";
      const turnNo = p.messages.filter((m) => m.role === "assistant").length;
      if (lastUser === START_SIGNAL) text = pick(GREETINGS[level], 0);
      else {
        const hit = TOPIC_REPLIES[level].find((r) => r.match.test(lastUser));
        text = hit ? hit.reply : pick(GENERIC[level], turnNo + lastUser.length);
      }
    }
    // Simulate streaming so the UI path is the same as with the real model.
    if (p.onText) {
      for (const chunk of text.match(/.{1,12}/gs) ?? []) {
        p.onText(chunk);
        await new Promise((r) => setTimeout(r, 15));
      }
    }
    return text;
  }

  async json<T>(p: JsonParams<T>): Promise<T> {
    return withJsonRetries<T>(async () => {
      if (p.purpose === "check") return { ok: true, violations: [], simplified: null };
      if (p.purpose === "report") return buildMockReport(p.mockContext as ReportContext);
      if (p.purpose === "hint") {
        const ctx = (p.mockContext ?? {}) as { level?: Level; lang?: "ar" | "en"; partnerText?: string };
        const level = ctx.level ?? "A1";
        const ar = ctx.lang !== "en";
        return {
          meaning: ar
            ? `(وضع تجريبي بدون ذكاء اصطناعي) شريكك قال: «${ctx.partnerText ?? ""}» — غالباً بيسألك سؤال عنك.`
            : `(demo mode without AI) Your partner said: "${ctx.partnerText ?? ""}" — probably a question about you.`,
          hint: ar ? "جاوب بجملة قصيرة تبدأ بـ Ich … وبعدين اسأله سؤال بسيط." : "Answer with a short sentence starting with Ich …, then ask a simple question back.",
          rephrase: pick(LEVEL_CONFIG[level].safeFallbacks, 1),
          starter: level === "A1" ? "Ich heiße … und ich komme aus …" : level === "A2" ? "Ich habe heute … gemacht." : "Ich finde, dass …",
        };
      }
      throw new Error(`Mock has no answer for ${p.purpose}`);
    }, p.schema);
  }
}
