import { currentProfile } from "@/lib/access";
import { SummaryWorkspace } from "@/components/dashboard/summary-workspace";
export default async function Page() {
  return <SummaryWorkspace actor={await currentProfile()} />;
}
