import { RUSH_CONTEXT } from "./rush-context.js"

export default async function handler(req, res) {
  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  try {
    const body = req.body || {}
    const message = body.message || "Hello"

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5",
        max_output_tokens: 120,
        temperature: 0.6,
        input: [
          { role: "system", content: RUSH_CONTEXT },
          { role: "user", content: message },
        ],
      }),
    })

    const data = await response.json()

    // Si OpenAI devuelve error, lo exponemos (para debug)
    if (!response.ok) {
      return res.status(500).json({
        error: "OpenAI error",
        details: data?.error?.message || data,
      })
    }

    // ✅ Extraer texto correctamente (Responses API)
    const messageItem = data?.output?.find((o) => o.type === "message")
    const text =
      messageItem?.content?.find((c) => c.type === "output_text")?.text ||
      data?.output_text

    return res.status(200).json({
      reply: text || "Hola, soy Rushy. ¿En qué puedo ayudarte?",
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: "Server error", details: error.message })
  }
}
