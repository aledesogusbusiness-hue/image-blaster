export const config = { runtime: 'nodejs' }

const ENDPOINT = 'https://api.worldlabs.ai/marble/v1'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const apiKey = process.env.WORLD_LABS_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'WORLD_LABS_API_KEY is not configured on Vercel' })

  try {
    const { name = 'hometour-test', imageBase64, mimeType = 'image/jpeg', prompt = '' } = req.body || {}
    if (!imageBase64) return res.status(400).json({ error: 'Image is required' })
    const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
    const request = {
      display_name: name,
      model: 'marble-1.1',
      world_prompt: {
        type: 'image',
        image_prompt: { source: 'data_base64', data_base64: imageBase64, extension, mime_type: mimeType },
        ...(prompt ? { text_prompt: prompt } : {})
      }
    }
    const upstream = await fetch(`${ENDPOINT}/worlds:generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'WLT-Api-Key': apiKey },
      body: JSON.stringify(request)
    })
    const body = await upstream.json().catch(() => ({}))
    if (!upstream.ok) return res.status(upstream.status).json({ error: body?.message || `World Labs submit failed (${upstream.status})`, details: body })
    const operationId = String(body.operation_id || body.id || body.name || '').split('/').at(-1)
    if (!operationId) return res.status(502).json({ error: 'World Labs did not return an operation id', details: body })
    return res.status(200).json({ operationId })
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Generation failed' })
  }
}
