import { CsvImport } from "@/components/studio/CsvImport";
import { StudioShell } from "@/components/studio/StudioShell";

export default function ImportPage() {
  return (
    <StudioShell>
      <CsvImport />
    </StudioShell>
  );
}
