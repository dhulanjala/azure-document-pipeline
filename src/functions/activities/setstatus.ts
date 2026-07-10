import * as df from "durable-functions";
import { getDocumentsContainer } from "../../lib/cosmos";
import { DocumentRecord, DocumentStatus } from "../../lib/types";

type SetStatusInput = {
  id: string;
  status: DocumentStatus;
  error?: string;
};

// we dont want get resource to update only status but for manage create / update both going with this approach
df.app.activity("setStatus", {
  handler: async (input: SetStatusInput) => {
    const container = await getDocumentsContainer();

    let existing: Partial<DocumentRecord> = {};

    try {
      const { resource } = await container
        .item(input.id, input.id)
        .read<DocumentRecord>();
      if (resource) existing = resource;
    } catch (error) {
      // when first time update the status it will come to this with 404. anyway we are creating new one
    }

    const record: DocumentRecord = {
      fileName: "",
      contentType: "",
      sizeBytes: 0,
      uploadedAt: new Date().toISOString(),
      ...existing,
      id: input.id,
      status: input.status,
      ...(input.error ? { error: input.error } : {}),
      ...(input.status === "indexed" || input.status === "failed"
        ? { processedAt: new Date().toISOString() }
        : {}),
    };

    console.log("=============resource",record)
    await container.items.upsert(record);
  },
});
