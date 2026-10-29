import { cookies } from "next/headers";
import { checkOrigin, errorResponse, SESSION_COOKIE } from "@/lib/backend";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    (await cookies()).delete(SESSION_COOKIE);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
