const ENDPOINT = 'https://api.worldlabs.ai/marble/v1'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const apiKey = process.env.WORLD_LABS_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'WORLD_LABS_API_KEY is not configured' })
  const worldId = String(req.query?.id || '').trim()
  if (!worldId) return res.status(400).json({ error: 'Missing World Labs world id' })
  try {
    const response = await fetch(`${ENDPOINT}/worlds/${encodeURIComponent(worldId)}`, {
      headers: { 'WLT-Api-Key': apiKey, 'Content-Type': 'application/json' },
    })
    const data = await response.json()
    if (!response.ok) return res.status(response.status).json({ error: data?.message || data?.error || 'World Labs world lookup failed', details: data })
    return res.status(200).json(data)
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'World Labs request failed' })
  }
}
