"use client";

import { useAuthToken } from "@/lib/use-auth-token-hook";
import { api } from "@/trpc/react";
import React, { useState } from "react";
import Image from "next/image";
import { ImageModal } from "./ImageModal";

interface RequestDetailsProps {
  selectedRequestExtid: string;
}

export function RequestDetails({ selectedRequestExtid }: RequestDetailsProps) {
  const authToken = useAuthToken();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  const requestQuery = api.getRequest.useQuery({
    authToken,
    extid: selectedRequestExtid,
  });

  if (requestQuery.data === undefined) {
    return <div className="w-2/3">Loading...</div>;
  }

  const { task, status, result, name, extid, steps } =
    requestQuery.data.request;

  const openModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setModalOpen(true);
  };

  return (
    <div className="w-2/3">
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Request: {name}</h2>
        <p className="text-gray-600">{task}</p>
        <div className="mt-6">
          <h3 className="mb-2 text-lg font-semibold">Steps:</h3>
          {steps.map((step, index) => (
            <div key={step.extid} className="mb-4 flex items-center space-x-4">
              <div className="flex-shrink-0">
                {step.status === "Pending" ? (
                  <div className="size-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                ) : (
                  <span className="text-lg font-bold">{index + 1}</span>
                )}
              </div>
              <div className="flex-grow">
                <p className="text-sm">
                  {step.actionDescription || "Executing..."}
                </p>
              </div>
              <div className="flex space-x-2">
                {[
                  step.startingScreenshotBase64,
                  step.annotatedScreenshotBase64,
                  step.endingScreenshotBase64,
                ].map((screenshot, i) => (
                  <div key={i} className="h-[422px] w-[250px] bg-gray-100">
                    {screenshot ? (
                      <Image
                        src={`data:image/png;base64,${screenshot}`}
                        alt={`Screenshot ${i + 1}`}
                        width={500}
                        height={844}
                        className="cursor-pointer border border-gray-400 object-cover"
                        onClick={() =>
                          openModal(`data:image/png;base64,${screenshot}`)
                        }
                      />
                    ) : (
                      <div></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <ImageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        imageUrl={selectedImage}
      />
    </div>
  );
}
