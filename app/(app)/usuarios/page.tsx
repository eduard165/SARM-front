import { requireManagement } from "@/lib/access";
import { UsersTable } from "@/components/users-table";
export default async function UsersPage() {
  const actor = await requireManagement();
  return <UsersTable actor={actor} />;
}
