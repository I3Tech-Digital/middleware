import express from "express";
import { exec } from "child_process";
import { promisify } from "util";

const app = express();
app.use(express.json());

// URL da API de destino
const target = "https://api.hinova.com.br";

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// Endpoint /healthy
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Middleware que faz a requisição para a Hinova, captura o retorno e responde ao cliente
app.use("/api/sga/v2", async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Requisição recebida: ${req.method} ${req.originalUrl}`);

    // Monta URL para Hinova
    const url = `${target}${req.originalUrl}`;

    // Configura headers - remove host para evitar conflito
    const headers = { ...req.headers };
    delete headers.host;
    
    // Garante que Content-Type está definido para requisições com body
    if (req.body && Object.keys(req.body).length > 0 && !headers['content-type'] && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Log da requisição completa para Hinova
    console.log(`[${new Date().toISOString()}] Enviando requisição para Hinova:`);
    console.log(`  URL: ${url}`);
    console.log(`  Método: ${req.method}`);
    console.log(`  Headers: ${JSON.stringify(headers, null, 2)}`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`  Body: ${JSON.stringify(req.body, null, 2)}`);
    } else {
      console.log(`  Body: vazio`);
    }

    // Constrói comando curl
    let curlCommand = `curl -s -i --location -X ${req.method}`;
    
    // Adiciona headers - escapa valores de header corretamente
    Object.entries(headers).forEach(([key, value]) => {
      // Escapa aspas duplas nos valores dos headers
      const escapedValue = String(value).replace(/"/g, '\\"');
      curlCommand += ` --header "${key}: ${escapedValue}"`;
    });

    // Adiciona body se existir
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      // Usa --data-raw para enviar dados exatamente como estão
      const escapedBody = bodyData.replace(/'/g, "'\"'\"'");
      curlCommand += ` --data-raw '${escapedBody}'`;
    }

    // Adiciona URL
    curlCommand += ` "${url}"`;

    console.log(`[${new Date().toISOString()}] Comando curl: ${curlCommand}`);

    // Executa curl
    const { stdout, stderr } = await execAsync(curlCommand);

    if (stderr) {
      console.error(`[${new Date().toISOString()}] Erro curl stderr: ${stderr}`);
    }

    // Parse da resposta curl (headers + body)
    const responseLines = stdout.split('\n');
    let headersParsed = false;
    let statusCode = 200;
    let responseHeaders = {};
    let bodyLines = [];

    for (let i = 0; i < responseLines.length; i++) {
      const line = responseLines[i];
      
      if (!headersParsed) {
        if (line.startsWith('HTTP/')) {
          // Extrai status code
          const statusMatch = line.match(/HTTP\/[\d.]+\s+(\d+)/);
          if (statusMatch) {
            statusCode = parseInt(statusMatch[1]);
          }
        } else if (line.includes(':')) {
          // Header
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          responseHeaders[key.trim()] = value;
        } else if (line.trim() === '') {
          // Linha vazia indica fim dos headers
          headersParsed = true;
        }
      } else {
        // Body
        bodyLines.push(line);
      }
    }

    const responseBody = bodyLines.join('\n').trim();

    // Log da resposta
    try {
      const parsedBody = JSON.parse(responseBody);
      console.log(`[${new Date().toISOString()}] Resposta da Hinova para ${req.method} ${req.originalUrl}:\n${JSON.stringify(parsedBody, null, 2)}`);
    } catch (e) {
      console.log(`[${new Date().toISOString()}] Resposta da Hinova para ${req.method} ${req.originalUrl}:\n${responseBody || '<vazio>'}`);
    }

    // Repassa status e headers ao cliente
    res.status(statusCode);
    Object.entries(responseHeaders).forEach(([key, value]) => {
      const low = key.toLowerCase();
      if (low === "transfer-encoding") return;
      if (low === "content-encoding") return; // evita problemas de dupla codificação
      res.setHeader(key, value);
    });

    // Envia o corpo da resposta
    res.send(responseBody);
  } catch (err) {
    console.error("Erro ao consultar Hinova:", err.message || err);
    res.status(500).json({ error: "Erro ao consultar Hinova" });
  }
});

// Sobe servidor na porta 8080
app.listen(8080, () => {
  console.log("Middleware rodando em http://localhost:8080");
});