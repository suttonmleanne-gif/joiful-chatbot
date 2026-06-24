export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { transcript } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `You are a lead summarization assistant for JoiFul Services, a property services company in Atlanta. 

Your job is to read a chatbot conversation transcript and extract a clean, actionable lead summary for the business owners Omar and LaTanya.

Return ONLY a JSON object with these fields, nothing else, no markdown, no explanation:
{
  "name": "customer full name or Unknown",
"phone": "phone number or email address provided as contact, or Unknown. The contact info may be referred to as contact, number, email, text me at, reach me at, or call me at. Extract whichever one was provided",
  "contact_preference": "how they want to be reached (text, call, email) or Unknown",
  "service_needed": "what service or property help they need",
  "property_details": "any details about their property, location, number of units, etc or Unknown",
  "urgency": "any sense of timeline or urgency mentioned or Unknown",
  "summary": "2-3 sentence plain English briefing Omar and LaTanya can read in 10 seconds to know exactly who this is and what they need"
}`,
        messages: [
          {
            role: 'user',
            content: `Please summarize this chatbot conversation into a lead briefing:\n\n${transcript}`
          }
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', JSON.stringify(data));
      return res.status(500).json({ error: 'API error', detail: data });
    }

    const raw = data.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = { summary: raw };
    }

    return res.status(200).json({ lead: parsed });

  } catch (err) {
    console.error('Summary handler error:', err.message);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
