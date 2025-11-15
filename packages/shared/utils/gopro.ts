import goproTelemetry from 'gopro-telemetry'
import gpmfExtract from 'gpmf-extract'
import { readFileSync } from 'node:fs'
import { GoProMetadata } from '../types/gopro'

export async function getGoProVideoMetadata(videoFullPath: string) {
  return new Promise((res, _rej) => {
    const file = readFileSync(videoFullPath)
    gpmfExtract(file)
      .then((extracted) => {
        try {
          goproTelemetry(extracted, {}, (telemetry) => {
            res(telemetry)
          })
        } catch (err) {
          console.error(`Failed to extract GPMF from ${videoFullPath}`, err)
          res(null)
        }
      })
      .catch((err) => {
        console.error(`Failed to extract GPMF from ${videoFullPath}`, err)
        res(null)
      })
  })
}

export function getGoProDeviceName(metadata: GoProMetadata): string {
  for (const key in metadata) {
    if (metadata[key]?.['device name']) {
      return metadata[key]['device name']
    }
  }
  return 'Unknown GoPro Device'
}

export function extractGPS(metadata: GoProMetadata): { lat: number; lon: number; alt?: number }[] {
  const gpsData: { lat: number; lon: number; alt?: number }[] = []

  if (metadata.streams?.GPS5) {
    const gps5 = metadata.streams.GPS5

    gps5.samples.slice(0, 5).forEach((sample: any) => {
      if (Array.isArray(sample.value)) {
        const [lat, lon, alt] = sample.value
        gpsData.push({ lat, lon, alt })
      }
    })
  }

  return gpsData
}
