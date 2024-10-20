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
import toast from "react-hot-toast";

interface NewRequestProps {
  onSelectRequest: (extid: string | null) => void;
}

export function NewRequest({ onSelectRequest }: NewRequestProps) {
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
  } = useForm<{ taskDescription: string }>();
  const authToken = useAuthToken();
  const { primaryWallet, network } = useDynamicContext();

  // Fetch prompts
  const { data: promptsData } = api.getPrompts.useQuery({});

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

  const createRequestMutation = api.createRequest.useMutation({
    onSuccess: (data) => {
      onSelectRequest(data.extid);
    },
  });

  const publishPromptMutation = api.publishPrompt.useMutation();

  if (!address) {
    return null;
  }

  const onSubmit = async (data: { taskDescription: string }) => {
    if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
      return;
    }

    const walletClient = await primaryWallet.getWalletClient();

    let creatorAddress: string | undefined = undefined;

    if (selectedPrompt) {
      creatorAddress = promptsData?.prompts.find(
        (p) => p.content === selectedPrompt,
      )?.createdByAddress;
    }

    if (!creatorAddress) {
      await walletClient.writeContract({
        abi: ABI,
        address: address,
        functionName: "startRequest",
        args: [data.taskDescription],
        value: BigInt(1),
      });
    } else {
      await walletClient.writeContract({
        abi: ABI,
        address: address,
        functionName: "startRequestFromOwnedPrompt",
        args: [data.taskDescription, creatorAddress],
        value: BigInt(2),
      });
    }

    createRequestMutation.mutate({
      authToken,
      taskDescription: data.taskDescription,
    });
  };

  const publishPrompt = async () => {
    // This is a dummy function for now
    console.log("Publish Prompt clicked");
    // You can add more functionality here in the future
    // log the current prompt
    const prompt = getValues("taskDescription");
    if (prompt.trim() === "") {
      toast.error("Prompt cannot be empty");
      return;
    }

    console.log(prompt);

    if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
      return;
    }

    const walletClient = await primaryWallet.getWalletClient();

    await walletClient.writeContract({
      abi: ABI,
      address: address,
      functionName: "publishPrompt",
      args: [prompt],
      value: BigInt(0),
    });

    await publishPromptMutation.mutateAsync({
      authToken,
      prompt,
      createdByAddress: primaryWallet.address,
    });

    toast.success("Prompt published");
  };

  const handlePromptSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPromptContent = e.target.value;
    setSelectedPrompt(selectedPromptContent);
    setValue("taskDescription", selectedPromptContent);
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
          <div className="flex items-center space-x-8">
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
            <button
              type="button"
              className="text-blue-500 hover:text-blue-700"
              onClick={publishPrompt}
            >
              Publish Prompt
            </button>
            <select
              onChange={handlePromptSelect}
              value={selectedPrompt || ""}
              className="rounded border p-2"
            >
              <option value="">Select a prompt</option>
              {promptsData?.prompts.slice(0, 10).map((prompt, index) => (
                <option key={index} value={prompt.content}>
                  {prompt.name}
                </option>
              ))}
            </select>
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
