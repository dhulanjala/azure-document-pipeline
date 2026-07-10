import { Container, CosmosClient } from "@azure/cosmos";

const DATABASE = process.env.COSMOS_DATABASE ?? "docpipeline";
const CONTAINER = process.env.CONTAINER ?? "documents";

const client = new CosmosClient(process.env.COSMOS_CONNECTION);
let container: Container | undefined;
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
  return container
}
