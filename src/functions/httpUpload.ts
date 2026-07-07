import { app, HttpRequest, InvocationContext } from "@azure/functions";
import { randomUUID } from "crypto";
import { getUploadSasUrl } from "../lib/blob";

export async function httpUpload(req: HttpRequest, ctx: InvocationContext) {
  const body = (await req.json()) as { fileName?: string; contentType: string };

  //validation
  if (!body.fileName || !body.contentType) {
    return {
      status: 400,
      jsonBody: {
        error: "fileName and contentType are required",
      },
    };
  }

  const documentId = randomUUID();
  const blobName = `${documentId}/${body.fileName}`;
  const uploadURL = await getUploadSasUrl(blobName, body.contentType);

  ctx.log(`Issued upload URL for document ${documentId}`);

  return {
    status: 201,
    jsonBody: {
      documentId,
      uploadURL,
      expiresInMin: 15,
    },
  };
}

app.http("httpUpload", {
  methods: ["POST"],
  route: "documents",
  authLevel: "function",
  handler: httpUpload,
});
