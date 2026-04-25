export const dynamic = "force-dynamic";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageTransition } from "@/components/dashboard/PageTransition";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell>
      <PageTransition>{children}</PageTransition>
    </DashboardShell>
  );
}
