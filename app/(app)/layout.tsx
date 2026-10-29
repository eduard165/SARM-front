export const dynamic = "force-dynamic";
import { currentProfile } from "@/lib/access";
import { AppShell } from "@/components/app-shell";
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await currentProfile();
  return <AppShell actor={actor}>{children}</AppShell>;
}
