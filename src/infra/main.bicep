// main.bicep — composition root: one set of name parameters, three modules.


param location string = resourceGroup().location
param namePrefix string = 'docpipe'

param databaseName string = 'docpipeline'
param documentsContainerName string = 'documents'
param auditContainerName string = 'failureaudit'
param deadletterQueueName string = 'processing-deadletter'

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params : {
    location: location
    namePrefix: namePrefix
    documentsContainerName: documentsContainerName
    deadletterQueueName: deadletterQueueName
  }
}

module cosmos 'modules/cosmos.bicep' = {
  name: 'cosmos'
  params: {
    location: location
    namePrefix: namePrefix
    databaseName: databaseName
    documentsContainerName: documentsContainerName
    auditContainerName: auditContainerName
  }
}

module functionApp 'modules/functionApp.bicep' = {
  name: 'functionApp'
  params: {
    location: location
    namePrefix: namePrefix
    storageAccountName: storage.outputs.storageAccountName
    cosmosAccountName: cosmos.outputs.cosmosAccountName
    databaseName: databaseName
    documentsContainerName: documentsContainerName
    auditContainerName: auditContainerName
    deadletterQueueName: deadletterQueueName
  }
}

output functionAppName string = functionApp.outputs.functionAppName
output apiBaseUrl string = 'https://${functionApp.outputs.functionAppHostname}/api'



