"use client";

import { useAuthToken } from "@/lib/use-auth-token-hook";
import { api } from "@/trpc/react";
import { DynamicWidget } from "@dynamic-labs/sdk-react-core";

export function Main() {
  const authToken = useAuthToken();

  const getUserInfoQuery = api.getUserInfo.useQuery({ authToken });

  return (
    <>
      <main>
        <DynamicWidget />
        <div className="flex items-center justify-center">
          <div className="max-w-sm rounded-lg bg-white p-8 text-center shadow-lg">
            <h2 className="mb-4 text-xl font-bold">Hello world!</h2>
            <p>Your app is running.</p>
            {getUserInfoQuery.data ? (
              <p>Authenticated as {getUserInfoQuery.data.email}</p>
            ) : (
              <p>Not authenticated</p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

// UI todos:
// - create new task
// - update my user context
// - see list of tasks
// - for a task, see the historical steps of it: screenshot before, screenshot after, and some text data
