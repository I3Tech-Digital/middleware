import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

// URL da API de destino
const target = "https://api.hinova.com.br/api/sga/v2";

// Middleware de logging para requisições
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const { method, url, headers } = req;
  const userAgent = headers['user-agent'] || 'Unknown';
  const authorization = headers['authorization'] ? 'Bearer ***' : 'No auth';
  
  console.log(`[${timestamp}] ${method} ${url}`);
  console.log(`  User-Agent: ${userAgent}`);
  console.log(`  Authorization: ${authorization}`);
  console.log(`  IP: ${req.ip || req.connection.remoteAddress}`);
  
  // Log response time
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`  Response: ${res.statusCode} (${duration}ms)`);
    console.log('---');
  });
  
  next();
});

// Middleware que repassa tudo que vier para a API, incluindo headers (Bearer, etc)
app.use(
  "/",
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: {
      "^/": "/", // mantém o mesmo path
    },
    onProxyReq: (proxyReq, req, res) => {
      // Log da requisição sendo enviada para o proxy
      console.log(`  Proxying to: ${target}${req.url}`);
      
      // Repassa todos os headers originais da requisição
      Object.keys(req.headers).forEach((key) => {
        proxyReq.setHeader(key, req.headers[key]);
      });
    },
    onError: (err, req, res) => {
      console.error(`  Proxy Error: ${err.message}`);
    }
  })
);

// Sobe servidor na porta 8080
app.listen(8080, () => {
  console.log("Proxy rodando em http://localhost:8080");
});