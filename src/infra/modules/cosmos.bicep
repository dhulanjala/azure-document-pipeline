// modules/cosmos.bicep — Cosmos DB (NoSQL API), serverless capacity mode.

param location string
param namePrefix string
param databaseName string
param documentsContainerName string
param auditContainerName string

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: toLower('${namePrefix}-cosmos-${uniqueString(resourceGroup().id)}')
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    capabilities: [
      { name: 'EnableServerless' }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
  }
}

resource documentsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: documentsContainerName
  properties: {
    resource: {
      id: documentsContainerName
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

resource auditContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: auditContainerName
  properties: {
    resource: {
      id: auditContainerName
      partitionKey: {
        paths: ['/documentId']
        kind: 'Hash'
      }
    }
  }
}

output cosmosAccountName string = cosmosAccount.name
