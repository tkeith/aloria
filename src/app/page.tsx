"use client";

import { Main } from "@/components/main";
import { env } from "@/env";
import { api } from "@/trpc/react";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import {
  DynamicContextProvider,
  DynamicWidget,
  mergeNetworks,
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
        <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100">
          <Main />
        </div>
      ) : (
        <NotAuthenticated />
      )}
    </>
  );
};

const myEvmNetworks = [
  {
    chainId: 296,
    networkId: 296,
    chainName: "Hedera Testnet",
    name: "Hedera Testnet",
    rpcUrls: ["https://testnet.hashio.io/api"],
    iconUrls: [],
    nativeCurrency: {
      name: "Hedera",
      symbol: "HBAR",
      decimals: 18,
    },
    blockExplorerUrls: [],
  },
  {
    chainId: 22040,
    networkId: 22040,
    chainName: "Airdao Testnet",
    name: "Airdao Testnet",
    rpcUrls: ["https://network.ambrosus-test.io"],
    iconUrls: [],
    nativeCurrency: {
      name: "Airdao",
      symbol: "AIR",
      decimals: 18,
    },
    blockExplorerUrls: [],
  },
  {
    chainId: 545,
    networkId: 545,
    chainName: "Flow Testnet",
    name: "Flow Testnet",
    rpcUrls: ["https://testnet.evm.nodes.onflow.org"],
    iconUrls: [],
    nativeCurrency: {
      name: "Flow",
      symbol: "FLOW",
      decimals: 18,
    },
    blockExplorerUrls: [],
  },
  {
    chainId: 31,
    networkId: 31,
    chainName: "Rootstock Testnet",
    name: "Rootstock Testnet",
    rpcUrls: ["https://public-node.testnet.rsk.co"],
    iconUrls: [],
    nativeCurrency: {
      name: "Rootstock",
      symbol: "RBTC",
      decimals: 18,
    },
    blockExplorerUrls: [],
  },
  {
    chainId: 974399131,
    networkId: 974399131,
    chainName: "SKALE Network",
    name: "SKALE Network",
    rpcUrls: ["https://testnet.skalenodes.com/v1/giant-half-dual-testnet"],
    iconUrls: [],
    nativeCurrency: {
      name: "SKALE",
      symbol: "SKL",
      decimals: 18,
    },
    blockExplorerUrls: [],
  },
];

const App = () => {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: env.NEXT_PUBLIC_DYNAMIC_ENV_ID,
        walletConnectors: [EthereumWalletConnectors],
        overrides: {
          evmNetworks: (networks) => mergeNetworks(myEvmNetworks, networks),
        },
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100">
        <InsideDynamicContext />
      </div>
    </DynamicContextProvider>
  );
};

export default App;
