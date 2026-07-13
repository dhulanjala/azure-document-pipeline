import * as df from "durable-functions";
import { FailureAuditEvent, OrchestrationInput } from "../../lib/types";
import { QueueServiceClient } from "@azure/storage-queue";
import { getAuditLogContainer } from "../../lib/cosmos";
import { randomUUID } from "crypto";

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

    // 1. Queue message — this IS the retry. retryFailedDocument.ts will pick
    // it up; if it fails again, the message becomes visible again after the
    // visibility timeout, automatically, with no code here tracking that.
    await queueClient.sendMessage(
      Buffer.from(JSON.stringify(payload.input)).toString("base64"), //for binary safety
    );

    const container = await getAuditLogContainer();
    const id = payload.input.documentId;

    const now = new Date().toISOString();

    // 2. Audit event
    const event: FailureAuditEvent = {
      id: randomUUID(),
      documentId: id,
      blobName: payload.input.blobName,
      error: payload.error,
      occuredAt: now,
    };

    await container.items.create(event);
  },
});
