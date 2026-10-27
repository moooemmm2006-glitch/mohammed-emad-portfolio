"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { IconDownload, IconPlay, IconTrash, IconUpload } from "@/components/Icons";
import { MicCheck } from "@/components/MicCheck";
import { useProviders, useSettings } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
import { defaultVoiceAssignment, loadVoices, Speaker, speakOptionsFor } from "@/lib/client/tts";
import { LEVEL_CONFIG, LEVELS, type Level } from "@/lib/levels";
import { SPEEDS, type Settings } from "@/lib/settings";

const SAMPLE: Record<Level, string> = {
  A1: "Hallo! Ich bin Lena. Wie heißt du?",
  A2: "Hey, ich bin Jonas. Was hast du am Wochenende gemacht?",
  B1: "Hallo, ich bin Mira. Wie läuft dein Projekt gerade?",
  B2: "Guten Tag, Tobias Wendt. Wie würden Sie Ihre Position begründen?",
};

export default function SettingsPage() {
  const { t } = useUI();
  const { settings, update } = useSettings();
  const providers = useProviders();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [micTest, setMicTest] = useState(false);
  const speaker = useRef<Speaker | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const useServerTts = !!settings && !!providers && (settings.ttsProvider === "server" || (settings.ttsProvider === "auto" && providers.tts !== "webspeech"));
  const serverRef = useRef(useServerTts);
  serverRef.current = useServerTts;

  useEffect(() => {
    void loadVoices().then(setVoices);
    speaker.current = new Speaker(() => serverRef.current);
    return () => speaker.current?.stop();
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };
  const save = async (patch: Partial<Settings>) => {
    await update(patch);
    flash(t("set_saved"));
  };

  if (!settings || !providers) return <p className="py-20 text-center text-muted">{t("loading")}</p>;
  const defaults = defaultVoiceAssignment(voices);

  const setVoice = (level: Level, patch: Partial<Settings["voices"][Level]>) =>
    save({ voices: { ...settings.voices, [level]: { ...settings.voices[level], ...patch } } });

  const importFile = async (f: File) => {
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: await f.text() });
      if (!res.ok) throw new Error();
      flash(t("set_imported"));
      setTimeout(() => location.reload(), 800);
    } catch {
      flash(t("err_generic"));
    }
  };

  const deleteAll = async () => {
    if (!confirm(t("set_delete_confirm"))) return;
    await fetch("/api/data", { method: "DELETE" });
    flash(t("set_deleted"));
    setTimeout(() => location.reload(), 800);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold">{t("settings_title")}</h1>

      <Card title={t("set_voices")} sub={t("set_voices_sub")}>
        <p className="text-xs text-muted -mt-2">{t("set_speed_sub")}</p>
        <ul className="space-y-4">
          {LEVELS.map((level) => {
            const v = settings.voices[level];
            const cfg = LEVEL_CONFIG[level].voice;
            return (
              <li key={level} className={`level-${level.toLowerCase()} rounded-xl border border-line p-4 space-y-3`}>
                <div className="flex items-center gap-3">
                  <Avatar level={level} size={40} />
                  <b className="de">
                    {level} · {LEVEL_CONFIG[level].persona.name}
                  </b>
                  <button className="btn btn-ghost ms-auto !min-h-[36px] !py-1" onClick={() => speaker.current?.speakNow(SAMPLE[level], speakOptionsFor(level, settings))}>
                    <IconPlay size={16} /> {t("set_preview")}
                  </button>
                </div>
                <select
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2"
                  value={v.voiceURI ?? ""}
                  onChange={(e) => setVoice(level, { voiceURI: e.target.value || null })}
                  aria-label={`${t("set_voices")} ${level}`}
                  dir="ltr"
                >
                  <option value="">
                    {t("set_voice_auto")}
                    {defaults[level] ? ` (${defaults[level]!.name})` : ""}
                  </option>
                  {voices.map((vo) => (
                    <option key={vo.voiceURI} value={vo.voiceURI}>
                      {vo.name} — {vo.lang}
                    </option>
                  ))}
                </select>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{t("set_speed")}</span>
                  <select
                    className="rounded-lg border border-line bg-surface px-3 py-1.5 tabular-nums"
                    value={settings.speeds[level]}
                    onChange={(e) => save({ speeds: { ...settings.speeds, [level]: Number(e.target.value) } })}
                    dir="ltr"
                  >
                    {SPEEDS.map((x) => (
                      <option key={x} value={x}>
                        {x}×
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Slider label={t("set_rate")} value={v.rate ?? cfg.rate} min={0.5} max={1.5} onChange={(x) => setVoice(level, { rate: x })} />
                  <Slider label={t("set_pitch")} value={v.pitch ?? cfg.pitch} min={0.5} max={1.5} onChange={(x) => setVoice(level, { pitch: x })} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title={t("set_providers")}>
        <Select
          label={t("set_tts")}
          value={settings.ttsProvider}
          onChange={(x) => save({ ttsProvider: x as Settings["ttsProvider"] })}
          options={[
            ["auto", t("set_provider_auto")],
            ["webspeech", t("set_provider_webspeech")],
            ["server", t("set_provider_server")],
          ]}
        />
        <Select
          label={t("set_stt")}
          value={settings.sttProvider}
          onChange={(x) => save({ sttProvider: x as Settings["sttProvider"] })}
          options={[
            ["auto", t("set_provider_auto")],
            ["webspeech", t("set_provider_webspeech")],
            ["server", t("set_provider_server")],
          ]}
        />
        <p className="text-sm text-muted">
          {t("set_available")}: <span dir="ltr">LLM: {providers.llm} · TTS: {providers.tts} · STT: {providers.stt}</span>
        </p>
      </Card>

      <Card title={t("set_conversation")}>
        <div>
          <Slider
            label={t("set_silence")}
            value={settings.silenceMs / 1000}
            min={1.5}
            max={6}
            step={0.5}
            format={(x) => `${x.toFixed(1)} ${t("seconds")}`}
            onChange={(x) => save({ silenceMs: Math.round(x * 1000) })}
          />
          <p className="text-xs text-muted mt-1">{t("set_silence_sub")}</p>
        </div>
        <Toggle label={t("set_autoturn")} checked={settings.autoTurn} onChange={(x) => save({ autoTurn: x })} />
        <Toggle label={t("set_bargein")} checked={settings.bargeIn} onChange={(x) => save({ bargeIn: x })} />
        <Toggle label={t("set_showtext")} checked={settings.showPartnerText} onChange={(x) => save({ showPartnerText: x })} />
        <Toggle label={t("set_focus")} checked={settings.focusSteering} onChange={(x) => save({ focusSteering: x })} />
        <Select
          label={t("set_corrections")}
          value={settings.correctionMode}
          onChange={(x) => save({ correctionMode: x as Settings["correctionMode"] })}
          options={[
            ["recast", t("set_corr_recast")],
            ["immediate", t("set_corr_immediate")],
          ]}
        />
        <Select
          label={t("set_checkmode")}
          value={settings.levelCheckMode}
          onChange={(x) => save({ levelCheckMode: x as Settings["levelCheckMode"] })}
          options={[
            ["strict", t("set_check_strict")],
            ["fast", t("set_check_fast")],
          ]}
        />
      </Card>

      <Card title={t("set_report")}>
        <Select
          label={t("set_reportlang")}
          value={settings.reportLang}
          onChange={(x) => save({ reportLang: x as Settings["reportLang"] })}
          options={[
            ["ar", t("lang_ar")],
            ["en", t("lang_en")],
            ["de", t("lang_de")],
          ]}
        />
        <Select
          label={t("set_hintlang")}
          value={settings.hintLang}
          onChange={(x) => save({ hintLang: x as Settings["hintLang"] })}
          options={[
            ["ar", t("lang_ar")],
            ["en", t("lang_en")],
          ]}
        />
      </Card>

      <Card title={t("set_mic")}>
        {micTest ? (
          <MicCheck
            level="A1"
            settings={settings}
            useServerTts={useServerTts}
            onDone={() => {
              setMicTest(false);
              void save({ micTested: true });
            }}
          />
        ) : (
          <button className="btn btn-ghost" onClick={() => setMicTest(true)}>
            {t("set_mic")}
          </button>
        )}
      </Card>

      <Card title={t("set_data")}>
        <div className="flex flex-wrap gap-3">
          <a className="btn btn-ghost" href="/api/data" download>
            <IconDownload size={18} /> {t("set_export")}
          </a>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            <IconUpload size={18} /> {t("set_import")}
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          <button className="btn btn-ghost text-danger !border-danger/50" onClick={deleteAll}>
            <IconTrash size={18} /> {t("set_delete")}
          </button>
        </div>
      </Card>

      {toast && (
        <div role="status" className="fixed bottom-24 md:bottom-8 inset-x-0 mx-auto w-fit rounded-full bg-ink text-bg px-5 py-2 shadow-card z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <span>{label}</span>
      <input type="checkbox" role="switch" className="w-5 h-5 accent-[var(--brand)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      <select className="w-full rounded-lg border border-line bg-surface px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 0.05,
  format = (x: number) => `${x.toFixed(2)}×`,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <label className="block">
      <span className="flex justify-between text-sm font-medium mb-1">
        {label} <span className="tabular-nums text-muted">{format(v)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        className="w-full accent-[var(--brand)]"
        onChange={(e) => setV(Number(e.target.value))}
        onPointerUp={() => onChange(v)}
        onKeyUp={() => onChange(v)}
        onBlur={() => v !== value && onChange(v)}
      />
    </label>
  );
}
