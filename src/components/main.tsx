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
      <main className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 p-4">
        <div className="container mx-auto">
          <DynamicWidget />

          <div className="mt-8 flex gap-8">
            <RequestList
              onSelectRequest={handleSelectRequest}
              selectedRequestExtid={selectedRequestExtid}
            />
            {selectedRequestExtid ? (
              <RequestDetails selectedRequestExtid={selectedRequestExtid} />
            ) : (
              <NewRequest onSelectRequest={handleSelectRequest} />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
