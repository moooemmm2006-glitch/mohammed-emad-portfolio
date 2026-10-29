import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
export async function getGrammarProgress(userId: string, level: string) {
  const db = await getDb();
  const rows = await db.select().from(schema.grammarProgress).where(eq(schema.grammarProgress.userId, userId));
  return rows.filter((row) => row.level === level);
}
