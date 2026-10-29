import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/access";
export const dynamic = "force-dynamic";
export default async function Page() {
  await currentProfile();
  redirect("/inicio");
}
