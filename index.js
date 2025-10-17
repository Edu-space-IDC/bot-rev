import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import fs from "fs";
import { handleMessage } from "./utils/functions.js";
import { getConfig, saveConfig } from "./utils/storage.js";

let config = getConfig();
let startTime = Date.now(); // Inicializar el tiempo de inicio

async function startBot() {
    // ✅ Usa el sistema de sesión múltiple
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.windows('Desktop'),
        syncFullHistory: false,
        markOnlineOnConnect: false,
    });

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        // ✅ Mostrar el QR correctamente
        if (qr) {
            console.clear();
            console.log("\n🟢 Escanea este código QR con tu WhatsApp:\n");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "close") {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

            switch (reason) {
                case DisconnectReason.badSession:
                    console.log("❌ Sesión inválida, borra la carpeta 'session' y vuelve a escanear.");
                    fs.rmSync("./session", { recursive: true, force: true });
                    startBot();
                    break;

                case DisconnectReason.connectionClosed:
                    console.log("🔁 Conexión cerrada, reconectando...");
                    startBot();
                    break;

                case DisconnectReason.connectionLost:
                    console.log("📶 Conexión perdida con el servidor, reconectando...");
                    startBot();
                    break;

                case DisconnectReason.loggedOut:
                    console.log("🔒 Sesión cerrada desde otro dispositivo. Borra la carpeta 'session' y reescanea el QR.");
                    break;

                case DisconnectReason.restartRequired:
                    console.log("🔄 Reinicio requerido, reiniciando...");
                    startBot();
                    break;

                default:
                    console.log("❗ Desconexión inesperada, reconectando...", reason);
                    startBot();
                    break;
            }
        } else if (connection === "open") {
            console.log("✅ Conectado correctamente a WhatsApp");
            startTime = Date.now(); // Reiniciar el contador al conectar
            console.log(`⏰ Uptime iniciado: ${new Date().toLocaleString()}`);

            // -------------------------------
            // Asignar owner automáticamente
            // -------------------------------
            try {
                config = getConfig();
                let botIdRaw = sock.user?.id || null;

                if (botIdRaw) {
                    let botId = botIdRaw.includes(':') ? botIdRaw.split(':')[0] + '@s.whatsapp.net' : botIdRaw;

                    if (!config.owner) {
                        config.owner = botId;
                        saveConfig(config);
                        console.log(`👑 Owner asignado automáticamente: ${botId}`);
                    } else {
                        console.log(`📱 Owner en config: ${config.owner}`);
                        const normalize = id => id ? (id.includes(':') ? id.split(':')[0] + '@s.whatsapp.net' : id) : null;
                        const ownerNorm = normalize(config.owner);
                        if (ownerNorm === botId && config.owner !== ownerNorm) {
                            config.owner = ownerNorm;
                            saveConfig(config);
                            console.log(`🔁 Normalizado owner a: ${ownerNorm}`);
                        }
                    }
                } else {
                    console.log("⚠️ No se pudo obtener sock.user.id para asignar owner automático.");
                }
            } catch (err) {
                console.error("❌ Error asignando owner automático:", err);
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // ✅ Manejo de mensajes
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        config = getConfig();
        await handleMessage(sock, msg, config);
    });
}

startBot();