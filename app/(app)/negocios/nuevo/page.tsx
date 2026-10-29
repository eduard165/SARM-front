import { requireManagement } from "@/lib/access";
import { BusinessRegistration } from "@/components/business-registration";
export default async function NewBusinessPage() {
  await requireManagement(true);
  return <BusinessRegistration />;
}
