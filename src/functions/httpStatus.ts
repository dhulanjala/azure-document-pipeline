import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDocumentsContainer } from "../lib/cosmos";
import { DocumentRecord } from "../lib/types";

export async function httpStatus(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id;
  if (!id) {
    return {
      status: 400,
      jsonBody: {
        error: "document id is required",
      },
    };
  }

  const container = await getDocumentsContainer();

  const { resource } = await container.item(id, id).read<DocumentRecord>();

  if (!resource) {
    return {
      status: 401,
      jsonBody: {
        error: `document ${id} not found`,
      },
    };
  }

  return {
    status: 200,
    jsonBody: {
      documentId: resource.id,
      fileName: resource.fileName,
      status: resource.status,
      sizeBytes: resource.sizeBytes,
      checksumSha256: resource.checksumSha256,
      uploadedAt: resource.uploadedAt,
      processedAt: resource.processedAt,
      ...(resource.error ? { error: resource.error } : {}),
    },
  };
}

app.http("httpStatus", {
  methods: ["GET"],
  route: "documents/{id}",
  authLevel: "function",
  handler: httpStatus,
});
