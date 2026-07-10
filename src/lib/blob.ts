import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";

const CONTAINER = "documents";
const connectionString = process.env.STORAGE_CONNECTION;

// Built once at module load — not per request
const blobServiceClient =
  BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(CONTAINER);

function parseCredential(conn: string): StorageSharedKeyCredential {
  const name = /AccountName=([^;]+)/.exec(conn)?.[1];
  const key = /AccountKey=([^;]+)/.exec(conn)?.[1];
  if (!name || !key)
    throw new Error("STORAGE_CONNECTION missing AccountName/AccountKey");
  return new StorageSharedKeyCredential(name, key);
}
const sharedKeyCredential = parseCredential(connectionString);

//creat SAS URL
export async function getUploadSasUrl(
  blobName: string,
  contentType: string,
): Promise<string> {
  
  if (process.env.NODE_ENV !== "production") {
    await containerClient.createIfNotExists();
  }

  const now = new Date();
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER,
      blobName,
      permissions: BlobSASPermissions.parse("cw"),
      startsOn: new Date(now.valueOf() - 5 * 60 * 1000), // 5 min in past: clock skew
      expiresOn: new Date(now.valueOf() + 15 * 60 * 1000), // 15 min
      contentType,
    },
    sharedKeyCredential,
  ).toString();

  return `${containerClient.getBlockBlobClient(blobName).url}?${sasToken}`;
}

// get blob client
export async function getBlobClient(blobName: string) {
  return containerClient.getBlobClient(blobName);
}
