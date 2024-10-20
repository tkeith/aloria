"use client";

import { useAuthToken } from "@/lib/use-auth-token-hook";
import { api } from "@/trpc/react";
import React, { useState } from "react";
import Image from "next/image";
import { ImageModal } from "./ImageModal";
import { MiniStatus } from "./MiniStatus";

interface RequestDetailsProps {
  selectedRequestExtid: string;
}

export function RequestDetails({ selectedRequestExtid }: RequestDetailsProps) {
  const authToken = useAuthToken();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedDownloadUrl, setSelectedDownloadUrl] = useState<string | null>(
    null,
  );

  const requestQuery = api.getRequest.useQuery(
    {
      authToken,
      extid: selectedRequestExtid,
    },
    {
      refetchInterval: 1000,
    },
  );

  if (requestQuery.data === undefined) {
    return <div className="w-2/3">Loading...</div>;
  }

  const { task, status, result, name, extid, steps } =
    requestQuery.data.request;

  const openModal = (imageUrl: string, downloadUrl: string | null) => {
    setSelectedImage(imageUrl);
    setSelectedDownloadUrl(downloadUrl);
    setModalOpen(true);
  };

  return (
    <div className="w-2/3">
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Request: {name}</h2>
        <p className="text-gray-600">{task}</p>

        {/* Updated block to display multi-line result */}
        {result !== null && result.trim() !== "" && (
          <div className="mt-4">
            <h3 className="mb-2 text-lg font-semibold">Result:</h3>
            <pre className="whitespace-pre-wrap break-words rounded bg-gray-100 p-3 text-sm text-gray-800">
              {result}
            </pre>
          </div>
        )}

        <div className="mt-6">
          <h3 className="mb-2 text-lg font-semibold">Steps:</h3>
          {steps.map((step, index) => (
            <div key={step.extid} className="mb-4 flex items-center space-x-4">
              <div className="flex flex-shrink-0 items-center space-x-4">
                <MiniStatus status={step.status} />
                <span className="text-lg font-bold">{index + 1}</span>
              </div>
              <div className="flex-grow">
                <p className="">
                  {step.actionDescription || "Thinking about what to do..."}
                </p>
              </div>
              <div className="flex space-x-2">
                {[
                  {
                    url: step.startingScreenshotBase64,
                    downloadUrl: step.startingScreenshotWalrusBlob,
                  },
                  {
                    url: step.annotatedScreenshotBase64,
                    downloadUrl: step.annotatedScreenshotWalrusBlob,
                  },
                  {
                    url: step.endingScreenshotBase64,
                    downloadUrl: step.endingScreenshotWalrusBlob,
                  },
                ].map((screenshot, i) => (
                  <div key={i} className="h-[211px] w-[125px] bg-gray-100">
                    {screenshot.url ? (
                      <Image
                        src={`data:image/png;base64,${screenshot.url}`}
                        alt={`Screenshot ${i + 1}`}
                        width={125}
                        height={211}
                        className="cursor-pointer border border-gray-400 object-cover"
                        onClick={() =>
                          openModal(
                            `data:image/png;base64,${screenshot.url}`,
                            screenshot.downloadUrl &&
                              "https://aggregator.walrus-testnet.walrus.space/v1/" +
                                screenshot.downloadUrl,
                          )
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
        downloadUrl={selectedDownloadUrl}
      />
    </div>
  );
}
