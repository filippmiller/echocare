import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";

type NextAuthRouteHandler = (request: NextRequest) => Promise<NextResponse>;

const handler = NextAuth(authOptions) as NextAuthRouteHandler;

export { handler as GET, handler as POST };
