// The level's rules (allowed/forbidden grammar, vocabulary, sentence length) for AI prompts:
// the reading texts and the free-writing corrections.

import { LEVEL_CONFIG, type Level } from "./levels";

const list = (items: string[]) => items.map((i) => `- ${i}`).join("\n");

export function levelRulesBlock(level: Level): string {
  const cfg = LEVEL_CONFIG[level];
  return `## Allowed grammar at ${level}
${list(cfg.allowedGrammar)}

## Forbidden grammar at ${level} (never use, not even once)
${list(cfg.forbiddenGrammar)}

## Vocabulary
${cfg.vocabulary}

## Sentence length
- Max ${cfg.limits.maxWordsPerSentence} words per sentence, always.
- Normally max ${cfg.limits.maxSentences} sentences in a row on one point.
- Longer texts (a story, a dialogue, an explanation): up to ${cfg.limits.maxSentencesLong} short sentences.

## Sentences that are fine at ${level}
${list(cfg.allowedExamples.map((e) => `"${e}"`))}

## Sentences that are NOT allowed at ${level}
${list(cfg.forbiddenExamples.map((e) => `"${e.sentence}" — ${e.why}`))}`;
}
