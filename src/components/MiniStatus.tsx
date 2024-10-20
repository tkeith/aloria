import React from "react";
import { Spinner } from "@/components/Spinner";

interface MiniStatusProps {
  status: "Completed" | "Pending";
}

export function MiniStatus({ status }: MiniStatusProps) {
  if (status === "Completed") {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-green-100 text-green-800">
        <svg className="size-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className="flex size-7 items-center justify-center rounded-full bg-blue-100 text-blue-800">
      <Spinner className="size-4" />
    </span>
  );
}
