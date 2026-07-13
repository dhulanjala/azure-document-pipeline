import * as df from "durable-functions";
import { OrchestrationInput } from "../lib/types";

df.app.orchestration("documentOrchestrator", function* (ctx) {
  const input = ctx.df.getInput() as OrchestrationInput;
  const retryPolicy = new df.RetryOptions(5000, 3); // 5s and 3 times
  retryPolicy.backoffCoefficient = 2;

  yield ctx.df.callActivity("setStatus", {
    id: input.documentId,
    staus: "processing",
  });
  try {
    const metadata = yield ctx.df.callActivityWithRetry(
      "extractMetadata",
      retryPolicy,
      input,
    );
    const checksum = yield ctx.df.callActivityWithRetry(
      "generateChecksum",
      retryPolicy,
      input,
    );

    yield ctx.df.callActivityWithRetry("indexDocument", retryPolicy, {
      ...input,
      checksum,
      metadata,
    });
    yield ctx.df.callActivity("setStatus", {
      id: input.documentId,
      status: "indexed",
    });
  } catch (error) {
    yield ctx.df.callActivity("setStatus", {
      id: input.documentId,
      status: "failed",
    });

    if (!input.isRetry) {
      yield ctx.df.callActivity("deadLetter", { input, error: String(error) });
    }

    throw error;
  }
});
