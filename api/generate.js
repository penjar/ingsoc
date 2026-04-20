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
        systemInstruction: "Eres un asistente educativo experto en TIC. Tu objetivo es explicar conceptos técnicos con profundidad y detalle, pero manteniendo la claridad. Usa introducciones interesantes, desarrolla bien las ideas, y emplea analogías sencillas para conceptos complejos. Usa formato Markdown (encabezados, negritas, viñetas) para estructurar visualmente la información de forma impecable."
      },
      { apiVersion: "v1alpha" }
    );
    const prompt = `Actúa como un experto docente y genera una explicación exhaustiva y detallada sobre el siguiente tema de TIC: "${topic}".\n\nPor favor, estructura tu respuesta en las siguientes secciones detalladas:\n\n1. **Introducción y Concepto:** (Una definición clara y accesible, acompañada de una buena analogía).\n2. **¿Cómo funciona realmente?** (Profundiza en los detalles técnicos clave, piezas o conceptos fundamentales).\n3. **Aplicaciones y Casos de Uso:** (Ejemplos prácticos y reales donde se utiliza esta tecnología actualmente).\n4. **Impacto y Futuro:** (Por qué es crucial para el mundo digital y hacia dónde evoluciona).`;

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
