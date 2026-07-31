import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { redirect } from "next/navigation";

export interface SessionData {
  userId?: string;
  usuario?: string;
  nombre?: string;
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error(
    "SESSION_SECRET must be set and at least 32 characters long"
  );
}

export const sessionOptions: SessionOptions = {
  password: sessionSecret,
  cookieName: "journal_trader_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireSession(): Promise<IronSession<SessionData> & { userId: string }> {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }
  return session as IronSession<SessionData> & { userId: string };
}
