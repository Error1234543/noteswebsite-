export default async function handler(req, res) {
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

  const { systemPrompt, userPrompt } = buildPrompt(topic, exam, subject, lang);

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
   model: 'llama-3.1-8b-instant',
        max_tokens: 4096,
        temperature: 0.65,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   }
        ]
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

  // ── SYSTEM PROMPT (language locked here) ──────────────────────────
  const systemPrompts = {
    English: `You are an expert ${subject} teacher specializing in ${exam} exam preparation.
You MUST write your ENTIRE response in English only.
Use clear, structured English throughout — headings, explanations, bullet points, everything.`,

    Gujarati: `તમે ${subject} વિષયના નિષ્ણાત શિક્ષક છો જે ${exam} પરીક્ષાની તૈયારી કરાવો છો.
તમારે સમગ્ર જવાબ શુદ્ધ ગુજરાતી ભાષામાં લખવાનો છે.
બધા headings, explanations, bullet points — બધું જ ગુજરાતીમાં હોવું જોઈએ.
ફક્ત scientific/technical terms (જેમ કે: DNA, ATP, Mitosis, Newton, etc.) અંગ્રેજીમાં રાખો, બાકી બધું ગુજરાતીમાં.
ગુજરાતી સ્ક્રિપ્ટ (દેવનાગરી નહીં) વાપરો. ઉદાહરણ: "કોષ" not "cell" for common words.`,

    Hindi: `आप ${subject} विषय के विशेषज्ञ शिक्षक हैं जो ${exam} परीक्षा की तैयारी कराते हैं।
आपको पूरा जवाब शुद्ध हिंदी में लिखना है।
सभी headings, explanations, bullet points — सब कुछ हिंदी में होना चाहिए।
केवल scientific/technical terms (जैसे: DNA, ATP, Mitosis) अंग्रेजी में रखें, बाकी सब हिंदी में।`,

    Hinglish: `You are an expert ${subject} teacher preparing students for ${exam}.
Write in a friendly Hinglish style — mix Hindi and English naturally, like a coaching teacher talks.
Example: "Cell cycle mein 4 phases hote hain — yeh samajhna bahut important hai NEET ke liye."
Keep it conversational, easy to understand, and exam-focused.`,
  };

  const systemPrompt = systemPrompts[lang] || systemPrompts.English;

  // ── EXAM CONTEXT ──────────────────────────────────────────────────
  const examContext = {
    'NEET':            'NEET UG level — NCERT-based, focus on definitions, diagrams, processes, MCQ-type important points.',
    'JEE':             'JEE Main & Advanced level — derivations, problem-solving, key formulas, numerical concepts.',
    'GUJCET':          'GUJCET level — Gujarat state syllabus (GSEB), standard 11-12 curriculum.',
    'Board (Gujarat)': 'Gujarat Board (GSEB) Class 11-12 — simple clear explanation per Gujarat textbook.',
    'Board (CBSE)':    'CBSE Board Class 11-12 — NCERT-aligned, board exam pattern.',
    'UPSC':            'UPSC Civil Services — static GK, current relevance, previous year question patterns.',
    'GPSC':            'GPSC Gujarat PSC level — Gujarat-specific context, state-level syllabus.',
    'SSC':             'SSC CGL/CHSL level — basics, quick points, general awareness focus.',
    'General Knowledge':'General knowledge — broad overview, interesting facts, easy language.',
  }[exam] || 'Standard competitive exam level.';

  // ── SECTION HEADERS per language ─────────────────────────────────
  const sections = {
    English: {
      deep:  '## 📚 DEEP NOTES',
      imp:   '## ⭐ IMPORTANT POINTS (Exam ke liye must-know)',
      short: '## 🚀 SHORT NOTES (Quick Revision)',
      tips:  `## 🎯 EXAM TIPS (${exam} Specific)`,
    },
    Gujarati: {
      deep:  '## 📚 DEEP NOTES',
      imp:   '## ⭐ IMPORTANT POINTS (પરીક્ષા માટે જરૂરી)',
      short: '## 🚀 SHORT NOTES (ઝડપી રિવિઝન)',
      tips:  `## 🎯 EXAM TIPS (${exam} માટે)`,
    },
    Hindi: {
      deep:  '## 📚 DEEP NOTES',
      imp:   '## ⭐ IMPORTANT POINTS (परीक्षा के लिए जरूरी)',
      short: '## 🚀 SHORT NOTES (Quick Revision)',
      tips:  `## 🎯 EXAM TIPS (${exam} के लिए)`,
    },
    Hinglish: {
      deep:  '## 📚 DEEP NOTES',
      imp:   '## ⭐ IMPORTANT POINTS (Exam ke liye must-know)',
      short: '## 🚀 SHORT NOTES (Last minute revision)',
      tips:  `## 🎯 EXAM TIPS (${exam} ke liye)`,
    },
  }[lang] || {
    deep:  '## 📚 DEEP NOTES',
    imp:   '## ⭐ IMPORTANT POINTS',
    short: '## 🚀 SHORT NOTES',
    tips:  '## 🎯 EXAM TIPS',
  };

  // ── USER PROMPT ───────────────────────────────────────────────────
  const userPrompt = `EXAM: ${exam}
SUBJECT: ${subject}
TOPIC: "${topic}"
EXAM CONTEXT: ${examContext}

Generate a COMPLETE study resource with these EXACT 4 sections in order:

${sections.deep}
- Topic ki complete explanation with core concepts and definitions
- Step-by-step mechanisms or processes
- Important diagrams described in text
- Key formulas or equations (if applicable)
- Exceptions and special cases
- Comparison tables where helpful
- Real examples and applications

${sections.imp}
Write 12-18 bullet points of the most important exam-ready facts for ${exam}. Each point must be concise and directly useful for MCQs or short answers.

${sections.short}
Write 8-12 ultra-short one-liner or two-liner points for last-minute revision only.

${sections.tips}
- How is this topic tested in ${exam}?
- Common mistakes students make
- Memory tricks or mnemonics
- Expected question types

IMPORTANT: Use ## and ### for headings. Use **bold** for key terms. Use tables for comparisons.`;

  return { systemPrompt, userPrompt };
}
