import { procedure } from "@/server/api/trpc";
import { z } from "zod";
import { getUserInfoFromAuthToken } from "@/lib/dynamic-server-side";

export const checkAuth = procedure
  .input(z.object({ authToken: z.string() }))
  .query(async ({ input: { authToken } }) => {
    const userInfo = await getUserInfoFromAuthToken({ encodedJwt: authToken });
    return {
      authenticated: userInfo.authenticated,
    };
  });
