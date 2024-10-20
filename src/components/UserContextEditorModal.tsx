"use client";

import React, { useState, useEffect } from "react";
import { useAuthToken } from "@/lib/use-auth-token-hook";
import { api } from "@/trpc/react";

interface UserContextEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserContextEditorModal({
  isOpen,
  onClose,
}: UserContextEditorModalProps) {
  const [context, setContext] = useState("");
  const authToken = useAuthToken();

  const getUserContextQuery = api.getUserContext.useQuery({ authToken });
  const setUserContextMutation = api.setUserContext.useMutation();

  useEffect(() => {
    if (isOpen && getUserContextQuery.data) {
      setContext(getUserContextQuery.data.userContext);
    }
  }, [isOpen, getUserContextQuery.data]);

  const handleSave = () => {
    setUserContextMutation.mutate(
      { authToken, userContext: context },
      {
        onSuccess: () => {
          onClose();
          void getUserContextQuery.refetch();
        },
      },
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-2/3 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Edit User Context</h2>
        <textarea
          className="mb-4 w-full rounded-md border p-2"
          rows={10}
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <div className="flex justify-end space-x-4">
          <button
            className="rounded bg-gray-300 px-4 py-2 font-bold text-gray-800 hover:bg-gray-400"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
            onClick={handleSave}
            disabled={setUserContextMutation.isPending}
          >
            {setUserContextMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
