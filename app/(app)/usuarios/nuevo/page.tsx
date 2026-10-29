import { requireManagement } from "@/lib/access";
import { AccountRegistration } from "@/components/account-registration";
export default async function NewUserPage() {
  const actor = await requireManagement();
  return <AccountRegistration actor={actor} role="usuario" />;
}
