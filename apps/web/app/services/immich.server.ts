import { prisma } from '~/services/database'
import { encryptApiKey, decryptApiKey } from '@shared/services/encryption'

export async function saveImmichIntegration(userId: string, apiKey: string, baseUrl?: string) {
  const encryptedKey = encryptApiKey(apiKey)

  return await prisma.integration.upsert({
    where: { userId },
    update: {
      immichApiKey: encryptedKey,
      immichBaseUrl: baseUrl || 'http://host.docker.internal:2283',
      updatedAt: new Date(),
    },
    create: {
      userId,
      immichApiKey: encryptedKey,
      immichBaseUrl: baseUrl || 'http://host.docker.internal:2283',
    },
  })
}

export async function getImmichApiKey(userId: string): Promise<string | null> {
  const integration = await prisma.integration.findUnique({
    where: { userId },
    select: { immichApiKey: true },
  })

  if (!integration?.immichApiKey) {
    return null
  }

  return decryptApiKey(integration.immichApiKey)
}

export async function getImmichConfig(userId: string) {
  const integration = await prisma.integration.findUnique({
    where: { userId },
  })

  if (!integration?.immichApiKey) {
    return null
  }

  return {
    apiKey: decryptApiKey(integration.immichApiKey),
    baseUrl: integration.immichBaseUrl || 'http://host.docker.internal:2283',
  }
}

export async function deleteImmichIntegration(userId: string) {
  return await prisma.integration.delete({
    where: { userId },
  })
}
