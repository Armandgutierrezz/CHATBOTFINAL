export async function saveLeadToAirtable(lead) {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`

  console.log("Airtable URL:", url)

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        Nombre: lead.name || "",
        "Correo electrónico": lead.email || "",
        WhatsApp: lead.whatsapp || "",
        Necesidad: lead.need || "",
        Servicio: lead.service || "",
        Conversación: lead.conversation || ""
      }
    })
  })

  const result = await response.json()

  if (!response.ok) {
    console.error("Airtable error:", JSON.stringify(result))
    throw new Error(`Airtable error: ${JSON.stringify(result)}`)
  }

  console.log("Airtable success:", result.id)
  return result
}
