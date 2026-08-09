import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await (context as any).params;
    const id = params?.id;
    if (!id) return NextResponse.json([], { status: 200 });

    const certDir = path.join(process.cwd(), "public", "certificates", id);
    if (!fs.existsSync(certDir)) return NextResponse.json([], { status: 200 });

    const files = fs
      .readdirSync(certDir)
      .filter((f) => /\.(png|jpe?g|pdf)$/i.test(f))
      .map((name) => ({ name, url: `/certificates/${id}/${name}` }));

    return NextResponse.json(files, { status: 200 });
  } catch (err) {
    console.error("cert api err", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}