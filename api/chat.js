import { RUSH_CONTEXT } from "./rush-context.js"

export default async function handler(req, res) {

  // ✅ CORS
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
    const message = body.message || "Hello"

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1",   // 🔴 usa este por ahora (gpt-5 da problemas si no tienes acceso)
        max_output_tokens: 200,
        input: [
          {
            role: "system",
            content: [
              { type: "text", text: RUSH_CONTEXT }
            ]
          },
          {
            role: "user",
            content: [
              { type: "text", text: message }
            ]
          }
        ]
      })
    })

    const data = await openaiResponse.json()

    // 🔴 SI OPENAI FALLA, MOSTRAR ERROR REAL
    if (!openaiResponse.ok) {
      console.error("OpenAI error:", data)
      return res.status(500).json({
        error: "OpenAI error",
        details: data?.error?.message || data
      })
    }

    // ✅ EXTRAER TEXTO DE FORMA SEGURA
    const text =
      data?.output_text ||
      data?.output?.find(o => o.type === "message")?.content?.[0]?.text ||
      "Hola, soy Rushy. ¿Cómo puedo ayudarte?"

    return res.status(200).json({
      reply: text
    })

  } catch (error) {
    console.error("SERVER ERROR:", error)
    return res.status(500).json({
      error: "Server error",
      details: error.message
    })
  }
}
