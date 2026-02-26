const BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`

const HEADERS = {
  Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
  "Content-Type": "application/json",
}

// Crea un nuevo registro y devuelve el recordId
export async function createLeadInAirtable(fields) {
  const body = { fields: buildFields(fields) }

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  })

  const result = await response.json()

  if (!response.ok) {
    console.error("Airtable create error:", JSON.stringify(result))
    throw new Error(`Airtable error: ${JSON.stringify(result)}`)
  }

  console.log("Airtable created:", result.id)
  return result.id
}

// Actualiza un registro existente por recordId
export async function updateLeadInAirtable(recordId, fields) {
  const body = { fields: buildFields(fields) }

  const response = await fetch(`${BASE_URL}/${recordId}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify(body),
  })

  const result = await response.json()

  if (!response.ok) {
    console.error("Airtable update error:", JSON.stringify(result))
    throw new Error(`Airtable error: ${JSON.stringify(result)}`)
  }

  console.log("Airtable updated:", result.id)
  return result.id
}

function buildFields(fields) {
  const out = {}
  if (fields.name)         out["Nombre"] = fields.name
  if (fields.email)        out["Correo electrónico"] = fields.email
  if (fields.whatsapp)     out["WhatsApp"] = fields.whatsapp
  if (fields.need)         out["Necesidad"] = fields.need
  if (fields.service)      out["Servicio"] = fields.service
  if (fields.conversation) out["Conversación"] = fields.conversation
  return out
}
