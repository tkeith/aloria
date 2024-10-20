import React from "react";
import { Spinner } from "@/components/Spinner";

interface StatusProps {
  status: "Completed" | "Pending" | "Canceled";
}

export function Status({ status }: StatusProps) {
  if (status === "Completed") {
    return (
      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
        Completed
      </span>
    );
  }

  if (status === "Canceled") {
    return (
      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
        Canceled
      </span>
    );
  }

  return (
    <span className="flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
      <Spinner className="mr-2 size-4" />
      Running
    </span>
  );
}
