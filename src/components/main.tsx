"use client";

import { useAuthToken } from "@/lib/use-auth-token-hook";
import { api } from "@/trpc/react";

export function Main() {
  const authToken = useAuthToken();

  const checkAuthQuery = api.checkAuth.useQuery({ authToken });

  return (
    <main>
      <div className="flex h-screen items-center justify-center">
        <div className="max-w-sm rounded-lg bg-white p-8 text-center shadow-lg">
          <h2 className="mb-4 text-xl font-bold">Hello world!</h2>
          <p>Your app is running.</p>
          {checkAuthQuery.data ? (
            <p>Authenticated as {checkAuthQuery.data.email}</p>
          ) : (
            <p>Not authenticated</p>
          )}
        </div>
      </div>
    </main>
  );
}
