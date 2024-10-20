"use client";

import { useAuthToken } from "@/lib/use-auth-token-hook";
import { api } from "@/trpc/react";
import React from "react";

// Fake data for requests
const fakeRequests = [
  { extid: "1234567890", name: "Get User Profile" },
  { extid: "1234567891", name: "Update Account Settings" },
  { extid: "1234567892", name: "Fetch Product List" },
  { extid: "1234567893", name: "Submit Order" },
  { extid: "1234567894", name: "Generate Report" },
];

interface RequestListProps {
  onSelectRequest: (extid: string | null) => void;
}

export function RequestList({ onSelectRequest }: RequestListProps) {
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
          className="cursor-pointer rounded-lg bg-white p-4 text-black shadow"
          onClick={() => onSelectRequest(null)}
        >
          <h3 className="text-lg font-semibold">New Request</h3>
          <p className="text-sm">Create a new request</p>
        </div>
        {requestsQuery.data.requests.map((request) => (
          <div
            key={request.extid}
            className="cursor-pointer rounded-lg bg-white p-4 shadow"
            onClick={() => onSelectRequest(request.extid)}
          >
            <h3 className="text-lg font-semibold">{request.name}</h3>
            <p className="text-sm text-gray-600">ID: {request.extid}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
