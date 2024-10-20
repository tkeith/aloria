import { trpcGetUserInfoFromAuthTokenOrThrow } from "@/lib/dynamic-server-side";
import { procedure } from "@/server/api/trpc";
import { z } from "zod";

export const getUserInfo = procedure
  .input(z.object({ authToken: z.string() }))
  .query(async ({ input: { authToken } }) => {
    return await trpcGetUserInfoFromAuthTokenOrThrow({ encodedJwt: authToken });
  });
