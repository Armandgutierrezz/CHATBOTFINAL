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
        truncation: "auto",
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

    // ✅ EXTRACTOR UNIVERSAL GPT-5
    let text = ""

    function dig(obj) {
      if (!obj) return
      if (typeof obj === "string") text += obj + " "
      if (Array.isArray(obj)) obj.forEach(dig)
      if (typeof obj === "object") {
        if (obj.text) text += obj.text + " "
        if (obj.value) text += obj.value + " "
        if (obj.output_text) text += obj.output_text + " "
        if (obj.content) dig(obj.content)
        if (obj.parts) dig(obj.parts)
      }
    }

    if (data.output_text) {
      text = data.output_text
    } else {
      dig(data.output)
    }

    text = text.trim()

    if (!text) {
      text = "Perfecto, cuéntame un poco más para ayudarte mejor."
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
