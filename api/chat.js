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
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: RUSH_CONTEXT }]
          },
          ...messages.map(m => ({
            role: m.role,
            content: [{ type: "input_text", text: m.content }]
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

    // 🔥 extracción robusta compatible con GPT-5
    let text = ""

    if (data.output_text) {
      text = data.output_text
    }

    if (!text && Array.isArray(data.output)) {
      text = data.output
        .flatMap(o => o.content || [])
        .map(c => c.text || c.value || "")
        .join("")
    }

    if (!text) {
      text = "Ups, no pude responder bien. Escríbeme otra vez."
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
