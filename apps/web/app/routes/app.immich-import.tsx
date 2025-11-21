import { CheckCircle2, AlertCircle, Loader2, Key, ExternalLink, Trash2 } from 'lucide-react'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { useLoaderData, useActionData, Form, useNavigation, type MetaFunction } from 'react-router'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { getImmichConfig, saveImmichIntegration, deleteImmichIntegration } from '../services/immich.server'
import { getUser } from '~/services/user.sever'
import { immichActionSchema, immichConfigFormSchema } from '@shared/schemas/immich'
import { addImmichImporterJob } from '@background-jobs/src/services/immichImporter'

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request)

  if (!user) {
    throw new Response('Unauthorized', { status: 401 })
  }

  try {
    const config = await getImmichConfig(user.id)
    return { hasIntegration: !!config, baseUrl: config?.baseUrl }
  } catch (error) {
    console.error('Loader error:', error)
    return { hasIntegration: false, baseUrl: null }
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await getUser(request)

  if (!user) {
    throw new Response('Unauthorized', { status: 401 })
  }
  try {
    const formData = await request.formData()
    const rawData = Object.fromEntries(formData)

    const actionResult = immichActionSchema.safeParse(rawData)

    if (!actionResult.success) {
      return {
        success: false,
        error: 'Invalid action',
      }
    }

    const action = actionResult.data

    switch (action.intent) {
      case 'start-import': {
        const configResult = immichConfigFormSchema.safeParse({
          apiKey: action.apiKey,
          baseUrl: action.baseUrl || 'http://host.docker.internal:2283',
        })

        if (!configResult.success) {
          return {
            success: false,
            error: 'Invalid configuration',
            fieldErrors: configResult.error.flatten().fieldErrors,
          }
        }

        await saveImmichIntegration(user.id, configResult.data.apiKey, configResult.data.baseUrl)
        await addImmichImporterJob(user.id)

        return { success: true, message: 'Import started successfully' }
      }

      case 'delete-integration': {
        await deleteImmichIntegration(user.id)
        return { success: true, message: 'Integration deleted successfully' }
      }

      default:
        return { success: false, error: 'Invalid action' }
    }
  } catch (error) {
    console.error('Action error:', error)
    return { success: false, error: 'An error occurred. Please try again.' }
  }
}

export const meta: MetaFunction = () => [{ title: 'Immich Integration | Edit Mind' }]

export default function ImmichIntegrationPage() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const [showApiKeyForm, setShowApiKeyForm] = useState(!data?.hasIntegration)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isSubmitting = navigation.state === 'submitting'

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget)
    const apiKey = formData.get('apiKey') as string
    const baseUrl = formData.get('baseUrl') as string

    const result = immichConfigFormSchema.safeParse({ apiKey, baseUrl })

    if (!result.success) {
      e.preventDefault()
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors({
        apiKey: fieldErrors.apiKey?.[0] || '',
        baseUrl: fieldErrors.baseUrl?.[0] || '',
      })
      return
    }

    setErrors({})
  }

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="max-w-7xl px-6 py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-semibold text-black dark:text-white tracking-tight mb-2">Immich</h1>
          <p className="text-base text-gray-600 dark:text-gray-400">Import face labels to enhance video labeling</p>
        </header>

        <AnimatePresence>
          {actionData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`mb-6 p-4 rounded-2xl ${
                actionData.success
                  ? 'bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {actionData.success ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                )}
                <p className="text-sm font-medium">{actionData.message || actionData.error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="bg-white/20 dark:bg-transparent backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden">
          {showApiKeyForm ? (
            <div className="p-8">
              <Form method="post" onSubmit={handleSubmit} className="space-y-6">
                <input type="hidden" name="intent" value="start-import" />

                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    id="apiKey"
                    name="apiKey"
                    placeholder="Enter your Immich API key"
                    required
                    className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                      errors.apiKey || actionData?.fieldErrors?.apiKey
                        ? 'border-red-300 dark:border-red-800 focus:ring-red-500/20'
                        : 'border-gray-200 dark:border-gray-800 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-500'
                    }`}
                  />
                  {(errors.apiKey || actionData?.fieldErrors?.apiKey) && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {errors.apiKey || actionData?.fieldErrors?.apiKey?.[0]}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Base URL
                  </label>
                  <input
                    type="url"
                    id="baseUrl"
                    name="baseUrl"
                    placeholder="http://host.docker.internal:2283"
                    defaultValue={data?.baseUrl || 'http://host.docker.internal:2283'}
                    className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                      errors.baseUrl || actionData?.fieldErrors?.baseUrl
                        ? 'border-red-300 dark:border-red-800 focus:ring-red-500/20'
                        : 'border-gray-200 dark:border-gray-800 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-500'
                    }`}
                  />
                  {(errors.baseUrl || actionData?.fieldErrors?.baseUrl) && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {errors.baseUrl || actionData?.fieldErrors?.baseUrl?.[0]}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-900 hover:bg-purple-700 text-white rounded-xl font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Save & Start Import
                      </>
                    )}
                  </button>

                  {data?.hasIntegration && (
                    <button
                      type="button"
                      onClick={() => setShowApiKeyForm(false)}
                      className="px-6 py-3 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </Form>

              <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                <div className="flex gap-3">
                  <ExternalLink className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">How to get your API Key</p>
                    <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
                      <li>1. Open your Immich instance</li>
                      <li>2. Go to Account Settings</li>
                      <li>3. Navigate to API Keys section</li>
                      <li>4. Create and copy your API key</li>
                    </ol>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-4 mb-2">
                      Required API Scopes for Face Labeling
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      To pull faces from Immich and use them for labeling your videos, your API key needs the following
                      permissions:
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 mt-2 list-disc list-inside">
                      <li>
                        <strong>face.read</strong> – access face metadata for labeling
                      </li>
                      <li>
                        <strong>asset.read</strong> – read asset information (photos)
                      </li>
                      <li>
                        <strong>asset.download</strong> – download assets for processing
                      </li>
                      <li>
                        <strong>asset.share</strong> – allow sharing or referencing assets in workflows
                      </li>
                      <li>
                        <strong>timeline.read</strong> – read timeline data to associate faces with events
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-500" />
                </div>
                <h2 className="text-xl font-semibold text-black dark:text-white mb-2">Connected</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">Face labels are syncing automatically</p>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setShowApiKeyForm(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-[0.98]"
                  >
                    <Key className="w-4 h-4" />
                    Update Settings
                  </button>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete-integration" />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-[0.98]"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </Form>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </DashboardLayout>
  )
}
