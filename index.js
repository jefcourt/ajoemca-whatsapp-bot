const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

if (!VERIFY_TOKEN || !ACCESS_TOKEN || !PHONE_NUMBER_ID) {
  console.error("❌ Faltan variables de entorno. Revisa Render ENV:");
  console.error("VERIFY_TOKEN:", VERIFY_TOKEN);
  console.error("ACCESS_TOKEN:", ACCESS_TOKEN ? "OK" : "MISSING");
  console.error("PHONE_NUMBER_ID:", PHONE_NUMBER_ID);
}

// ============================
// HOME (para evitar Cannot GET /)
// ============================
app.get("/", (req, res) => {
  res.status(200).send("AJOEMCA WhatsApp Bot activo ✅");
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
      console.log("✅ Webhook verificado correctamente.");
      return res.status(200).send(challenge);
    } else {
      console.log("❌ Falló verificación webhook. Token incorrecto.");
      return res.sendStatus(403);
    }
  }

  res.sendStatus(400);
});

// ============================
// WEBHOOK RECEIVER (POST)
// ============================
app.post("/webhook", async (req, res) => {
  console.log("📌 WEBHOOK EVENT RECIBIDO:");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return res.sendStatus(200);
    }

    const msg = messages[0];
    const from = msg.from; // teléfono del usuario (wa_id)

    // Evitar procesar estados de mensajes
    if (!from) {
      return res.sendStatus(200);
    }

    let text = "";

    // Tipo texto normal
    if (msg.type === "text") {
      text = msg.text?.body?.trim().toLowerCase() || "";
    }

    // Tipo botón (reply button)
    if (msg.type === "button") {
      text = msg.button?.text?.trim().toLowerCase() || "";
    }

    // Tipo interactive (listas o botones)
    if (msg.type === "interactive") {
      const interactive = msg.interactive;
      if (interactive?.button_reply?.title) {
        text = interactive.button_reply.title.trim().toLowerCase();
      } else if (interactive?.list_reply?.title) {
        text = interactive.list_reply.title.trim().toLowerCase();
      }
    }

    console.log(`📩 Mensaje recibido de ${from}: ${text}`);

    if (!text) {
      return res.sendStatus(200);
    }

    // ============================
    // MENÚ PRINCIPAL
    // ============================
    if (text.includes("hola") || text.includes("menu") || text.includes("menú")) {
      await sendMessage(
        from,
        `Bienvenido a AJOEMCA.\n\nSeleccione una opción escribiendo el número:\n\n1. Reportar trabajo\n2. Reportar pago/aporte\n3. Reportar entrega de café\n4. Reportar novedad\n\nEscriba *menu* para volver aquí.`
      );
    }

    // ============================
    // OPCIONES
    // ============================
    else if (text === "1") {
      await sendMessage(
        from,
        "✅ Reporte de trabajo:\nPor favor describa:\n- Actividad realizada\n- Lugar (finca/vereda)\n- Horas trabajadas\n- Fecha\n\nEjemplo: 'Recolección en Finca La Esperanza, 6 horas, 10 mayo'."
      );
    } 
    else if (text === "2") {
      await sendMessage(
        from,
        "💰 Reporte de pago/aporte:\nIndique:\n- Valor\n- Tipo (dinero / especie / trabajo)\n- Fecha\n\nEjemplo: '50.000 dinero 10 mayo' o 'aporte en abono 2 bultos 10 mayo'."
      );
    } 
    else if (text === "3") {
      await sendMessage(
        from,
        "☕ Reporte entrega de café:\nIndique:\n- Cantidad (kg)\n- Tipo (mojado / pergamino seco)\n- Finca\n- Fecha\n\nEjemplo: '200 kg mojado Finca El Jardín 10 mayo'."
      );
    } 
    else if (text === "4") {
      await sendMessage(
        from,
        "⚠️ Reporte de novedad:\nDescriba la situación presentada (ej: daño de máquina, retraso, problema de calidad, etc.)."
      );
    } 
    else {
      await sendMessage(
        from,
        "📌 Mensaje recibido.\nEscriba *hola* o *menu* para ver opciones."
      );
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ Error en webhook:", error.response?.data || error.message);
    res.sendStatus(500);
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
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Mensaje enviado correctamente:", response.data);
  } catch (error) {
    console.error("❌ Error enviando mensaje:");
    console.error(error.response?.data || error.message);
  }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Servidor corriendo en puerto", PORT));