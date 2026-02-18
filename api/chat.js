import { RUSH_CONTEXT } from "./rush-context.js"

export default async function handler(req, res) {

  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }

    const body = req.body || {}
    const message = body.message || "Hello"

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5",
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

  console.log("OPENAI RESPONSE:", JSON.stringify(data, null, 2))


    // ✅ EXTRAER TEXTO CORRECTO (TODAS LAS VERSIONES)
    const text =
      data?.output_text ||
      data?.output?.find(o => o.type === "message")?.content?.[0]?.text ||
      "Hola, soy Rushy. ¿En qué puedo ayudarte?"

    return res.status(200).json({
      reply: text
    })

  } catch (error) {
    console.error(error)
    return res.status(500).json({
      error: "Server error",
      details: error.message
    })
  }
}
