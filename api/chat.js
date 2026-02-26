import { RUSH_CONTEXT } from "./rush-context.js"
import { saveLeadToAirtable } from "./airtable.js"

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

    // ====================================================
    // 🧠 EXTRAER DATOS DEL LEAD
    // ====================================================

    let name = ""
    let email = ""
    let whatsapp = ""
    let need = ""
    let service = ""

    const conversation = messages
      .map(m => `${m.role}: ${m.content}`)
      .join("\n")

    // 📩 Email
    for (const m of messages) {
      if (!email) {
        const match = m.content.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)
        if (match) email = match[0]
      }
    }

    // 📱 WhatsApp
    for (const m of messages) {
      if (!whatsapp) {
        const match = m.content.match(/\+?\d{7,15}/)
        if (match) whatsapp = match[0]
      }
    }

    // 👤 Nombre
    const firstUser = messages.find(m => m.role === "user")
    if (firstUser) {
      const words = firstUser.content.split(" ")
      if (words.length <= 3) {
        name = firstUser.content
      }
    }

    // ====================================================
    // 🔥 LLAMADA A OPENAI (respuesta del chat)
    // ====================================================

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5",
        max_output_tokens: 2200,
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

    if (!openaiResponse.ok) {
      return res.status(500).json({
        error: "OpenAI error",
        details: data?.error?.message || data
      })
    }

    // ====================================================
    // ✨ EXTRAER RESPUESTA
    // ====================================================

    let text = ""

    if (typeof data.output_text === "string") {
      text = data.output_text
    }

    if (!text && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === "message" && Array.isArray(item.content)) {
          for (const part of item.content) {
            if (part.type === "output_text" && part.text) text += part.text + " "
            if (part.type === "text" && part.text) text += part.text + " "
            if (part.type === "text" && part.value) text += part.value + " "
          }
        }
      }
    }

    text = text.trim()

    if (!text) {
      text = "Ups, algo raro pasó. Escríbeme otra vez."
    }

    // ====================================================
    // 🟢 GUARDAR LEAD EN AIRTABLE
    // Solo cuando ya tengamos email + whatsapp (lead completo)
    // ====================================================

    if (email && whatsapp) {

      // 🤖 Extraer necesidad y servicio con IA
      try {
        const extractResponse = await fetch("https://api.openai.com/v1/responses", {
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
                content: `Eres un extractor de datos. Analiza la conversación y devuelve SOLO un JSON con este formato exacto, sin texto adicional ni backticks:
{"need": "descripción breve de la necesidad del cliente", "service": "uno de estos valores exactos: Automatización, Desarrollo web, Dashboard, Chatbot, Personalizado"}

Si no hay suficiente info para algún campo, déjalo como string vacío "".`
              },
              {
                role: "user",
                content: conversation
              }
            ]
          })
        })

        const extractData = await extractResponse.json()
        let extractText = ""

        if (typeof extractData.output_text === "string") {
          extractText = extractData.output_text
        }

        if (!extractText && Array.isArray(extractData.output)) {
          for (const item of extractData.output) {
            if (item.type === "message" && Array.isArray(item.content)) {
              for (const part of item.content) {
                if (part.text) extractText += part.text
              }
            }
          }
        }

        const parsed = JSON.parse(extractText.trim())
        need = parsed.need || ""
        service = parsed.service || ""

      } catch (extractError) {
        console.error("Error extrayendo need/service:", extractError.message)
      }

      // 💾 Guardar en Airtable
      console.log("Guardando lead:", { name, email, whatsapp, need, service })
      try {
        await saveLeadToAirtable({
          name,
          email,
          whatsapp,
          need,
          service,
          conversation
        })
      } catch (airtableError) {
        console.error("Error guardando en Airtable:", airtableError.message)
      }
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
