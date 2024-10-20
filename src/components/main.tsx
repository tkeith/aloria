"use client";

import React, { useState } from "react";
import { useAuthToken } from "@/lib/use-auth-token-hook";
import { api } from "@/trpc/react";
import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { RequestList } from "./RequestList";
import { RequestDetails } from "./RequestDetails";
import { NewRequest } from "./NewRequest";

export function Main() {
  const [selectedRequestExtid, setSelectedRequestExtid] = useState<
    string | null
  >(null);
  const handleSelectRequest = (extid: string | null) => {
    setSelectedRequestExtid(extid);
  };

  return (
    <>
      <main className="container mx-auto p-4">
        <DynamicWidget />

        <div className="mt-8 flex gap-8">
          <RequestList onSelectRequest={handleSelectRequest} />
          {selectedRequestExtid ? (
            <RequestDetails selectedRequestExtid={selectedRequestExtid} />
          ) : (
            <NewRequest onSelectRequest={handleSelectRequest} />
          )}
        </div>
      </main>
    </>
  );
}
