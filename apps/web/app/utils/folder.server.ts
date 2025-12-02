import fetch from 'node-fetch'

const API_URL = process.env.BACKGROUND_JOBS_URL

export async function triggerFolderQueue(folderPath: string) {
  try {
    const res = await fetch(`${API_URL}/folders/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath }),
    })

    const data = await res.json()
    if (!res.ok || !data.folder) {
      console.error('Failed to add folder:', data)
      return null
    }

    return data.folder
  } catch (err) {
    console.error('Error calling API:', err)
    return null
  }
}
