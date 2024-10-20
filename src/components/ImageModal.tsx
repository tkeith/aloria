"use client";

import React from "react";
import Image from "next/image";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  downloadUrl?: string | null | undefined;
}

export function ImageModal({
  isOpen,
  onClose,
  imageUrl,
  downloadUrl,
}: ImageModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
      onClick={onClose}
    >
      <div className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center">
        <Image
          src={imageUrl}
          alt="Enlarged screenshot"
          width={1000}
          height={1688}
          className="max-h-[85vh] max-w-[90vw] object-contain"
        />
        {downloadUrl && (
          <a
            href={downloadUrl}
            download
            className="mt-2 text-sm text-blue-400 hover:text-blue-300"
            onClick={(e) => e.stopPropagation()}
          >
            Download Image
          </a>
        )}
      </div>
    </div>
  );
}
