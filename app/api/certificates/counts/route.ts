import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const body = await req.json(); // expect { ids: string[] }
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];

    const result: Record<string, number> = {};
    for (const id of ids) {
      const certDir = path.join(process.cwd(), "public", "certificates", id);
      if (!fs.existsSync(certDir)) {
        result[id] = 0;
        continue;
      }
      const files = fs.readdirSync(certDir).filter((f) => /\.(png|jpe?g|pdf)$/i.test(f));
      result[id] = files.length;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("cert counts err", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}