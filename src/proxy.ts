import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
 const secret = process.env.AUTH_SECRET;
 if (!secret || secret.length < 32) return new NextResponse("Authentication is not configured", { status: 503 });
 const secureCookie = new URL(process.env.AUTH_URL || request.url).protocol === "https:";
 const token = await getToken({ req: request, secret, secureCookie });
 if (!token?.sub) return NextResponse.redirect(new URL("/login", request.nextUrl));
 return NextResponse.next();
}
export const config = { matcher: ["/dashboard/:path*"] };
