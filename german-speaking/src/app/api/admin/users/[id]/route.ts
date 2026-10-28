import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteStudent, updateStudent } from "@/lib/admin";
import { jsonError, readJson } from "@/lib/api";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { getUser } from "@/lib/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const Patch = z.object({ disabled: z.boolean().optional() });

async function target(ctx: Ctx) {
  const admin = await currentUser();
  if (!admin) return { error: unauthorized() };
  if (admin.role !== "admin") return { error: forbidden() };
  const { id } = await ctx.params;
  const user = await getUser(id);
  if (!user?.username) return { error: jsonError(404, "not_found", "No such account") };
  // An admin can't lock themselves out.
  if (user.id === admin.id) return { error: jsonError(400, "self", "You can't do this to your own account") };
  return { user };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const t = await target(ctx);
  if ("error" in t) return t.error;
  const parsed = Patch.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "invalid_body", parsed.error.message);
  await updateStudent(t.user.id, parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const t = await target(ctx);
  if ("error" in t) return t.error;
  await deleteStudent(t.user.id);
  return NextResponse.json({ ok: true });
}
