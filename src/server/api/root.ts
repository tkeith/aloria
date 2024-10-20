import { checkAuth } from "@/server/api/procedures/checkAuth";
import { getUserContext } from "@/server/api/procedures/getUserContext";
import { getUserInfo } from "@/server/api/procedures/getUserInfo";
import { setUserContext } from "@/server/api/procedures/setUserContext";
import { createRequest } from "@/server/api/procedures/createRequest";
import {
  createCallerFactory,
  createTRPCRouter,
  procedure,
} from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * Procedures from api/procedures should be added here.
 */
export const appRouter = createTRPCRouter({
  checkAuth,
  getUserInfo,
  getUserContext,
  setUserContext,
  createRequest,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
