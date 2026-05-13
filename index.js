const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// ============================
// ROOT (OPTIONAL)
// ============================
app.get("/", (req, res) => {
  res.send("AJOEMCA WhatsApp Bot is running ✅");
});

// ============================
// WEBHOOK VERIFICATION (GET)
// ============================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified successfully.");
      return res.status(200).send(challenge);
    } else {
      console.log("❌ Webhook verification failed.");
      return res.sendStatus(403);
    }
  }

  return res.sendStatus(400);
});

// ============================
// WEBHOOK RECEIVER (POST)
// ============================
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const messages = value?.messages;

    if (messages && messages.length > 0) {
      const msg = messages[0];
      const from = msg.from; // numero del usuario
      const text = msg.text?.body?.toLowerCase() || "";

      console.log("📩 Mensaje recibido:", from, text);

      // MENÚ PRINCIPAL
      if (text.includes("hola")) {
        await sendMessage(
          from,
          `Bienvenido a AJOEMCA.\nSeleccione una opción:\n\n1. Reportar trabajo\n2. Reportar pago/aporte\n3. Reportar entrega de café\n4. Reportar novedad`
        );
      } else if (text === "1") {
        await sendMessage(
          from,
          "Por favor describa el trabajo realizado (actividad, lugar y horas)."
        );
      } else if (text === "2") {
        await sendMessage(
          from,
          "Por favor indique el aporte o pago realizado (valor, tipo y fecha)."
        );
      } else if (text === "3") {
        await sendMessage(
          from,
          "Indique la entrega de café (kilos, tipo, finca y fecha)."
        );
      } else if (text === "4") {
        await sendMessage(from, "Describa la novedad o situación presentada.");
      } else {
        await sendMessage(
          from,
          "Mensaje recibido. Escriba *Hola* para ver el menú."
        );
      }
    }

    // IMPORTANTE: siempre responder 200 a Meta
    return res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error en webhook:", error.response?.data || error.message);
    return res.sendStatus(200);
  }
});

// ============================
// SEND MESSAGE FUNCTION
// ============================
async function sendMessage(to, message) {
  const url = `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`;

  try {
    const response = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: {
          body: message,
          preview_url: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Mensaje enviado a:", to);
    return response.data;
  } catch (err) {
    console.error("❌ Error enviando mensaje:");
    console.error(err.response?.data || err.message);
  }
}

// ============================
// SERVER START
// ============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Servidor corriendo en puerto", PORT));