import { app, InvocationContext } from "@azure/functions";
import { OrchestrationInput } from "../lib/types";
import * as df from "durable-functions";

export async function retryFailedDocument(
  queueItem: unknown,
  ctx: InvocationContext,
): Promise<void> {
  const raw = queueItem as Record<string, unknown>;
  if (typeof raw.documentId !== "string" || typeof raw.blobName !== "string") {
    throw new Error(
      `Malformed dead-letter queue message: ${JSON.stringify(raw)}`,
    );
  }
  const input = raw as unknown as OrchestrationInput;
  const dequeueCount = ctx.triggerMetadata?.dequeueCount as number | undefined;

  ctx.log(
    `Retrying document ${input.documentId} (dequeue attempt ${dequeueCount ?? "?"})`,
  );

  const client = df.getClient(ctx);
  const instanceId = await client.startNew("documentOrchestrator", {
    input: { ...input, isRetry: true },
  });
}

app.storageQueue("retryFailedDocument", {
  queueName: process.env.DEADLETTER_QUEUE ?? "processing-deadletter",
  connection: "STORAGE_CONNECTION",
  extraInputs: [df.input.durableClient()],
  handler: retryFailedDocument,
});
