import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/session";
import { AdminDashboardLoader } from "@/components/admin/AdminDashboardLoader";
import { AdminForbidden } from "@/components/admin/AdminForbidden";

export const dynamic = "force-dynamic";

// The dashboard is checked on the server before any of it is sent: logged-out visitors go to the
// login, learners only get a short message (the dashboard code is loaded lazily, only after
// the server has confirmed an admin). Every /api/admin route checks the role again.
export default async function AdminPage() {
  const gate = await requireAdminPage();
  if ("denied" in gate) {
    if (gate.denied === "login") redirect("/login?next=%2Fadmin");
    return <AdminForbidden />;
  }
  return <AdminDashboardLoader />;
}
