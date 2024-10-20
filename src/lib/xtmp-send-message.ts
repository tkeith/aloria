import { Client } from "@xmtp/xmtp-js";
import { Wallet } from "ethers";

export async function sendMessage(
  to: string,
  body: string,
  walletPrivateKey: string,
) {
  console.log("Sending message to " + to + ": " + body);
  const wallet = new Wallet(walletPrivateKey);
  // console.log("Wallet address: " + wallet.address);

  const xmtp = await Client.create(wallet, { env: "production" });
  // console.log("Client created", xmtp.address);

  // const toWalletAddress = (await airstackLookup(to)) || to;
  const isOnProdNetwork = await xmtp.canMessage(to);
  console.log("Can message: " + isOnProdNetwork);
  if (isOnProdNetwork) {
    const conversation = await xmtp.conversations.newConversation(to);
    // console.log("Conversation created", conversation);
    const message = await conversation.send(body);
    // console.log("Message sent", message);
  }
}
