import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

// URL da API de destino
const target = "https://api.hinova.com.br/api/sga/v2";

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
      // Repassa todos os headers originais da requisição
      Object.keys(req.headers).forEach((key) => {
        proxyReq.setHeader(key, req.headers[key]);
      });
    },
  })
);

// Sobe servidor na porta 8080
app.listen(8080, () => {
  console.log("Proxy rodando em http://localhost:8080");
});