import { useEffect, useRef, useState } from 'react'
import { WorldViewer } from './WorldViewer'
import type { World } from '../types/world'

type Result = any

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.readAsDataURL(file)
  })
}

const STORAGE_KEY = 'hometour-marble-last-result-v1'

export function GenerateWorldPanel() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [prompt, setPrompt] = useState('Preserve the architecture, proportions, materials and spatial layout of the reference image. Create a coherent navigable photorealistic world.')
  const [status, setStatus] = useState('Ready')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result>(null)
  const pollRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setResult(JSON.parse(saved))
        setStatus('Last generated world restored')
      }
    } catch { /* ignore stale local state */ }
    return () => window.clearTimeout(pollRef.current)
  }, [])

  async function poll(id: string) {
    const response = await fetch(`/api/worlds/operation?id=${encodeURIComponent(id)}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Polling failed')
    if (data.error) throw new Error(typeof data.error === 'string' ? data.error : 'World Labs generation failed')
    if (!data.done) {
      setStatus('Marble 1.1 is generating the world…')
      pollRef.current = window.setTimeout(() => void poll(id).catch(fail), 10000)
      return
    }
    const completed = data.response || data
    setResult(completed)
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(completed)) } catch { /* best effort */ }
    setStatus('World generated — opening viewer')
    setBusy(false)
  }

  function fail(error: any) {
    setStatus(error?.message || 'Generation failed')
    setBusy(false)
  }

  async function generate() {
    if (!file || busy) return
    setBusy(true); setResult(null); setStatus('Uploading image to Marble 1.1…')
    try {
      const imageBase64 = await readAsBase64(file)
      const response = await fetch('/api/worlds/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'hometour-villa-test', imageBase64, mimeType: file.type || 'image/jpeg', prompt })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Submit failed')
      setStatus('Generation submitted…')
      await poll(data.operationId)
    } catch (error) { fail(error) }
  }

  const assets = result?.assets || {}
  const remoteWorld: World | undefined = result?.assets ? {
    world_id: result.world_id || result.id || 'hometour-marble-test',
    display_name: result.display_name || 'HomeTour Marble Test',
    assets: {
      mesh: { collider_mesh_url: assets?.mesh?.collider_mesh_url || '' },
      imagery: { pano_url: assets?.imagery?.pano_url || '' },
      splats: {
        spz_urls: assets?.splats?.spz_urls || {},
        semantics_metadata: assets?.splats?.semantics_metadata || { metric_scale_factor: 1, ground_plane_offset: 0, flip_y: true },
      },
      thumbnail_url: assets?.thumbnail_url || '',
      caption: assets?.caption || '',
    },
    world_marble_url: result.world_marble_url || '',
    tags: result.tags || null,
    world_prompt: result.world_prompt || prompt,
    created_at: result.created_at || null,
    updated_at: result.updated_at || null,
  } : undefined

  if (remoteWorld && Object.values(remoteWorld.assets.splats.spz_urls).some(Boolean)) {
    return <div className="relative w-screen h-screen bg-black overflow-hidden">
      <WorldViewer world={remoteWorld} slug="hometour-marble-test" sourceImageUrl={preview || remoteWorld.assets.thumbnail_url} objectAssets={[]} allObjectAssets={[]} worldSfxUrls={[]} uiVisible={false} />
      <button onClick={() => { setResult(null); window.localStorage.removeItem(STORAGE_KEY) }} className="fixed top-4 left-4 z-50 rounded-xl bg-black/70 border border-white/20 px-4 py-2 text-sm text-white backdrop-blur">← New world</button>
      <div className="fixed top-4 right-4 z-50 rounded-xl bg-black/70 border border-white/20 px-3 py-2 text-xs text-white/70 backdrop-blur">SPZ + collider</div>
    </div>
  }

  const spz = assets?.splats?.spz_urls || {}
  const links = [
    ['Collider GLB', assets?.mesh?.collider_mesh_url],
    ['Panorama', assets?.imagery?.pano_url],
    ['Thumbnail', assets?.thumbnail_url],
    ...Object.entries(spz).map(([key, url]) => [`SPZ ${key}`, url])
  ].filter(([, url]) => Boolean(url)) as [string, string][]

  return <div className="min-h-screen bg-black text-white flex items-center justify-center p-5">
    <div className="w-full max-w-xl rounded-3xl border border-white/15 bg-white/[.04] p-6 shadow-2xl">
      <div className="text-xs tracking-[.25em] text-white/45 mb-3">HOMETOUR × IMAGE BLASTER</div>
      <h1 className="text-3xl font-semibold mb-2">Marble World Test</h1>
      <p className="text-white/55 mb-6">Upload one property image and generate the first navigable World Labs environment.</p>
      <label className="block rounded-2xl border border-dashed border-white/20 overflow-hidden cursor-pointer mb-4">
        {preview ? <img src={preview} className="w-full max-h-72 object-cover" /> : <div className="py-16 text-center text-white/50">Tap to choose the villa image</div>}
        <input className="hidden" type="file" accept="image/*" onChange={e => {
          const f=e.target.files?.[0] || null; setFile(f)
          if (preview) URL.revokeObjectURL(preview)
          setPreview(f ? URL.createObjectURL(f) : '')
        }} />
      </label>
      <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={4} className="w-full rounded-xl bg-white/[.06] border border-white/10 p-3 text-sm mb-4" />
      <button disabled={!file || busy} onClick={generate} className="w-full rounded-xl bg-white text-black py-3 font-semibold disabled:opacity-30">{busy ? 'Generating…' : 'Generate World'}</button>
      <div className="mt-4 text-sm text-white/60">{status}</div>
      {links.length > 0 && <div className="mt-5 space-y-2">{links.map(([label,url]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="block rounded-xl bg-white/[.06] px-4 py-3 hover:bg-white/10">{label} ↗</a>)}</div>}
    </div>
  </div>
}
