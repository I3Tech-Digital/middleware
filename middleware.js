import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// URL da API de destino
const target = "https://api.hinova.com.br/api/sga/v2";

// Middleware que faz a requisição para a Hinova, captura o retorno e responde ao cliente
app.use("/", async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Requisição recebida: ${req.method} ${req.originalUrl}`);

    // Monta URL para Hinova
    const url = `${target}${req.originalUrl}`;

    // Configura headers - remove host para evitar conflito
    const headers = { ...req.headers };
    delete headers.host;

    const axiosConfig = {
      method: req.method,
      url,
      headers,
      data: req.body,
      responseType: "arraybuffer",
      validateStatus: () => true,
    };

    const response = await axios(axiosConfig);

    // Tenta interpretar o corpo como texto/JSON para log
    let loggedBody = response.data;
    try {
      const text = Buffer.from(response.data).toString();
      loggedBody = JSON.parse(text);
      console.log(`[${new Date().toISOString()}] Resposta da Hinova para ${req.method} ${req.originalUrl}:\n${JSON.stringify(loggedBody, null, 2)}`);
    } catch (e) {
      try {
        const text = Buffer.from(response.data).toString();
        console.log(`[${new Date().toISOString()}] Resposta da Hinova para ${req.method} ${req.originalUrl}:\n${text}`);
      } catch (e2) {
        console.log(`[${new Date().toISOString()}] Resposta da Hinova para ${req.method} ${req.originalUrl}: <binário>`);
      }
    }

    // Repassa status e headers ao cliente
    res.status(response.status);
    Object.entries(response.headers || {}).forEach(([key, value]) => {
      const low = key.toLowerCase();
      if (low === "transfer-encoding") return;
      if (low === "content-encoding") return; // evita problemas de dupla codificação
      res.setHeader(key, value);
    });

    // Envia o corpo tal como recebido
    res.send(Buffer.from(response.data));
  } catch (err) {
    console.error("Erro ao consultar Hinova:", err.message || err);
    res.status(500).json({ error: "Erro ao consultar Hinova" });
  }
});

// Sobe servidor na porta 8080
app.listen(8080, () => {
  console.log("Middleware rodando em http://localhost:8080");
});