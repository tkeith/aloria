"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuthToken } from "@/lib/use-auth-token-hook";
import { api } from "@/trpc/react";
import { UserContextEditorModal } from "./UserContextEditorModal";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { ABI } from "@/lib/abi";
import { ADDRESSES } from "@/lib/addresses";

interface NewRequestProps {
  onSelectRequest: (extid: string | null) => void;
}

export function NewRequest({ onSelectRequest }: NewRequestProps) {
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ taskDescription: string }>();
  const authToken = useAuthToken();
  const { primaryWallet, network } = useDynamicContext();

  // log network on change
  useEffect(() => {
    console.log("network", network);
  }, [network]);

  let address;
  // if network is number throw
  if (typeof network === "number") {
    address = ADDRESSES.find((a) => a.chainId === network)?.address;
  } else {
    address = ADDRESSES.find((a) => a.name === network)?.address;
  }

  if (!address) {
    throw new Error(`No address for network ${network}`);
  }

  const createRequestMutation = api.createRequest.useMutation({
    onSuccess: (data) => {
      onSelectRequest(data.extid);
    },
  });

  const onSubmit = async (data: { taskDescription: string }) => {
    if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
      return;
    }

    const walletClient = await primaryWallet.getWalletClient();

    await walletClient.writeContract({
      abi: ABI,
      address: address,
      functionName: "startRequest",
      args: [data.taskDescription],
      value: BigInt(1),
    });

    createRequestMutation.mutate({
      authToken,
      taskDescription: data.taskDescription,
    });
  };

  return (
    <div className="w-2/3">
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Create New Request</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label
              htmlFor="taskDescription"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Task Description
            </label>
            <textarea
              id="taskDescription"
              {...register("taskDescription", {
                required: "Task description is required",
              })}
              className="w-full rounded-md border p-2"
              rows={4}
            />
            {errors.taskDescription && (
              <p className="mt-1 text-sm text-red-600">
                {errors.taskDescription.message}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="submit"
              className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
              disabled={createRequestMutation.isPending}
            >
              {createRequestMutation.isPending
                ? "Creating..."
                : "Create Request"}
            </button>
            <button
              type="button"
              className="text-blue-500 hover:text-blue-700"
              onClick={() => setIsContextModalOpen(true)}
            >
              Edit Context
            </button>
          </div>
        </form>
      </div>
      <UserContextEditorModal
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
      />
    </div>
  );
}
