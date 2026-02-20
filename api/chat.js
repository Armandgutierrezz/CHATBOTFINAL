import { RUSH_CONTEXT } from "./rush-context.js"

export default async function handler(req, res) {

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {

    const body = req.body || {}
    const messages = body.messages || []

    // 🔥 LLAMADA A OPENAI
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5",
        max_output_tokens: 1500,
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

    const data = await openaiResponse.json()

    // 🔴 ERROR OPENAI
    if (!openaiResponse.ok) {
      return res.status(500).json({
        error: "OpenAI error",
        details: data?.error?.message || data
      })
    }

    // ====================================================
    // 🔥 EXTRACTOR LIMPIO SOLO TEXTO DEL ASSISTANT
    // ====================================================

    let text = ""

    // 1️⃣ campo directo (cuando existe)
    if (typeof data.output_text === "string") {
      text = data.output_text
    }

    // 2️⃣ buscar dentro de output messages
    if (!text && Array.isArray(data.output)) {
      for (const item of data.output) {

        if (item.type === "message" && Array.isArray(item.content)) {

          for (const part of item.content) {

            if (part.type === "output_text" && part.text) {
              text += part.text + " "
            }

            // soporte alternativo (algunos deployments)
            if (part.type === "text" && part.text) {
              text += part.text + " "
            }

            if (part.type === "text" && part.value) {
              text += part.value + " "
            }
          }
        }
      }
    }

    text = text.trim()

    // 🔴 fallback solo si no hay nada
    if (!text) {
      text = "Ups, algo raro pasó. Escríbeme otra vez."
    }

    // ====================================================

    return res.status(200).json({ reply: text })

  } catch (error) {
    console.error(error)

    return res.status(500).json({
      error: "Server error",
      details: error.message
    })
  }
}
