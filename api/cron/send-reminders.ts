export default async function handler(
  req: { method?: string; headers: { authorization?: string } },
  res: {
    status: (code: number) => { end: () => void; send: (body: string) => void }
  },
) {
  const method = (req.method ?? 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'POST') {
    res.status(405).end()
    return
  }

  const auth = req.headers.authorization ?? ''
  const expected = process.env.CRON_SECRET
  if (!expected || auth !== `Bearer ${expected}`) {
    res.status(401).end()
    return
  }

  const baseUrl =
    process.env.SUPABASE_FUNCTIONS_URL ??
    (process.env.SUPABASE_URL
      ? `${process.env.SUPABASE_URL}/functions/v1`
      : '')

  if (!baseUrl) {
    res.status(500).send('SUPABASE_URL is not configured')
    return
  }

  const reminderSecret = process.env.REMINDERS_CRON_SECRET ?? ''

  try {
    const upstream = await fetch(
      `${baseUrl.replace(/\/$/, '')}/send-reminders`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${reminderSecret}`,
          'Content-Type': 'application/json',
        },
      },
    )
    const body = await upstream.text()
    res.status(upstream.status).send(body)
  } catch (err) {
    console.error('Failed to trigger send-reminders:', err)
    res.status(500).send('Failed to trigger reminders')
  }
}
