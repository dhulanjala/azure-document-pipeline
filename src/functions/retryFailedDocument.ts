import { app, InvocationContext } from "@azure/functions";
import { OrchestrationInput } from "../lib/types";
import * as df from "durable-functions";

const POLL_INTERVAL_MS = 1000;
const MAX_WAIT_MS = 60_000;

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

  // Block until the retry orchestration reaches a terminal state.
  // cause without this it immediatel return instance id and background it still running the orchestration
  // and queue think its successfull and delete the queue message and but under the hood in orchestration will throw an error and we will miss it.
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    const status = await client.getStatus(instanceId);

    if (status?.runtimeStatus === "Completed") {
      ctx.log(`Retry succeeded for document ${input.documentId}`);
      return;
    }
    //Azure does not delete the queue message.
    if (
      status?.runtimeStatus === "Failed" ||
      status?.runtimeStatus === "Terminated"
    ) {
      throw new Error(
        `Retry orchestration ${instanceId} ended as ${status.runtimeStatus} for document ${input.documentId}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `Timed out waiting for retry orchestration ${instanceId} (document ${input.documentId})`,
  );
}

app.storageQueue("retryFailedDocument", {
  queueName: process.env.DEADLETTER_QUEUE ?? "processing-deadletter",
  connection: "STORAGE_CONNECTION",
  extraInputs: [df.input.durableClient()],
  handler: retryFailedDocument,
});
