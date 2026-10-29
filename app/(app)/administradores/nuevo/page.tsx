import { requireManagement } from "@/lib/access";
import { AccountRegistration } from "@/components/account-registration";
export default async function NewAdminPage() {
  const actor = await requireManagement(true);
  return <AccountRegistration actor={actor} role="administrador" />;
}
