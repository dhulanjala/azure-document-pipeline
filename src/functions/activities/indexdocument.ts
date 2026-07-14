import * as df from "durable-functions";
import { DocumentRecord, OrchestrationInput } from "../../lib/types";
import { getDocumentsContainer } from "../../lib/cosmos";

type IndexInput = OrchestrationInput & {
  metadata: { contentType: string; sizeBytes: number };
  checksum: string;
};
export async function indexDocumentHandler(input: IndexInput) {
  const container = await getDocumentsContainer();

  const record: DocumentRecord = {
    id: input.documentId,
    fileName: input.blobName.split("/").slice(1).join("/"),
    contentType: input.metadata.contentType,
    sizeBytes: input.metadata.sizeBytes,
    checksumSha256: input.checksum,
    status: "indexed" as const,
    uploadedAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
  };

  await container.items.upsert(record);
  return record.id;
}

df.app.activity("indexDocument", { handler: indexDocumentHandler });
