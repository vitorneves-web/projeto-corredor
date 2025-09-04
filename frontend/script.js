const BACKEND_URL = "https://projeto-corredor.onrender.com"; // depois troque para https://SEU_SERVICO.onrender.com

document.getElementById("form-checkout").addEventListener("submit", async (e) => {
  e.preventDefault();

  const dados = {
    nome: document.getElementById("nome").value,
    telefone: document.getElementById("telefone").value,
    cpf: document.getElementById("cpf").value,
    email: document.getElementById("email").value
  };

  try {
    const response = await fetch(`${BACKEND_URL}/criar-pagamento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });

    const result = await response.json();

    if (result.qr_code_base64) {
      document.getElementById("qrCodeContainer").style.display = "block";
      document.getElementById("qrCode").src = `data:image/jpeg;base64,${result.qr_code_base64}`;
      document.getElementById("pixCode").value = result.qr_code;
    } else {
      alert("Erro ao gerar pagamento!");
      console.log(result);
    }
  } catch (err) {
    alert("Falha na comunicação com o servidor.");
    console.error(err);
  }
});
