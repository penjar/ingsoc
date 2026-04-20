const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { topic } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return res.status(400).json({ error: 'El tema es obligatorio.' });
    }

    const rawKey = process.env.API_KEY || "";
    const apiKey = rawKey.trim();

    if (!apiKey) {
      return res.status(500).json({ error: "La variable API_KEY no está configurada o está vacía." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel(
      {
        model: "gemini-3-flash-preview",
        systemInstruction: "Eres un experto en TIC de nivel ingeniería. Tu objetivo es dar respuestas densas, técnicas y útiles.\n\nREGLAS ESTRICTAS:\n1. Nivel universitario: vocabulario técnico pero claro.\n2. Cero paja: ni saludos, ni introducciones, ni conclusiones de relleno.\n3. Brevedad controlada: 'poco texto, mucha info'.\n4. Si el tema NO tiene que ver con TIC, indica amablemente que tu función principal es asistir con TIC y detente."
      },
      { apiVersion: "v1alpha" }
    );
    const prompt = `Tema: "${topic}"\n\nGenera tu respuesta ESTRICTAMENTE siguiendo este formato fijo (no añadas NADA más):\n\n1. [Concepto clave 1]\n   [Explicación breve y técnica que aporte valor]\n   [Ejemplo práctico de aplicación real]\n\n2. [Concepto clave 2]\n   [Explicación breve y técnica que aporte valor]\n   [Ejemplo práctico de aplicación real]\n\n3. [Concepto clave 3]\n   [Explicación breve y técnica que aporte valor]\n   [Ejemplo práctico de aplicación real]`;

    let result;
    let retries = 3;
    while (retries > 0) {
      try {
        result = await model.generateContentStream(prompt);
        break;
      } catch (error) {
        if (error.message.includes('503') && retries > 1) {
          console.warn(`Error 503 de Google. Reintentando... (Intentos restantes: ${retries - 1})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          retries--;
        } else {
          throw error;
        }
      }
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(chunkText);
    }

    res.end();

  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    if (res.headersSent) {
      res.write(`\n\n**Error durante la generación:** ${error.message}`);
      res.end();
    } else {
      const errorMessage = error.message || String(error);
      const errorDetails = error.stack || '';
      return res.status(500).json({ error: errorMessage, details: errorDetails });
    }
  }
};
