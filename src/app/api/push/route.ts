import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { removeSubscription, saveSubscription, vapidKeys } from "@/lib/push";

export async function GET() {
  return NextResponse.json({ publicKey: vapidKeys().publicKey });
}

/** Subscribe this device to the business' notifications. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.demo) return NextResponse.json({ error: "Inicia sesión con tu cuenta para activar avisos." }, { status: 401 });
  try {
    const sub = await req.json();
    await saveSubscription(session.businessId, session.userId, sub);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { endpoint } = await req.json().catch(() => ({ endpoint: "" }));
  if (typeof endpoint === "string" && endpoint) await removeSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
