export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/access";

export default async function Home() {
  await currentProfile(); // mantiene la validación de sesión
  redirect("/inicio");
}