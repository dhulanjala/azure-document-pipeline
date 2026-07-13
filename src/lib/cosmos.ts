import { Container, CosmosClient } from "@azure/cosmos";

const DATABASE = process.env.COSMOS_DATABASE ?? "docpipeline";
const CONTAINER = process.env.CONTAINER ?? "documents";
const AUDIT_CONTAINER = process.env.AUDIT_CONTAINER ?? "failureaudit";

const client = new CosmosClient(process.env.COSMOS_CONNECTION);
let container: Container | undefined;
let auditContainer: Container | undefined;

export async function getDocumentsContainer(): Promise<Container> {
  if (container) return container;

  if (process.env.NODE_ENV !== "production") {
    const { database } = await client.databases.createIfNotExists({
      id: DATABASE,
    });
    const { container: created } = await database.containers.createIfNotExists({
      id: CONTAINER,
      partitionKey: { paths: ["/id"] },
    });
    container = created;
  } else {
    container = client.database(DATABASE).container(CONTAINER);
  }
  return container;
}

export async function getAuditLogContainer(): Promise<Container> {
  if (auditContainer) return auditContainer;

  if (process.env.NODE_ENV !== "production") {
    const { database } = await client.databases.createIfNotExists({
      id: DATABASE,
    });
    const { container: created } = await database.containers.createIfNotExists({
      id: AUDIT_CONTAINER,
      partitionKey: { paths: ["/id"] },
    });
    auditContainer = created;
  } else {
    auditContainer = client.database(DATABASE).container(AUDIT_CONTAINER);
  }

  return auditContainer;
}
