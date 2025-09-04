import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import pkg from "pg";
import { MercadoPagoConfig, Payment } from "mercadopago";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Conexão com o Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // importante para o Render
  },
});

// Função assíncrona para iniciar o servidor
const startServer = async () => {
  try {
    // Criar tabela se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inscricoes (
        id SERIAL PRIMARY KEY,
        nome TEXT,
        telefone TEXT,
        cpf TEXT,
        email TEXT,
        status TEXT
      )
    `);

    // Mercado Pago
    const client = new MercadoPagoConfig({ accessToken: process.env.ACCESS_TOKEN });
    const payment = new Payment(client);

    // Rota de teste
    app.get("/", (req, res) => {
        res.send("Back-end rodando normalmente ✅");
    });


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

        // Salva inscrição como "pendente" no Postgres
        await pool.query(
          "INSERT INTO inscricoes (nome, telefone, cpf, email, status) VALUES ($1, $2, $3, $4, $5)",
          [nome, telefone, cpf, email, "pendente"]
        );

        // Retorna dados do QR Code
        res.json(pagamento.point_of_interaction.transaction_data);
      } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "Falha ao criar pagamento" });
      }
    });

    // Webhook para atualizar status do pagamento
    app.post("/webhook", async (req, res) => {
      try {
        console.log("Webhook recebido:", req.body);
        const { data, type } = req.body;
        if (type === "payment") {
          // Aqui você vai pegar dados do pagamento no Mercado Pago
          // Exemplo: atualizar status pelo CPF
          const cpfDoPagamento = "CPF_DO_PAGAMENTO"; // substituir pela lógica real
          const status = "aprovado"; // substituir pelo status real do pagamento

          await pool.query(
            "UPDATE inscricoes SET status = $1 WHERE cpf = $2",
            [status, cpfDoPagamento]
          );
        }
        res.sendStatus(200);
      } catch (err) {
        console.error(err);
        res.sendStatus(500);
      }
    });

    // Porta dinâmica para Render
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
    
  } catch (err) {
    console.error("Erro ao iniciar servidor:", err);
  }
};

// Inicia o servidor
startServer();
