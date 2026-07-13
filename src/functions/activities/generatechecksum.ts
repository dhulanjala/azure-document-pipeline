import * as df from "durable-functions";
import { OrchestrationInput } from "../../lib/types";
import { getBlobClient } from "../../lib/blob";
import { createHash } from "crypto";

df.app.activity("generateChecksum", {
  handler: async (input: OrchestrationInput) => {
    const blobClient = await getBlobClient(input.blobName);
    const response = await blobClient.download();
    const stream = response.readableStreamBody;
    if (!stream) {
      throw new Error(`No stream for blob ${input.blobName}`);
    }

    const hash = createHash("sha256");
    for await (const chunk of stream) {
      hash.update(chunk as Buffer);
    }

    return hash.digest("hex");
  },
});
