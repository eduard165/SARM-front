export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/access";
export default async function Home() {
  const actor = await currentProfile();
  redirect(actor.rol === "usuario" ? "/inicio" : "/usuarios");
}
