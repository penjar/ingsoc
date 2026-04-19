const http = require('http');
const fs = require('fs'); // Importar modulo para manejar archivos
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args)); // Importar node-fetch v3

// Funcion para generar respuesta usando la API de Google
async function generateAIResponse(topic) {
  try {
    const apiKey = (process.env.API_KEY || '').trim(); // Leer la clave de la API desde una variable de entorno

    // Verificar si la clave de la API está presente
    if (!apiKey) {
      console.error("Falta la API Key en el servidor.");
      throw new Error("Falta la API Key en el servidor");
    }

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Explica de forma breve, clara y educativa el uso de la inteligencia artificial en ${topic}, dentro del contexto de las TIC.`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Error en la API de Google: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Respuesta completa de la API:', data); // Registrar la respuesta completa
    console.log('Contenido de candidates[0].content:', data.candidates?.[0]?.content); // Registrar el contenido de candidates[0].content

    // Ajustar para extraer el texto generado desde parts[0].text
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar una respuesta.';

    return generatedText;
  } catch (error) {
    console.error('Error al conectar con la API de Google:', error.message);
    console.error('Detalles del error:', error);
    throw new Error('No se pudo conectar con la API de Google.');
  }
}

// Crear el servidor HTTP
const server = http.createServer(async (req, res) => {
  // Configurar cabeceras completas para CORS
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Configurar cabeceras para CORS y JSON
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST' && req.url === '/generate') {
    let body = '';

    // Leer los datos enviados en la solicitud
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const parsedBody = JSON.parse(body);
        const { topic } = parsedBody;

        // Validar el tema recibido
        if (!topic || topic.trim() === '') {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'El tema es obligatorio.' }));
          return;
        }

        // Generar la respuesta simulada de IA
        const aiResponse = await generateAIResponse(topic);
        res.statusCode = 200;
        res.end(JSON.stringify({ response: aiResponse }));
      } catch (error) {
        console.error('Error al procesar la solicitud:', error.message);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Error interno del servidor.', details: error.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/') {
    // Leer el archivo index.html
    fs.readFile('index.html', (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Error al cargar el archivo index.html');
        console.error('Error al leer index.html:', err.message);
        return;
      }

      // Enviar el contenido del archivo HTML
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(data);
    });
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Ruta no encontrada.' }));
  }
});

// Iniciar el servidor
const PORT =  process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

// Nota: La clave de API se gestiona de forma local mediante google-credentials.json para evitar su exposición en el cliente.

// Comentario: Este servidor maneja solicitudes para generar explicaciones sobre temas de TIC usando la API de Google Generative Language.
// Se pueden añadir más rutas o funcionalidades según sea necesario.