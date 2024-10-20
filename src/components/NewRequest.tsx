"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { useAuthToken } from "@/lib/use-auth-token-hook";
import { api } from "@/trpc/react";

interface NewRequestProps {
  onSelectRequest: (extid: string | null) => void;
}

export function NewRequest({ onSelectRequest }: NewRequestProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ taskDescription: string }>();
  const authToken = useAuthToken();

  const createRequestMutation = api.createRequest.useMutation({
    onSuccess: (data) => {
      onSelectRequest(data.extid);
    },
  });

  const onSubmit = (data: { taskDescription: string }) => {
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
          <button
            type="submit"
            className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
            disabled={createRequestMutation.isPending}
          >
            {createRequestMutation.isPending ? "Creating..." : "Create Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
