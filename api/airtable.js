export async function saveLeadToAirtable(lead) {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`

  await fetch(url, {
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
}
