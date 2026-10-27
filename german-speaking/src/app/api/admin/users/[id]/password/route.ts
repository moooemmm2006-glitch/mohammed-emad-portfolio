import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { currentUser, forbidden, unauthorized } from "@/lib/auth/session";
import { getUser, setPassword, tempPassword } from "@/lib/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sets a new temporary password and shows it once to the admin, who passes it on to the student.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await currentUser();
  if (!admin) return unauthorized();
  if (admin.role !== "admin") return forbidden();
  const { id } = await params;
  const user = await getUser(id);
  if (!user?.username) return jsonError(404, "not_found", "No such account");
  if (user.id === admin.id) return jsonError(400, "self", "Use \"change password\" for your own account");
  const password = tempPassword();
  await setPassword(user.id, password);
  return NextResponse.json({ password });
}
