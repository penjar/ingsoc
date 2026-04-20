const http = require('http');
const fs = require('fs');
const path = require('path');
// Importamos el SDK oficial
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Configuración de la IA
// El SDK buscará la clave en la variable de entorno API_KEY
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

async function generateAIResponse(topic) {
  try {
    // 1. Limpiamos y capturamos la clave directamente
    const rawKey = process.env.API_KEY || "";
    const apiKey = rawKey.trim();

    if (!apiKey) {
      throw new Error("La variable API_KEY no está configurada o está vacía.");
    }

    // 2. Inicializamos el SDK dentro de la función con la clave específica
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
    const prompt = `Explica de forma breve, clara y educativa el uso de la inteligencia artificial en ${topic}, dentro del contexto de las TIC.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    throw error; 
  }
}

// Crear el servidor HTTP
const server = http.createServer(async (req, res) => {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Ruta para generar contenido
  if (req.method === 'POST' && req.url === '/generate') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });

    req.on('end', async () => {
      try {
        const { topic } = JSON.parse(body);

        if (!topic || topic.trim() === '') {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'El tema es obligatorio.' }));
        }

        const aiResponse = await generateAIResponse(topic);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ response: aiResponse }));
      } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        
        const errorMessage = error.message || String(error);
        const errorDetails = error.stack || '';
        
        res.end(JSON.stringify({ error: errorMessage, details: errorDetails }));
      }
    });
  } 
  // Ruta principal para servir el HTML
  else if (req.method === 'GET' && req.url === '/') {
    const indexPath = path.join(__dirname, 'index.html');
    fs.readFile(indexPath, (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.end('Error al cargar index.html');
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(data);
    });
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Ruta no encontrada.' }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});