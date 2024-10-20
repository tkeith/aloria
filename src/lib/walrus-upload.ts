import { z } from "zod";

export async function uploadToWalrus(data: Buffer) {
  // choose a random publisher
  const PUBLISHERS = [
    "https://publisher.walrus-testnet.walrus.space",
    "https://wal-publisher-testnet.staketab.org",
    "https://walrus-testnet-publisher.bartestnet.com",
    "https://walrus-testnet-publisher.nodes.guru",
    "https://sui-walrus-testnet.bwarelabs.com/publisher",
    "https://walrus-testnet-publisher.stakin-nodes.com",
    "https://testnet-publisher-walrus.kiliglab.io",
    "https://walrus-testnet-publisher.nodeinfra.com",
  ];
  const randomPublisher =
    PUBLISHERS[Math.floor(Math.random() * PUBLISHERS.length)];
  const uploadEndpoint = `${randomPublisher}/v1/store?epochs=5`;

  console.log("Uploading screenshot to Walrus with endpoint", uploadEndpoint);
  try {
    const response = await fetch(uploadEndpoint, {
      method: "PUT",
      body: data,
      headers: {
        "Content-Type": "image/png", // Assuming the screenshot is in PNG format
      },
    });

    if (!response.ok) {
      try {
        console.log("walrus error text", await response.text());
      } catch (e) {
        console.log("Failed to get error text");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const jsonRes = await response.json();
    console.log(`Screenshot uploaded successfully. Result: ${jsonRes}`);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const stringRes = z
      .string()
      .nullable()
      .parse(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        jsonRes?.newlyCreated?.blobObject?.blobId ??
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          jsonRes?.alreadyCertified?.blobId ??
          null,
      );
    console.log("walrus blob id", stringRes);
    return stringRes;
  } catch (error) {
    console.error("Error uploading screenshot:", error);
  }
}

export async function walrusUploadWithRetry(data: Buffer) {
  for (let i = 0; i < 10; i++) {
    try {
      const res = await uploadToWalrus(data);
      if (res) {
        return res;
      }
    } catch (e) {
      console.error("Error uploading screenshot:", e);
    }
  }
  return null;
}
