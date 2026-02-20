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
        max_output_tokens: 300,
        truncation: "auto",

        // ✅ FORMATO CORRECTO GPT-5
        input: [
          {
            role: "system",
            content: RUSH_CONTEXT
          },
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

    // ✅ EXTRACTOR GPT-5 ULTRA ROBUSTO
    let text = ""

    if (typeof data.output_text === "string" && data.output_text.trim()) {
      text = data.output_text.trim()
    }

    if (!text && Array.isArray(data.output)) {
      const chunks = []

      for (const item of data.output) {
        if (!item?.content) continue

        for (const c of item.content) {
          if (typeof c?.text === "string") chunks.push(c.text)
          if (typeof c?.value === "string") chunks.push(c.value)
          if (typeof c?.content === "string") chunks.push(c.content)
        }
      }

      text = chunks.join("").trim()
    }

    if (!text) {
      text = "Perfecto. Cuéntame un poco más y te ayudo."
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
