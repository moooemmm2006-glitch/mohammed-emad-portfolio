import { describe, expect, it } from "vitest";
import a1 from "../data/book/a1.json";
import b2 from "../data/book/b2.json";
import { topicGrammarMap } from "../src/lib/topicGrammarMap";

// Every topic's grammar tab is drawn as a mind map: one branch per grammar point.
describe("topic grammar map", () => {
  it("turns each grammar point into a branch with its rule and playable examples", () => {
    for (const topic of [...a1.topics, ...b2.topics]) {
      const map = topicGrammarMap(topic.grammar, topic.title_ar);
      expect(map.branches).toHaveLength(topic.grammar.length);
      map.branches.forEach((b, i) => {
        const g = topic.grammar[i];
        expect(b.title).toBe(g.title_de);
        expect(b.cards[0]).toMatchObject({ ar: g.explanation_ar, wide: true });
        expect(b.cards.slice(1).map((c) => c.say)).toEqual(g.examples.map((e) => e.de));
      });
    }
  });
});
