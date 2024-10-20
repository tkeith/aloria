"use client";

import { MiniStatus } from "@/components/MiniStatus";
import { Status } from "@/components/Status";
import { useAuthToken } from "@/lib/use-auth-token-hook";
import { api } from "@/trpc/react";
import React from "react";

interface RequestListProps {
  onSelectRequest: (extid: string | null) => void;
  selectedRequestExtid: string | null;
}

export function RequestList({
  onSelectRequest,
  selectedRequestExtid,
}: RequestListProps) {
  const authToken = useAuthToken();

  const requestsQuery = api.getRequests.useQuery(
    { authToken },
    {
      refetchInterval: 1000,
    },
  );

  if (requestsQuery.data === undefined) {
    return <div className="w-1/3">Loading...</div>;
  }

  return (
    <div className="w-1/3">
      <div className="space-y-4">
        <div
          className={`cursor-pointer rounded-lg p-4 text-black shadow transition-colors ${
            selectedRequestExtid === null
              ? "bg-white ring-2 ring-blue-500"
              : "bg-white hover:bg-gray-100"
          }`}
          onClick={() => onSelectRequest(null)}
        >
          <h3 className="text-lg font-semibold">New Request</h3>
          <p className="text-sm">Create a new request</p>
        </div>
        {requestsQuery.data.requests.map((request) => (
          <div
            key={request.extid}
            className={`cursor-pointer rounded-lg p-4 shadow transition-colors ${
              selectedRequestExtid === request.extid
                ? "bg-white ring-2 ring-blue-500"
                : "bg-white hover:bg-gray-100"
            }`}
            onClick={() => onSelectRequest(request.extid)}
          >
            <div className="flex items-center space-x-4">
              <Status status={request.status} />
              <div className="flex-grow">
                <h3 className="text-lg font-semibold">{request.name}</h3>
                <p className="text-sm text-gray-600">ID: {request.extid}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
