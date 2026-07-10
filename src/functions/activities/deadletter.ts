import * as df from "durable-functions";
import { OrchestrationInput } from "../../lib/types";
import { QueueServiceClient } from "@azure/storage-queue";

type DeadLetterInput = {
  input: OrchestrationInput;
  error: string;
};

const QUEUE = process.env.DEADLETTER_QUEUE ?? "processing-deadletter";
const queueClient = QueueServiceClient.fromConnectionString(
  process.env.STORAGE_CONNECTION,
).getQueueClient(QUEUE);

df.app.activity("deadLetter", {
  handler: async (payload: DeadLetterInput) => {
    if (process.env.NODE_ENV !== "production") {
      await queueClient.createIfNotExists();
    }

    const message = {
      ...payload,
      deadLetteredAt: new Date().toISOString(),
    };

    // for binary-safety across tools
    await queueClient.sendMessage(
      Buffer.from(JSON.stringify(message)).toString("base64"),
    );
  },
});
