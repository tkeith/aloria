import { env } from "@/env";
import { Client } from "@xmtp/xmtp-js";
import { Wallet } from "ethers";

export async function xmtpSendMessage(to: string, body: string) {
  try {
    console.log("Sending message to " + to + ": " + body);
    const wallet = new Wallet(env.WALLET_PRIVATE_KEY);
    // console.log("Wallet address: " + wallet.address);

    const xmtp = await Client.create(wallet, { env: "production" });
    // console.log("Client created", xmtp.address);

    const isOnProdNetwork = await xmtp.canMessage(to);
    console.log("Can message: " + isOnProdNetwork);
    if (isOnProdNetwork) {
      const conversation = await xmtp.conversations.newConversation(to);
      const message = await conversation.send(body);
      console.log("Message sent", message);
    }
  } catch (e) {
    console.error("Error sending message", e);
  }
}
