"use client";

import { useState } from "react";
import type { ServerProviders } from "@/lib/client/api";
import { unlockSpeech } from "@/lib/client/tts";
import { useUI } from "@/lib/client/ui";
import type { BookGrammar } from "@/lib/book";
import type { Level } from "@/lib/levels";
import type { Settings } from "@/lib/settings";
import { IconArrow, IconMic, IconPlay } from "../Icons";
import { Shadowing } from "./Shadowing";
import { useVoice } from "./useVoice";

/** The topic's "Grammatik" boxes, each with playable examples and a practice button. */
export function GrammarTab({ level, grammar, settings, providers }: { level: Level; grammar: BookGrammar[]; settings: Settings; providers: ServerProviders }) {
  const { t } = useUI();
  const voice = useVoice(level, settings, providers);
  const [practise, setPractise] = useState<number | null>(null);

  if (practise !== null) {
    const g = grammar[practise];
    return (
      <div className="space-y-4">
        <button className="chip min-h-[40px]" onClick={() => setPractise(null)}>
          <IconArrow size={16} className="rotate-180 rtl:rotate-0" /> {t("gr_back")}
        </button>
        <Shadowing
          level={level}
          settings={settings}
          providers={providers}
          track={false}
          topic={null}
          mode="grammar"
          groups={[{ key: "g", title_de: g.title_de, title_ar: g.title_ar, items: g.examples.map((e, i) => ({ key: `g${practise}-${i}`, de: e.de, ar: e.ar })) }]}
        />
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {grammar.map((g, i) => (
        <li key={i} className="card p-4 sm:p-5 space-y-3">
          <div>
            <h3 className="font-bold text-lg">{g.title_ar}</h3>
            <p dir="ltr" lang="de" className="de text-sm text-muted font-semibold text-start">
              {g.title_de}
            </p>
          </div>
          <p dir="ltr" className="de inline-block rounded-full bg-accent-soft text-accent px-3 py-1.5 text-sm font-semibold break-words max-w-full">
            {g.formula}
          </p>
          <p className="leading-relaxed">{g.explanation_ar}</p>
          <div>
            <p className="text-sm font-semibold text-muted mb-1.5">{t("gr_examples")}</p>
            <ul className="space-y-1.5">
              {g.examples.map((e, j) => (
                <li key={j} className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2">
                  <button
                    className="shrink-0 grid place-items-center w-9 h-9 rounded-full bg-surface border border-line hover:bg-accent-soft"
                    aria-label={`${t("gr_play")}: ${e.de}`}
                    onClick={() => {
                      unlockSpeech();
                      void voice.say(e.de);
                    }}
                  >
                    <IconPlay size={14} />
                  </button>
                  <span className="min-w-0">
                    <span dir="ltr" lang="de" className="block de font-semibold text-start">
                      {e.de}
                    </span>
                    <span className="block text-sm text-muted">{e.ar}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <button className="btn btn-ghost !min-h-[42px]" onClick={() => (voice.stop(), setPractise(i))}>
            <IconMic size={16} /> {t("gr_practice")}
          </button>
        </li>
      ))}
    </ul>
  );
}
