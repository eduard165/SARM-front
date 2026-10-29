import { notFound } from "next/navigation";
import { AnimalDetail } from "@/components/livestock/animal-detail";
import { uuidPattern } from "@/lib/proxy-policy";
export default async function Page({
  params,
}: {
  params: Promise<{ animalId: string }>;
}) {
  const { animalId } = await params;
  if (!uuidPattern.test(animalId)) notFound();
  return <AnimalDetail key={animalId} id={animalId} />;
}
