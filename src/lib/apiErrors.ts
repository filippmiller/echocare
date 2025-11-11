import { NextResponse } from "next/server";

/**
 * Standard API error helpers
 * Use these for consistent HTTP status codes across all API routes
 */

export function badRequest(message: string, issues?: unknown) {
  return NextResponse.json(
    {
      error: message,
      ...(issues ? { issues } : {}),
    },
    { status: 400 }
  );
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function payloadTooLarge(message = "Payload too large") {
  return NextResponse.json({ error: message }, { status: 413 });
}

export function unsupportedMediaType(message = "Unsupported media type") {
  return NextResponse.json({ error: message }, { status: 415 });
}

export function internalServerError(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

