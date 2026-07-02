import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
} from "@workspace/api-zod";
import { UserModel } from "@workspace/db";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  getSession,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router: IRouter = Router();

function getOrigin(req: Request): string {
  if (process.env.NODE_ENV !== "production") {
    const port = process.env.PORT ?? "5000";
    return `http://localhost:${port}`;
  }

  const proto =
    req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function isSecureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

async function upsertUser(claims: Record<string, unknown>) {
  const userData: Record<string, unknown> = {
    id: claims.sub as string,
    firstName: (claims.first_name as string) || undefined,
    lastName: (claims.last_name as string) || undefined,
    phone: (claims.phone_number as string) || "0000000000",
    updatedAt: new Date(),
  };

  // Only include email if it exists in claims
  if (claims.email) {
    userData.email = claims.email as string;
  }

  // Only set profileImageUrl from OIDC on user creation, not on every login,
  // so that users can remove/change their profile picture without it being overwritten
  const oidcProfileImageUrl = (claims.profile_image_url || claims.picture) as string | undefined;

  const user = await UserModel.findOneAndUpdate(
    { id: userData.id },
    {
      $set: userData,
      ...(oidcProfileImageUrl ? { $setOnInsert: { profileImageUrl: oidcProfileImageUrl } } : {}),
    },
    { upsert: true, new: true }
  );
  return user;
}

router.get("/auth/user", async (req: Request, res: Response) => {
  // First check if user is authenticated via OIDC
  if (req.isAuthenticated() && req.user) {
    res.json(
      GetCurrentAuthUserResponse.parse({
        user: req.user,
      }),
    );
    return;
  }

  // Fallback to form-based authentication
  const sid = getSessionId(req);
  if (!sid) {
    res.json(
      GetCurrentAuthUserResponse.parse({
        user: null,
      }),
    );
    return;
  }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    res.json(
      GetCurrentAuthUserResponse.parse({
        user: null,
      }),
    );
    return;
  }

  res.json(
    GetCurrentAuthUserResponse.parse({
      user: session.user,
    }),
  );
});

router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

// Query params are not validated because the OIDC provider may include
// parameters not expressed in the schema.
router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const dbUser = await upsertUser(
    claims as unknown as Record<string, unknown>,
  );

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email ?? null,
      firstName: dbUser.firstName ?? null,
      lastName: dbUser.lastName ?? null,
      profileImageUrl: dbUser.profileImageUrl ?? null,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);

  // If using OIDC, do the full logout flow
  if (process.env.REPL_ID) {
    try {
      const config = await getOidcConfig();
      const origin = getOrigin(req);

      const endSessionUrl = oidc.buildEndSessionUrl(config, {
        client_id: process.env.REPL_ID!,
        post_logout_redirect_uri: origin,
      });

      res.redirect(endSessionUrl.href);
      return;
    } catch {
      // Fallback to simple redirect if OIDC fails
    }
  }

  // Simple redirect for form-based auth
  res.redirect("/");
});


export default router;



// I want you to know its was soo hard to build thomas shohdy :)