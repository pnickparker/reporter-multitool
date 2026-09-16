import { NextResponse } from "next/server";
import { getConsentUrl } from "@/lib/google/oauth";

export async function GET() {
  return NextResponse.redirect(getConsentUrl());
}
