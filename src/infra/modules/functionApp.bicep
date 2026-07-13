

param location string
param namePrefix string
param storageAccountName string
param cosmosAccountName string
param databaseName string
param documentsContainerName string
param auditContainerName string
param deadletterQueueName string

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' existing = {
  name: cosmosAccountName
}

var storageConnection = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
var cosmosConnection = cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString

// az monitoring service
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${namePrefix}-appi'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
  }
}

resource hostingPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${namePrefix}-plan'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: true
  }
}

// az function app creation
resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: '${namePrefix}-func-${uniqueString(resourceGroup().id)}'
  location: location
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'Node|20'
      appSettings: [
        { name: 'AzureWebJobsStorage', value: storageConnection }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'NODE_ENV', value: 'production' }
        { name: 'STORAGE_CONNECTION', value: storageConnection }
        { name: 'COSMOS_CONNECTION', value: cosmosConnection }
        { name: 'COSMOS_DATABASE', value: databaseName }
        { name: 'CONTAINER', value: documentsContainerName }
        { name: 'AUDIT_CONTAINER', value: auditContainerName }
        { name: 'DEADLETTER_QUEUE', value: deadletterQueueName }
      ]
    }
  }
}

output functionAppName string = functionApp.name
output functionAppHostname string = functionApp.properties.defaultHostName
