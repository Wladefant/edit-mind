import { getAllKnownFaces } from '@background-jobs/src/services/faces'

export async function loader() {
  const faces = await getAllKnownFaces()
  return { faces }
}
