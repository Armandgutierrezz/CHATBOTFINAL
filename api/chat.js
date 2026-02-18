export default async function handler(req, res) \{\
  if (req.method !== "POST") \{\
    return res.status(405).end();\
  \}\
\
  const \{ message \} = req.body;\
\
  const response = await fetch("https://api.openai.com/v1/responses", \{\
    method: "POST",\
    headers: \{\
      "Content-Type": "application/json",\
      Authorization: `Bearer $\{process.env.OPENAI_API_KEY\}`,\
    \},\
    body: JSON.stringify(\{\
      model: "gpt-5",\
      input: [\
        \{\
          role: "system",\
          content: "You are Rushy, the assistant of Rush Studio."\
        \},\
        \{\
          role: "user",\
          content: message\
        \}\
      ]\
    \}),\
  \});\
\
  const data = await response.json();\
\
  res.status(200).json(\{\
    reply: data.output_text || "No response"\
  \});\
\}\
}
