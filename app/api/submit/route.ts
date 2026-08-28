import { NextResponse } from "next/server";
import { addPending, findByUrl } from "@/lib/db";
import { fetchPageTitle } from "@/lib/fetch-title";
import { isHardRejectedUrl, normalizeHttpUrl } from "@/lib/reject";

export const dynamic = "force-dynamic";

function redirectHome(request: Request, query: string) {
  return NextResponse.redirect(new URL(`/${query}`, request.url), 303);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const raw = String(form.get("url") ?? "");
  const url = normalizeHttpUrl(raw);

  if (!url) {
    return redirectHome(request, "?err=url");
  }

  if (isHardRejectedUrl(url)) {
    return redirectHome(request, "?submitted=1");
  }

  const existing = findByUrl(url);
  if (existing) {
    return redirectHome(request, "?submitted=1");
  }

  const title = await fetchPageTitle(url);
  if (isHardRejectedUrl(title)) {
    return redirectHome(request, "?submitted=1");
  }

  await addPending({ sourceUrl: url, title });
  return redirectHome(request, "?submitted=1");
}
