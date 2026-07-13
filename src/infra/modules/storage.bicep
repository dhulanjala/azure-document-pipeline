// modules/storage.bicep — storage account, blob container, dead-letter queue
// This file is responsible for creating all Azure Storage resources

param location string // this value come from main.bicep
param namePrefix string
param documentsContainerName string
param deadletterQueueName string

// create actual azure storage account
// Microsoft.Storage - resource provider
// storageAccounts - which resource meed to create
// 2026-04-01 -which API vestion
resource storageAccount 'Microsoft.Storage/storageAccounts@2026-04-01' = {
  name: toLower(replace('${namePrefix}sa${uniqueString(resourceGroup().id)}', '-', ''))
  location: location
  sku: {
    name: 'Standard_LRS'// azure keeps 3 copies in single data center
  }
  kind: 'StorageV2'// general-purpose v2
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource documentsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: documentsContainerName
  properties: {
    publicAccess: 'None'
  }
}

resource queueService 'Microsoft.Storage/storageAccounts/queueServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource deadletterQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-05-01' = {
  parent: queueService
  name: deadletterQueueName
}

output storageAccountName string = storageAccount.name
