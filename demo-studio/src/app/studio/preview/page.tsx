import { PreviewFrame } from "@/components/studio/PreviewFrame";

/** Rendered inside the editor's iframes; receives the draft by postMessage. */
export default function PreviewPage() {
  return <PreviewFrame />;
}
