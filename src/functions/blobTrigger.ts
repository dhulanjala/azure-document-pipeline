import { app, InvocationContext } from "@azure/functions";
import * as df from "durable-functions";
export async function onBlobUpload(blob: Buffer, ctx: InvocationContext) {
  const blobName = ctx.triggerMetadata?.name as string;
  const documentId = blobName.split("/")[0];
  const client = df.getClient(ctx);
  const instanceId = await client.startNew("documentOrchestrator", {
    input: {
      documentId,
      blobName,
      container: "documents",
    },
  });
  ctx.log(`Started orchestration ${instanceId} for document ${documentId}`);
}

app.storageBlob("onBlobUpload", {
  path: "documents/{name}",
  connection: "STORAGE_CONNECTION",
  extraInputs: [df.input.durableClient()],
  handler: onBlobUpload,
});
