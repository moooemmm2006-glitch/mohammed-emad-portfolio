// Adds a few FAKE past sessions (no personal data) so the dashboard and the
// "since last time" comparison can be demoed. Uses the offline mock reporter,
// so it needs no API key. Run: npm run seed:demo [username]
// The data goes to the given account; with no accounts yet it waits for the first sign-up.
import { addTurn, createSession, LOCAL_USER, updateSession } from "../src/lib/db/repo";
import { findByUsername } from "../src/lib/auth/users";
import type { Level } from "../src/lib/levels";
import { MockLLM } from "../src/lib/llm/mock";
import { generateReport } from "../src/lib/report/generate";

const DAY = 86_400_000;

const DEMO: { daysAgo: number; level: Level; topic: string | null; minutes: number; lines: [string, number][] }[] = [
  {
    daysAgo: 9,
    level: "A1",
    topic: "Sich vorstellen",
    minutes: 6,
    lines: [
      ["Hallo, ich heiße Sami. Ich komme aus Kairo.", 0.92],
      ["Ich arbeite als Ingenieur. Ich kann sprechen Deutsch ein bisschen.", 0.81],
      ["Ich möchte arbeiten in Deutschland.", 0.66],
      ["Ich habe zwei Schwestern und ich ist verheiratet.", 0.88],
    ],
  },
  {
    daysAgo: 7,
    level: "A2",
    topic: "Das Wochenende",
    minutes: 9,
    lines: [
      ["Am Wochenende ich habe nach Alexandria gefahren.", 0.79],
      ["Ich kann gut schwimmen und wir haben Fisch gegessen.", 0.9],
      ["Ich anrufe meine Mutter jeden Tag.", 0.71],
      ["Ich aufstehe um sieben Uhr, weil ich muss arbeiten.", 0.84],
      ["Was hast du am Wochenende gemacht?", 0.93],
    ],
  },
  {
    daysAgo: 5,
    level: "A2",
    topic: "Einem Kunden helfen",
    minutes: 11,
    lines: [
      ["Guten Tag, wie kann ich Ihnen helfen?", 0.95],
      ["Ich rufe Sie morgen an, okay?", 0.9],
      ["Sie können mit die Bahn kommen.", 0.74],
      ["Ich einkaufe die Teile am Montag.", 0.69],
      ["Haben Sie noch eine Frage?", 0.92],
    ],
  },
  {
    daysAgo: 2,
    level: "A2",
    topic: "Ein Telefonat: Termin vereinbaren",
    minutes: 12,
    lines: [
      ["Ich möchte einen Termin vereinbaren.", 0.94],
      ["Ich stehe früh auf, deshalb passt Montag um acht.", 0.88],
      ["Ich komme mit dem Auto.", 0.91],
      ["Ich rufe Sie an, wenn ich ein Problem habe.", 0.9],
      ["Vielen Dank! Bis Montag.", 0.96],
    ],
  },
  {
    daysAgo: 1,
    level: "B1",
    topic: "Small Talk in der Kaffeeküche",
    minutes: 10,
    lines: [
      ["Ich finde, dass Homeoffice praktisch ist, weil ich spare Zeit.", 0.83],
      ["Gestern ich habe ein Meeting mit einem Kunden gehabt.", 0.78],
      ["Wenn ich mehr Zeit hätte, würde ich einen Deutschkurs machen.", 0.89],
      ["Wie ist es bei dir? Arbeitest du lieber im Büro?", 0.93],
    ],
  },
];

async function main() {
  const llm = new MockLLM();
  const username = process.argv[2];
  const owner = username ? await findByUsername(username) : undefined;
  if (username && !owner) throw new Error(`No account named "${username}"`);
  const userId = owner?.id ?? LOCAL_USER;
  for (const d of DEMO) {
    const start = Date.now() - d.daysAgo * DAY + 18 * 3_600_000 - (Date.now() % DAY);
    const s = await createSession(d.level, d.topic, null, userId);
    await updateSession(s.id, { startedAt: start, lastActiveAt: start });
    let at = start;
    const step = (d.minutes * 60_000) / (d.lines.length * 2 + 1);
    const partner = await llm.chat({ model: "mock", system: `LEVEL: ${d.level}`, messages: [{ role: "user", content: "[START]" }], maxTokens: 100, purpose: "partner", level: d.level });
    await addTurn(s.id, "partner", partner, { at, meta: { greeting: true } });
    for (const [line, conf] of d.lines) {
      at += step;
      await addTurn(s.id, "user", line, { at, confidence: conf, meta: { input: "voice" } });
      at += step;
      const reply = await llm.chat({ model: "mock", system: `LEVEL: ${d.level}`, messages: [{ role: "user", content: line }], maxTokens: 100, purpose: "partner", level: d.level });
      await addTurn(s.id, "partner", reply, { at });
    }
    await updateSession(s.id, { status: "ended", endedAt: start + d.minutes * 60_000, lastActiveAt: start + d.minutes * 60_000 });
    const r = await generateReport(s.id, { llm });
    console.log(`✓ ${d.level} ${new Date(start).toISOString().slice(0, 10)} — overall ${r.overall}, mistakes: ${r.mistakes.map((m) => m.tag).join(", ") || "none"}`);
  }
  console.log("Demo data added. Start the app with: npm run dev");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
