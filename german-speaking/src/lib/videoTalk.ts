import type { Level } from "./levels";

// "اتكلم عن اللي شفته": a conversation about the DW video the learner just watched.
// Without an API key the partner asks a few simple questions at the level; with a key the AI
// partner gets the video in its system prompt.

export type VideoContext =
  | { kind: "nicos"; level: "A1" | "A2" | "B1" }
  | { kind: "videothema"; id: string; title: string; summary: string }
  /** An Easy German video of a book topic (the session also has the book topic). */
  | { kind: "easygerman"; youtubeId: string; title: string; topic: number };

export function parseVideoContext(json: string | null): VideoContext | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json) as VideoContext;
    return v && (v.kind === "nicos" || v.kind === "videothema" || v.kind === "easygerman") ? v : null;
  } catch {
    return null;
  }
}

const QUESTIONS: Record<Level, string[]> = {
  A1: ["Wer ist Nico?", "Woher kommt Nico?", "Was ist passiert?", "Was macht Nico jetzt?", "Wie findest du Nico?", "Welches Wort hast du heute gelernt?"],
  A2: ["Wer ist Nico?", "Was ist in der Folge passiert?", "Was macht Nico jetzt?", "Was war für Nico schwierig?", "Welche Person findest du interessant? Warum?", "Was hast du Neues gelernt?"],
  B1: [
    "Erzähl mal: Was ist in der Folge passiert?",
    "Wie geht es Nico im Moment?",
    "Was würdest du an Nicos Stelle machen?",
    "Kennst du so eine Situation aus deinem eigenen Leben?",
    "Was glaubst du, wie geht die Geschichte weiter?",
  ],
  B2: [
    "Worum geht es in dem Video?",
    "Was war für Sie neu oder überraschend?",
    "Welche Meinungen kommen im Video vor?",
    "Wie ist die Situation in Ägypten?",
    "Und was ist Ihre eigene Meinung dazu?",
  ],
};

const REACTIONS: Record<Level, string[]> = {
  A1: ["Super, danke!", "Aha, gut!", "Toll!"],
  A2: ["Danke, das ist interessant.", "Aha, verstehe.", "Gut erzählt!"],
  B1: ["Spannend, danke!", "Das verstehe ich gut.", "Gut erzählt!"],
  B2: ["Vielen Dank, das ist ein interessanter Punkt.", "Verstehe, das klingt nachvollziehbar.", "Gut zusammengefasst!"],
};

export const videoQuestions = (level: Level) => QUESTIONS[level];

export function videoGreeting(level: Level, v: VideoContext): string {
  if (v.kind === "easygerman") {
    const q = QUESTIONS[level][0];
    return level === "B2" ? `Guten Tag! Sie haben das Easy-German-Video „${v.title}“ gesehen. Lassen Sie uns darüber sprechen. ${q}` : `Hallo! Du hast das Easy-German-Video „${v.title}“ gesehen. Lass uns darüber sprechen! ${q}`;
  }
  if (v.kind === "videothema") return `Guten Tag! Sie haben das Video „${v.title}“ gesehen. Lassen Sie uns darüber sprechen. ${QUESTIONS[level][0]}`;
  return `Hallo! Du hast „Nicos Weg“ gesehen. Lass uns darüber sprechen! ${QUESTIONS[level][0]}`;
}

export function videoClosing(level: Level): string {
  return level === "B2"
    ? "Vielen Dank, Sie haben sehr gut über das Video gesprochen! (برافو — اتكلمت كويس عن الفيديو!)"
    : "Super, danke! Du hast toll über das Video gesprochen. (برافو — اتكلمت كويس عن الفيديو!)";
}

/** Reply after the learner's answer to question `asked` (0-based); returns the next question index or null at the end. */
export function videoReply(level: Level, asked: number): { text: string; next: number | null } {
  const qs = QUESTIONS[level];
  const react = REACTIONS[level][asked % REACTIONS[level].length];
  const next = asked + 1 < qs.length ? asked + 1 : null;
  return { text: next === null ? `${react} ${videoClosing(level)}` : `${react} ${qs[next]}`, next };
}

/** Video block for the AI partner's system prompt. */
export function videoPromptBlock(v: VideoContext): string {
  if (v.kind === "nicos") {
    return `
# Today: talk about the video the learner watched
The learner just watched DW's free German course drama "Nicos Weg" (level ${v.level}). It tells the story of Nico, who comes to Germany without speaking German and learns it step by step.
You do NOT know which scenes they watched, so never invent plot details: ask them to tell you (who Nico is, what happened, what Nico does now, what was difficult, what they would do), react to what they say, and ask follow-up questions at the level. Keep the conversation about the video and similar everyday situations.`;
  }
  if (v.kind === "easygerman") {
    return `
# Today: talk about the video the learner watched
The learner just watched the Easy German street-interview video "${v.title}" (YouTube) about the book topic above. In these videos, people in German streets answer questions about the topic in natural, everyday German.
You do NOT know what exactly the people said, so never invent details: ask the learner what the people talked about, what they understood, which phrases they noticed, how it is in Egypt and what their own answer to the question would be. Use the book topic's words and stay strictly at the level.`;
  }
  return `
# Today: talk about the video the learner watched
The learner just watched the DW "Video-Thema" report (B2): "${v.title}".
DW's description: ${v.summary.slice(0, 1500)}
Ask what the video was about, what surprised them, which opinions appear, how this is in Egypt, and what their own opinion is. Only rely on the description above for facts; if you don't know something, ask the learner. Keep the conversation about the video's topic.`;
}
