import worlds from 'virtual:worlds'
import { type World, type WorldEntry } from '../types/world'

export function loadWorlds(): WorldEntry[] {
  return worlds as WorldEntry[]
}

export async function fetchWorlds(): Promise<WorldEntry[]> {
  if (!import.meta.env.DEV) return loadWorlds()

  const response = await fetch('/__worlds', { cache: 'no-store' })
  if (!response.ok) throw new Error(await response.text())
  return response.json() as Promise<WorldEntry[]>
}

function worldAssetUrl(url: string | undefined): string {
  if (!url) return ''
  if (url.startsWith('/worlds/')) return url
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' ? url : ''
  } catch {
    return ''
  }
}

export function getSplatUrl(world: World): string {
  const urls = world.assets.splats.spz_urls
  return worldAssetUrl(urls.full_res) || worldAssetUrl(urls['500k']) || worldAssetUrl(urls['150k']) || worldAssetUrl(urls['100k'])
}
