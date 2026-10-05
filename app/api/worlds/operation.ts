export const config = { runtime: 'nodejs' }

const ENDPOINT = 'https://api.worldlabs.ai/marble/v1'

export default async function handler(req: any, res: any) {
  const apiKey = process.env.WORLD_LABS_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'WORLD_LABS_API_KEY is not configured on Vercel' })
  const id = String(req.query?.id || '')
  if (!id) return res.status(400).json({ error: 'Operation id is required' })
  try {
    const upstream = await fetch(`${ENDPOINT}/operations/${encodeURIComponent(id)}`, { headers: { 'WLT-Api-Key': apiKey } })
    const body = await upstream.json().catch(() => ({}))
    if (!upstream.ok) return res.status(upstream.status).json({ error: body?.message || `World Labs poll failed (${upstream.status})`, details: body })
    return res.status(200).json(body)
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Polling failed' })
  }
}
