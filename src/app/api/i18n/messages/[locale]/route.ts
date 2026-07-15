import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ locale: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { locale } = await params;
  const code = locale.toLowerCase().replace(/[^a-z-]/g, "").slice(0, 8);
  if (!code) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const file = path.join(
    process.cwd(),
    "src",
    "i18n",
    "messages",
    `${code}.json`,
  );

  try {
    const raw = await readFile(file, "utf8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    // Fallback to English — new locales only need a JSON file on disk
    if (code !== "en") {
      try {
        const en = await readFile(
          path.join(process.cwd(), "src", "i18n", "messages", "en.json"),
          "utf8",
        );
        return NextResponse.json(JSON.parse(en));
      } catch {
        /* fall through */
      }
    }
    return NextResponse.json({ error: "Messages not found" }, { status: 404 });
  }
}
