"use client";

import dynamic from "next/dynamic";

// Loaded only once the server has confirmed an admin, so learners never download the dashboard code.
const AdminDashboard = dynamic(() => import("./AdminDashboard"), { ssr: false });

export function AdminDashboardLoader() {
  return <AdminDashboard />;
}
