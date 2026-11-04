import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  const base = process.env.CLIENT_URL;
  if (!base) throw new Error("CLIENT_URL is not set");
  if (!jwks) {
    // Better Auth publishes its public keys here
    jwks = createRemoteJWKSet(new URL("/api/auth/jwks", base));
  }
  return jwks;
}

export async function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const base = process.env.CLIENT_URL!;
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: base,
      audience: base,
    });

    if (typeof payload.email !== "string") {
      res.status(401).json({ message: "Token has no email claim" });
      return;
    }

    req.user = {
      id: String(payload.id ?? payload.sub ?? ""),
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
    next();
  } catch (err) {
    // Keep this log while developing: it says exactly why a token was rejected
    console.error("JWT verification failed:", err instanceof Error ? err.message : err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
}