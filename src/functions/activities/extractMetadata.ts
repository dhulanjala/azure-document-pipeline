import * as df from "durable-functions";
import { OrchestrationInput } from "../../lib/types";
import { getBlobClient } from "../../lib/blob";

df.app.activity("extractMetadata", {
  handler: async (input: OrchestrationInput) => {
    const blobClient = await getBlobClient(input.blobName);
    const props = await blobClient.getProperties();
    return {
      contentType: props.contentType ?? "application/octet-stream",
      sizeBytes: props.contentLength ?? 0,
    };
  },
});
