import { RUSH_CONTEXT } from "./rush-context.js"
import { createLeadInAirtable, updateLeadInAirtable } from "./airtable.js"

export default async function handler(req, res) {

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  try {
    const body = req.body || {}
    const messages = body.messages || []
    const recordId = body.recordId || null

    // ====================================================
    // 🧠 EXTRAER EMAIL Y WHATSAPP (regex)
    // ====================================================

    let email = ""
    let whatsapp = ""

    const conversation = messages
      .map(m => `${m.role}: ${m.content}`)
      .join("\n")

    for (const m of messages) {
      if (!email) {
        const match = m.content.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)
        if (match) email = match[0]
      }
    }

    for (const m of messages) {
      if (!whatsapp) {
        const match = m.content.match(/\+?\d{7,15}/)
        if (match) whatsapp = match[0]
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
        max_output_tokens: 1000,
        input: [
          { role: "system", content: RUSH_CONTEXT },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ]
      })
    })

    const data = await openaiResponse.json()

    if (!openaiResponse.ok) {
      return res.status(500).json({ error: "OpenAI error", details: data?.error?.message || data })
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
            if (part.text) text += part.text + " "
            if (part.value) text += part.value + " "
          }
        }
      }
    }

    text = text.trim() || "Ups, algo raro pasó. Escríbeme otra vez."

    // ====================================================
    // 🤖 EXTRAER NOMBRE, NECESIDAD Y SERVICIO CON IA
    // Siempre que haya al menos 1 mensaje
    // ====================================================

    let name = ""
    let need = ""
    let service = ""

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
              content: `Eres un extractor de datos de conversaciones de ventas. Analiza la conversación y devuelve SOLO un JSON válido sin backticks ni texto extra:
{"name": "nombre real de la persona si lo mencionó explícitamente (no saludos como 'hola'), si no vacío", "need": "problema o necesidad del negocio en 1 línea, si no hay info vacío", "service": "uno exacto de: Automatización, Desarrollo web, Dashboard, Chatbot, Personalizado. Si no hay info vacío"}`
            },
            { role: "user", content: conversation }
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
              if (part.value) extractText += part.value
            }
          }
        }
      }

      extractText = extractText.replace(/```json|```/g, "").trim()
      const parsed = JSON.parse(extractText)
      name = parsed.name || ""
      need = parsed.need || ""
      service = parsed.service || ""

      console.log("Extracción IA:", { name, need, service })

    } catch (err) {
      console.error("Error extrayendo datos:", err.message)
    }

    // ====================================================
    // 🟢 GUARDAR / ACTUALIZAR EN AIRTABLE
    // - Crear cuando aparece el email por primera vez
    // - Actualizar en cada mensaje si ya existe el recordId
    // ====================================================

    let newRecordId = recordId
    const fields = { name, email, whatsapp, need, service, conversation }

    if (email) {
      console.log("Guardando en Airtable:", { name, email, whatsapp, need, service })
      try {
        if (recordId) {
          await updateLeadInAirtable(recordId, fields)
        } else {
          newRecordId = await createLeadInAirtable(fields)
        }
      } catch (err) {
        console.error("Error Airtable:", err.message)
      }
    } else if (recordId) {
      // Tiene recordId pero aún no email → igual actualiza lo que tenga (nombre, etc.)
      console.log("Actualizando sin email:", { name, need, service })
      try {
        await updateLeadInAirtable(recordId, fields)
      } catch (err) {
        console.error("Error Airtable update:", err.message)
      }
    }

    // ====================================================

    return res.status(200).json({
      reply: text,
      recordId: newRecordId
    })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: "Server error", details: error.message })
  }
}
