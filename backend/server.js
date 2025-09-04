import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { MercadoPagoConfig, Payment } from "mercadopago";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  // Banco de dados SQLite (arquivo será criado se não existir)
  const db = await open({
    filename: "./banco/corrida.db",
    driver: sqlite3.Database
  });

  // Cria tabela se não existir
  await db.exec(`CREATE TABLE IF NOT EXISTS inscricoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    telefone TEXT,
    cpf TEXT,
    email TEXT,
    status TEXT
  )`);

  // Mercado Pago
  const client = new MercadoPagoConfig({ accessToken: process.env.ACCESS_TOKEN });
  const payment = new Payment(client);

  const app = express();
  app.use(cors());               // libera acesso do front
  app.use(bodyParser.json());    // parse de JSON

  // Criar pagamento Pix
  app.post("/criar-pagamento", async (req, res) => {
    try {
      const { nome, telefone, cpf, email } = req.body;

      const pagamento = await payment.create({
        body: {
          transaction_amount: 12.0,
          description: "Inscrição Corrida",
          payment_method_id: "pix",
          payer: {
            email: email,
            first_name: nome,
            identification: {
              type: "CPF",
              number: cpf
            }
          }
        }
      });

      // Salva inscrição como "pendente"
      await db.run(
        "INSERT INTO inscricoes (nome, telefone, cpf, email, status) VALUES (?, ?, ?, ?, ?)",
        [nome, telefone, cpf, email, "pendente"]
      );

      // Retorna dados do QR Code (o front usa qr_code_base64 e qr_code)
      res.json(pagamento.point_of_interaction.transaction_data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ erro: "Falha ao criar pagamento" });
    }
  });

  // Webhook para Mercado Pago
  app.post("/webhook", async (req, res) => {
    try {
      console.log("Webhook recebido:", req.body);
      // Se quiser depois: checar req.body.type === 'payment' e consultar o pagamento
      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
}

startServer();
