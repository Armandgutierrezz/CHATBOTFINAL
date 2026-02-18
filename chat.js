{\rtf1\ansi\ansicpg1252\cocoartf2865
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 export default async function handler(req, res) \{\
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