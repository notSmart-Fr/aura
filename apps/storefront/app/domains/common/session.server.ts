import { createCookieSessionStorage } from "@remix-run/node";

const sessionSecret = process.env.SESSION_SECRET || "AURA_LUXURY_SECRET_TOKEN";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__aura_session",
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    httpOnly: true,
  },
});

export async function getSessionToken(request: Request): Promise<string | null> {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return session.get("authToken") || null;
}

export async function createSession(request: Request, token: string): Promise<Headers> {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  session.set("authToken", token);
  const headers = new Headers();
  headers.append("Set-Cookie", await sessionStorage.commitSession(session));
  return headers;
}

export async function destroySession(request: Request): Promise<Headers> {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const headers = new Headers();
  headers.append("Set-Cookie", await sessionStorage.destroySession(session));
  return headers;
}
