import type { NextApiRequest, NextApiResponse } from "next";

const SESSION_COOKIE = "gar_session";
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

const buildCookie = (value: string, maxAge: number) => {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
};

const readToken = (req: NextApiRequest) => {
  if (typeof req.body === "string") {
    try {
      const parsed = JSON.parse(req.body);
      if (parsed && typeof parsed.token === "string") return parsed.token;
    } catch {
      return "";
    }
  }
  if (req.body && typeof (req.body as { token?: unknown }).token === "string") {
    return (req.body as { token: string }).token;
  }
  return "";
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const rawCookie = req.headers.cookie || "";
    const token = rawCookie
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${SESSION_COOKIE}=`))
      ?.slice(`${SESSION_COOKIE}=`.length);
    res.status(200).json({ token: token ? decodeURIComponent(token) : null });
    return;
  }

  if (req.method === "POST") {
    const token = readToken(req);
    if (!token) {
      res.status(400).json({ error: "Token is required." });
      return;
    }
    res.setHeader("Set-Cookie", buildCookie(token, ONE_WEEK_SECONDS));
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", buildCookie("", 0));
    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  res.status(405).json({ error: "Method not allowed" });
}
