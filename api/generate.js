export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on server.' });

  const { topic, exam, subject, lang } = req.body;
  if (!topic || !exam || !subject || !lang) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const prompt = buildPrompt(topic, exam, subject, lang);

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 4096,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.json();
      return res.status(groqRes.status).json({ error: err.error?.message || 'Groq API error' });
    }

    const data = await groqRes.json();
    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ result: text });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function buildPrompt(topic, exam, subject, lang) {
  const langInstr = {
    English: 'Respond entirely in clear English.',
    Gujarati: 'સંપૂર્ણ જવાબ ગુજરાતી ભાષામાં આપો. Technical terms English ma rakhva.',
    Hindi: 'पूरा जवाब हिंदी में दें। Technical terms English में रखें।',
    Hinglish: 'Hinglish mein jawab do (Hindi + English mix). Easy aur conversational rakho.',
  }[lang] || 'Respond in English.';

  const examContext = {
    'NEET': 'NEET UG medical entrance exam level. Focus on NCERT-based deep concepts, diagram descriptions, important definitions, previous year question patterns.',
    'JEE': 'JEE Main & Advanced level. Include derivations, problem-solving approaches, key formulas.',
    'GUJCET': 'GUJCET exam level, Gujarat state syllabus. Follow GSEB curriculum.',
    'Board (Gujarat)': 'Gujarat Board (GSEB) Class 11-12 level. Simple, clear explanation aligned with Gujarat textbook.',
    'Board (CBSE)': 'CBSE Board Class 11-12 level. NCERT-aligned explanation.',
    'UPSC': 'UPSC Civil Services exam level. Include current relevance, static GK, previous year question types.',
    'GPSC': 'GPSC Gujarat Public Service Commission level. Gujarat-specific context where relevant.',
    'SSC': 'SSC CGL/CHSL level. Focus on basics, quick revision points.',
    'General Knowledge': 'General knowledge level. Broad overview with interesting facts.',
  }[exam] || 'Standard competitive exam level.';

  return `You are an expert ${subject} teacher and exam coach. A student is preparing for ${exam}.

${langInstr}

EXAM CONTEXT: ${examContext}

TOPIC: "${topic}"

Generate a COMPREHENSIVE study resource with these EXACT sections:

## 📚 DEEP NOTES
Provide thorough, exam-focused explanation of the topic:
- Core concepts with clear definitions
- Mechanisms/processes explained step by step
- Important diagrams described in text
- Key formulas/equations (if applicable)
- Exceptions and special cases
- Comparison tables (if applicable)
- Examples and applications

## ⭐ IMPORTANT POINTS (Exam ke liye must-know)
Bullet list of 12-18 most important facts/points that are frequently asked in ${exam}. Each point should be concise and exam-ready.

## 🚀 SHORT NOTES (Quick Revision)
Ultra-condensed version — 8-12 one-liner or two-liner points for last-minute revision before exam.

## 🎯 EXAM TIPS (${exam} Specific)
- 3-5 points on how this topic is tested in ${exam}
- Common mistakes to avoid
- Memory tricks or mnemonics if helpful
- Expected question types

Format your response with clear headings using ## and ###. Use **bold** for key terms. Use tables where comparisons are needed.`;
}
