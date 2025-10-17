import Jimp from "jimp";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { v4 as uuidv4 } from "uuid";

export async function takeScreenshot(sock, from, targetUser, motivo, config) {
    try {
        // Crear directorio de exports si no existe
        if (!existsSync("./exports")) {
            mkdirSync("./exports", { recursive: true });
        }

        // Configuración de la imagen
        const width = 800;
        const lineHeight = 80;
        const padding = 40;
        const messagePadding = 20;
        const headerHeight = 120;
        const footerHeight = 80;
        
        // Obtener algunos mensajes recientes (últimos 5-10)
        const messageCount = 8;
        const messages = await sock.fetchMessagesFromWA(from, messageCount, undefined);

        if (!messages || messages.length === 0) {
            console.log("No se pudieron obtener mensajes para la captura");
            return null;
        }

        const totalHeight = headerHeight + (messages.length * lineHeight) + footerHeight + (padding * 2);

        // Crear imagen
        const image = await Jimp.create(width, totalHeight, 0x1a1a1aff);

        // Cargar fuentes
        const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        const fontSubtitle = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
        const fontMessage = await Jimp.loadFont(Jimp.FONT_SANS_14_WHITE);
        const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_12_WHITE);

        // Dibujar header
        image.print(
            fontTitle,
            padding,
            padding,
            "REPORTE DE EXPULSIÓN"
        );

        // Obtener nombre del grupo
        let chatName = "Grupo";
        try {
            const groupMetadata = await sock.groupMetadata(from);
            chatName = groupMetadata.subject;
        } catch (error) {
            console.log("No se pudo obtener metadata del grupo:", error);
        }

        // Información del reporte
        image.print(
            fontSubtitle,
            padding,
            padding + 40,
            `Chat: ${chatName}`
        );

        image.print(
            fontSubtitle,
            padding,
            padding + 60,
            `Usuario: ${targetUser.split('@')[0]}`
        );

        image.print(
            fontSubtitle,
            padding,
            padding + 80,
            `Motivo: ${motivo}`
        );

        image.print(
            fontSubtitle,
            padding,
            padding + 100,
            `Fecha: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`
        );

        // Línea separadora
        for (let x = padding; x < width - padding; x++) {
            image.setPixelColor(0x00d9ffff, x, headerHeight + padding - 10);
        }

        // Dibujar mensajes recientes
        let yPosition = headerHeight + padding + 10;

        // Título de la conversación
        image.print(
            fontSubtitle,
            padding + messagePadding,
            yPosition,
            "ÚLTIMOS MENSAJES:"
        );
        yPosition += 30;

        for (const m of messages.slice(0, messageCount)) {
            try {
                // Obtener información del mensaje
                const messageType = Object.keys(m.message || {})[0];
                let messageText = "";
                let senderName = "Desconocido";

                // Extraer texto del mensaje
                if (messageType === "conversation") {
                    messageText = m.message.conversation;
                } else if (messageType === "extendedTextMessage") {
                    messageText = m.message.extendedTextMessage.text;
                } else if (messageType === "imageMessage") {
                    messageText = "🖼️ Imagen" + (m.message.imageMessage.caption ? ": " + m.message.imageMessage.caption : "");
                } else if (messageType === "videoMessage") {
                    messageText = "🎥 Video" + (m.message.videoMessage.caption ? ": " + m.message.videoMessage.caption : "");
                } else if (messageType === "audioMessage") {
                    messageText = "🎵 Audio";
                } else if (messageType === "documentMessage") {
                    messageText = "📄 Documento";
                } else if (messageType === "stickerMessage") {
                    messageText = "😊 Sticker";
                } else {
                    messageText = `[${messageType}]`;
                }

                // Obtener nombre del remitente
                const participant = m.key.participant || m.key.remoteJid;
                const pushName = m.pushName || participant.split('@')[0];
                senderName = pushName;

                // Obtener hora del mensaje
                const timestamp = m.messageTimestamp;
                const date = new Date(Number(timestamp) * 1000);
                const time = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

                // Truncar mensaje si es muy largo
                if (messageText.length > 50) {
                    messageText = messageText.substring(0, 47) + "...";
                }

                // Dibujar nombre y hora
                image.print(
                    fontMessage,
                    padding + messagePadding,
                    yPosition,
                    `${senderName} - ${time}`
                );

                // Dibujar mensaje
                image.print(
                    fontSmall,
                    padding + messagePadding,
                    yPosition + 20,
                    messageText
                );

                // Línea separadora sutil
                for (let x = padding + messagePadding; x < width - padding - messagePadding; x++) {
                    image.setPixelColor(0x333333ff, x, yPosition + lineHeight - 15);
                }

                yPosition += lineHeight;
            } catch (err) {
                console.error("Error procesando mensaje:", err);
            }
        }

        // Dibujar footer
        const footerY = totalHeight - footerHeight;

        // Línea separadora superior del footer
        for (let x = padding; x < width - padding; x++) {
            image.setPixelColor(0x00d9ffff, x, footerY);
        }

        image.print(
            fontSmall,
            padding,
            footerY + 15,
            `Bot: ReportBot`
        );

        image.print(
            fontSmall,
            padding,
            footerY + 35,
            "Sistema de reportes automáticos"
        );

        image.print(
            fontSmall,
            padding,
            footerY + 55,
            `Generado: ${new Date().toLocaleString()}`
        );

        // Guardar imagen
        const filename = `reporte_${Date.now()}.png`;
        const filepath = `./exports/${filename}`;
        const buffer = await image.getBuffer(Jimp.MIME_PNG);
        writeFileSync(filepath, buffer);

        console.log(`✅ Captura guardada: ${filepath}`);
        return filepath;

    } catch (error) {
        console.error("❌ Error generando screenshot:", error);
        return null;
    }
}