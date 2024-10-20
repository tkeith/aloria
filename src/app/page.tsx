"use client";

import { Main } from "@/components/main";
import { env } from "@/env";
import { api } from "@/trpc/react";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import {
  DynamicContextProvider,
  DynamicWidget,
  useDynamicContext,
} from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

const NotAuthenticated = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
      <div className="w-96 rounded-lg bg-white p-8 shadow-lg">
        <h2 className="mb-2 text-3xl font-bold">
          <span className="text-blue-500">Aloria</span>
        </h2>
        <p className="mb-6 text-lg font-semibold text-gray-500">
          Connect your wallet to log in.
        </p>
        <div className="">
          <DynamicWidget />
        </div>
      </div>
    </main>
  );
};

const InsideDynamicContext = () => {
  const { authToken } = useDynamicContext();
  const apiUtils = api.useUtils();

  const isAuthedQuery = useQuery({
    queryKey: ["auth", authToken],
    queryFn: async () => {
      if (authToken === undefined) {
        return false;
      }
      const checkAuthRes = await apiUtils.checkAuth.fetch({ authToken });
      const authenticated = checkAuthRes.authenticated;
      return authenticated;
    },
  });

  return (
    <>
      {isAuthedQuery.isPending ? (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
          <div className="w-96 rounded-lg bg-white p-8 text-center shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-blue-500">Loading</h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </main>
      ) : isAuthedQuery.data === undefined ? (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
          <div className="w-96 rounded-lg bg-white p-8 text-center shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-red-500">Error</h2>
            <p className="text-gray-600">Authentication error</p>
          </div>
        </main>
      ) : isAuthedQuery.data ? (
        <>
          <main className="h-screen bg-gradient-to-br from-blue-100 to-purple-100">
            <Main />
          </main>
        </>
      ) : (
        <NotAuthenticated />
      )}
    </>
  );
};

const App = () => {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: env.NEXT_PUBLIC_DYNAMIC_ENV_ID,
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      <InsideDynamicContext />
    </DynamicContextProvider>
  );
};

export default App;
