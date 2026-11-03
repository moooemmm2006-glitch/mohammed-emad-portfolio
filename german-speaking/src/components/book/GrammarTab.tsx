"use client";

import { useMemo, useState } from "react";
import type { ServerProviders } from "@/lib/client/api";
import { unlockSpeech } from "@/lib/client/tts";
import { useUI } from "@/lib/client/ui";
import type { BookGrammar } from "@/lib/book";
import type { Level } from "@/lib/levels";
import type { Settings } from "@/lib/settings";
import { topicGrammarMap } from "@/lib/topicGrammarMap";
import { MindMap } from "../grammar/MindMap";
import { IconArrow, IconMic } from "../Icons";
import { Shadowing } from "./Shadowing";
import { useVoice } from "./useVoice";

/** The topic's grammar as one mind map (▶ on every example), then a speaking-practice button per point. */
export function GrammarTab({
  level,
  grammar,
  topicNo,
  topicAr,
  topicDe,
  settings,
  providers,
}: {
  level: Level;
  grammar: BookGrammar[];
  topicNo: number;
  topicAr: string;
  topicDe: string;
  settings: Settings;
  providers: ServerProviders;
}) {
  const { t } = useUI();
  const voice = useVoice(level, settings, providers);
  const [practise, setPractise] = useState<number | null>(null);
  const map = useMemo(
    () => topicGrammarMap(grammar, topicAr),
    [grammar, topicAr],
  );

  if (practise !== null) {
    const g = grammar[practise];
    return (
      <div className="space-y-4">
        <button className="chip min-h-[40px]" onClick={() => setPractise(null)}>
          <IconArrow size={16} className="rotate-180 rtl:rotate-0" />{" "}
          {t("gr_back")}
        </button>
        <Shadowing
          level={level}
          settings={settings}
          providers={providers}
          track={false}
          topic={null}
          mode="grammar"
          groups={[
            {
              key: "g",
              title_de: g.title_de,
              title_ar: g.title_ar,
              items: g.examples.map((e, i) => ({
                key: `g${practise}-${i}`,
                de: e.de,
                ar: e.ar,
              })),
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <MindMap
        map={map}
        titleDe="Grammatik"
        titleAr={`${t("gr_topic_rules")} · ${topicDe}`}
        eyebrow={`${level} · Thema ${topicNo}`}
        onSay={(de) => {
          unlockSpeech();
          void voice.say(de);
        }}
      />
      <section className="card p-4 sm:p-5">
        <h3 className="font-bold">{t("gr_practice")}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {grammar.map((g, i) => (
            <button
              key={i}
              className="btn btn-ghost !min-h-[42px]"
              onClick={() => (voice.stop(), setPractise(i))}
            >
              <IconMic size={16} /> {g.title_ar}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
