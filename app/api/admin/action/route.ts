import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { publishIncident, rejectIncident, updateOneLiner } from "@/lib/db";
import { isHardRejectedUrl } from "@/lib/reject";
import { readStore } from "@/lib/db";

export const dynamic = "force-dynamic";

function back(request: Request) {
  return NextResponse.redirect(new URL("/admin", request.url), 303);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.redirect(new URL("/admin", request.url), 303);
  }

  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const action = String(form.get("action") ?? "");
  const fields = {
    summary: String(form.get("summary") ?? ""),
    who: String(form.get("who") ?? ""),
    publicDate: String(form.get("publicDate") ?? ""),
    status: String(form.get("status") ?? ""),
  };

  if (!id) return back(request);

  if (action === "reject") {
    await rejectIncident(id);
    return back(request);
  }

  const current = readStore().incidents.find((item) => item.id === id);
  const url = current?.sourceUrl ?? "";
  if (isHardRejectedUrl(url) || isHardRejectedUrl(fields.summary)) {
    await rejectIncident(id);
    return back(request);
  }

  if (action === "publish") {
    await publishIncident(id, fields);
    return back(request);
  }

  if (action === "edit") {
    await updateOneLiner(id, fields);
  }

  return back(request);
}
