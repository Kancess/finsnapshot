import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    version: "1.0",
    name: "FinSnapshot",
    description: "Personal finance dashboard — query your complete financial picture via WebMCP. Tools are registered imperatively via document.modelContext.",
  }, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
