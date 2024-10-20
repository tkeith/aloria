import { env } from "@/env";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";
import { z } from "zod";

export async function getUserInfoFromAuthToken({
  encodedJwt,
}: {
  encodedJwt: string;
}) {
  // can be found in https://app.dynamic.xyz/dashboard/developer/api
  const jwksUrl = `https://app.dynamic.xyz/api/v0/sdk/${env.DYNAMIC_ENV_ID}/.well-known/jwks`;

  // The clinet should be initalized as
  const client = new JwksClient({
    jwksUri: jwksUrl,
    rateLimit: true,
    cache: true,
    cacheMaxEntries: 5, // Maximum number of cached keys
    cacheMaxAge: 600000, // Cache duration in milliseconds (10 minutes in this case))}
  });

  const signingKey = await client.getSigningKey();
  const publicKey = signingKey.getPublicKey();

  let decodedToken: unknown;
  try {
    decodedToken = jwt.verify(encodedJwt, publicKey, {
      ignoreExpiration: false,
    });
  } catch (error) {
    return {
      authenticated: false as const,
    };
  }

  return {
    authenticated: true as const,
    email: z.object({ email: z.string() }).parse(decodedToken).email,
  };
}

export async function trpcGetUserId({ authToken }: { authToken: string }) {
  const userInfo = await getUserInfoFromAuthToken({ encodedJwt: authToken });

  if (!userInfo.authenticated) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired token",
    });
  }

  let user = await db.user.findUnique({ where: { email: userInfo.email } });
  if (!user) {
    // create new user
    user = await db.user.create({ data: { email: userInfo.email } });
  }

  return user.id;
}
