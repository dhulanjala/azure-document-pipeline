export type DocumentStatus = "uploaded" | "processing" | "indexed" | "failed";

export interface DocumentRecord {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256?: string;
  status: DocumentStatus;
  uploadedAt: string; //ISO
  processedAt?: string;
  error?: string;
}

export interface OrchestrationInput {
  documentId: string;
  blobName: string;
  container: string;
  isRetry?: boolean;
}

export interface FailureAuditEvent {
  id: string;
  documentId: string;
  blobName: string;
  error: string;
  occuredAt: string;
}
