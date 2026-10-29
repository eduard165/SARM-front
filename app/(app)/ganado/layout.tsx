import { requireLivestock } from "@/lib/access";
import { LivestockProvider } from "@/components/livestock/shared";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireLivestock();
  return <LivestockProvider actor={actor}>{children}</LivestockProvider>;
}
