import { CheckCircle2, AlertCircle, Loader2, Key, ExternalLink } from 'lucide-react'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { useLoaderData, useActionData, Form, useNavigation, type MetaFunction } from 'react-router'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ActionFunctionArgs } from 'react-router'
import { addImmichImporterJob } from './../../../background-jobs/src/services/immichImporter'

export async function loader() {
  try {
    return null
  } catch (error) {
    console.error(error)
    return { integration: null, imports: [] }
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')

  try {
    if (intent === 'start-import') {
      const apiKey = formData.get('apiKey') as string

      await addImmichImporterJob(apiKey)

      return { success: true, message: 'Import started successfully' }
    }

    return { success: false, error: 'Invalid action' }
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
  const [showApiKeyForm, setShowApiKeyForm] = useState(!data?.integration)

  const isSubmitting = navigation.state === 'submitting'

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="max-w-7xl px-8 py-16">
        <header className="mb-12">
          <h1 className="text-5xl font-semibold text-black dark:text-white mb-2">Immich Integration</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Import face labels from Immich to enhance video labeling
          </p>
        </header>

        <AnimatePresence>
          {actionData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-6 p-4 rounded-xl border ${
                actionData.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionData.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
                <p
                  className={`text-sm font-medium ${
                    actionData.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                  }`}
                >
                  {actionData.message || actionData.error}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="bg-transparent rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden mb-8">
          <div className="px-8 py-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
            <div>
              <h2 className="text-2xl font-semibold text-black dark:text-white">Immich Configuration</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connect your Immich instance to import face labels
              </p>
            </div>
            {!showApiKeyForm && (
              <button
                onClick={() => setShowApiKeyForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium text-sm hover:opacity-80 active:scale-95 transition-all"
              >
                <Key className="w-4 h-4" />
                Update Settings
              </button>
            )}
          </div>

          <div className="px-8 py-6">
            {showApiKeyForm ? (
              <Form method="post" className="space-y-6">
                <input type="hidden" name="intent" value="start-import" />

                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    id="apiKey"
                    name="apiKey"
                    placeholder="Enter your Immich API key"
                    required
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    You can find your API key in Immich settings under Account Settings → API Keys
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium text-sm hover:opacity-80 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Save Configuration
                      </>
                    )}
                  </button>
                </div>
              </Form>
            ) : null}

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-start gap-3">
                <ExternalLink className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    How to get your Immich API Key
                  </p>
                  <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                    <li>Open your Immich instance</li>
                    <li>Go to Account Settings (click your profile)</li>
                    <li>Navigate to API Keys section</li>
                    <li>Click "Create API Key" and copy it</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </section>

        <p className="text-base text-gray-400 text-center mt-6">
          Face labels are synced automatically and used to enhance video recognition
        </p>
      </main>
    </DashboardLayout>
  )
}
