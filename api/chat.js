import { RUSH_CONTEXT } from "./rush-context.js"

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  try {

    const body = req.body || {}
    const messages = body.messages || []

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5",
        max_output_tokens: 400,
        input: [
          { role: "system", content: RUSH_CONTEXT },
          ...messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        ]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(500).json({
        error: "OpenAI error",
        details: data?.error?.message || data
      })
    }

    // 🔥 EXTRACTOR UNIVERSAL REAL
    let text = ""

    function dig(x) {
      if (!x) return

      if (typeof x === "string") {
        text += x + " "
        return
      }

      if (Array.isArray(x)) {
        x.forEach(dig)
        return
      }

      if (typeof x === "object") {
        for (const k in x) dig(x[k])
      }
    }

    // intenta output_text primero
    if (typeof data.output_text === "string") {
      text = data.output_text
    } else {
      dig(data.output)
    }

    text = text.trim()

    // solo fallback si no hay texto real
    if (!text || text.length < 3) {
      text = "Ups, algo raro pasó. Escríbeme otra vez."
    }

    return res.status(200).json({ reply: text })

  } catch (err) {
    console.error(err)
    return res.status(500).json({
      error: "Server error",
      details: err.message
    })
  }
}
