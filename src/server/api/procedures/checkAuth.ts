import { procedure } from "@/server/api/trpc";
import { z } from "zod";
import { trpcGetUserInfoFromAuthTokenOrThrow } from "@/lib/dynamic-server-side";

export const checkAuth = procedure
  .input(z.object({ authToken: z.string() }))
  .query(async ({ input: { authToken } }) => {
    return await trpcGetUserInfoFromAuthTokenOrThrow({ encodedJwt: authToken });
  });
