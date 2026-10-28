"use client";

import { levelPath } from "@/lib/paths";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Conversation, type UITurn } from "@/components/Conversation";
import { MicCheck } from "@/components/MicCheck";
import { api, useProviders, useSettings } from "@/lib/client/api";
import { unlockSpeech } from "@/lib/client/tts";
import { useUI } from "@/lib/client/ui";
import { isLevel } from "@/lib/levels";

interface SessionPayload {
  session: { id: string; level: string; focusTag: string | null; status: string; bookTopic: number | null };
  turns: { id: number; role: "user" | "partner"; text: string; confidence: number | null }[];
}

type BookTopicInfo = { number: number; title_de: string; title_ar: string };

export default function ChatPageWrapper() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  );
}

// The full-screen conversation. Sessions are created on the level page or the topic page;
// ?new=1 means it was just created (show the mic check first if it was never done).
function ChatPage() {
  const { t } = useUI();
  const params = useParams<{ level: string }>();
  const search = useSearchParams();
  const sessionId = search.get("session");
  const isNew = search.get("new") === "1";
  const level = params.level?.toUpperCase();
  const { settings, update } = useSettings();
  const providers = useProviders();

  const [session, setSession] = useState<{ id: string; focus: string | null; turns: UITurn[]; book: BookTopicInfo | null } | null>(null);
  const [micDone, setMicDone] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      const d = await api<SessionPayload>(`/api/sessions/${sessionId}`);
      let book: BookTopicInfo | null = null;
      if (d.session.bookTopic) {
        const tp = await api<{ topic: BookTopicInfo }>(`/api/book/topic/${d.session.bookTopic}`).catch(() => null);
        book = tp ? { number: tp.topic.number, title_de: tp.topic.title_de, title_ar: tp.topic.title_ar } : null;
      }
      setSession({
        id: d.session.id,
        focus: d.session.focusTag,
        turns: d.turns.map((x) => ({ key: `db${x.id}`, role: x.role, text: x.text, confidence: x.confidence })),
        book,
      });
    })().catch(() => setError(true));
  }, [sessionId]);

  if (!isLevel(level) || !sessionId || error) {
    return (
      <div className="py-20 text-center space-y-4 px-4">
        {error && <p className="text-danger">{t("err_api")}</p>}
        <Link href={isLevel(level) ? levelPath(level) : "/"} className="btn btn-primary">
          {t("back")}
        </Link>
      </div>
    );
  }
  if (!settings || !providers || !session) return <p className="px-4 py-20 text-center text-muted">{t("loading")}</p>;

  if (isNew && !settings.micTested && !micDone) {
    return (
      <div className="px-4 py-6">
        <MicCheck
          level={level}
          settings={settings}
          useServerTts={settings.ttsProvider === "server" || (settings.ttsProvider === "auto" && providers.tts !== "webspeech")}
          onDone={() => {
            unlockSpeech();
            void update({ micTested: true });
            setMicDone(true);
          }}
        />
      </div>
    );
  }

  return (
    <Conversation
      level={level}
      sessionId={session.id}
      initialTurns={session.turns}
      greet={session.turns.length === 0}
      resumed={session.turns.length > 0}
      focusTag={session.focus}
      settings={settings}
      updateSettings={update}
      providers={providers}
      bookTopic={session.book}
    />
  );
}
