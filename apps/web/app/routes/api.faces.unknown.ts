import { getAllUnknownFaces } from "../../../background-jobs/src/services/faces"

export async function loader() {
  const faces = await getAllUnknownFaces()

  return faces
}
