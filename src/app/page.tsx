"use client";

import { Main } from "@/components/main";
import { env } from "@/env";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import {
  DynamicContextProvider,
  DynamicWidget,
} from "@dynamic-labs/sdk-react-core";

const App = () => {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: env.NEXT_PUBLIC_DYNAMIC_ENV_ID,
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      <DynamicWidget />
      <Main />
    </DynamicContextProvider>
  );
};

export default App;
