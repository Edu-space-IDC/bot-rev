import moment from "moment";
import { saveConfig } from "./storage.js";
import { getAdminList, sendReport } from "../commands/moderation.js";
import { handleSystemCommand } from "../commands/system.js";
import { handleLevelsCommand, handleDeleteLevelCommand, handleListLevelsCommand } from "../commands/levels.js";

// Variable global para almacenar el tiempo de inicio
let startTime = Date.now();

export async function handleMessage(sock, msg, config) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const body =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    "";
   
  // 🎯 COMANDO KICK SIEMPRE CON # (independiente del prefijo configurado)
  if (body.startsWith('#kick')) {
    // Verificar si el bot está activo en este chat (también para #kick)
    if (config.botActive && config.botActive[from] === false) {
      return; // No responde si el bot está desactivado
    }

    const args = body.slice(5).trim().split(/ +/);
    
    // Solo verificar permisos de admin si es un grupo
    if (from.endsWith("@g.us")) {
      const admins = await getAdminList(sock, from);
      const isAdmin = admins.includes(sender);

      if (!isAdmin) {
        await sock.sendMessage(from, {
          text: "❌ Solo los administradores pueden usar el comando #kick.",
        });
        return; // ⚠️ IMPORTANTE: Return aquí para no ejecutar sendReport
      }
    }

    await sendReport(sock, msg, body, config, sender, from);
    return;
  }

  // 🧩 RESTO DE COMANDOS CON EL PREFIJO CONFIGURADO
  if (!body.startsWith(config.prefix)) return;

  const [command, ...args] = body.slice(config.prefix.length).trim().split(/ +/);
  
  // Verificar si el bot está activo en este chat
  if (config.botActive && config.botActive[from] === false) {
    // ✅ EXCEPCIÓN: Estos comandos SIEMPRE funcionan aunque el bot esté desactivado
    const alwaysAllowedCommands = ["bot", "estado", "setrev"];
    const isAlwaysAllowed = alwaysAllowedCommands.includes(command.toLowerCase());
    
    if (!isAlwaysAllowed) {
      return; // Solo bloquea comandos que NO son .bot o .estado
    }
  }

  // Obtener lista de admins solo si es grupo
  let admins = [];
  let isAdmin = false;
  if (from.endsWith("@g.us")) {
    admins = await getAdminList(sock, from);
    isAdmin = admins.includes(sender);
  }
  
  const isOwner = sender === config.owner;

  // 🧱 Solo admins pueden usar comandos (en grupos)
  // En chats privados, solo el owner puede usar comandos
  if (from.endsWith("@g.us")) {
    // En grupos: solo admins pueden usar comandos
    if (!isAdmin) {
      return sock.sendMessage(from, {
        text: "❌ Solo los administradores pueden usar comandos del bot.",
      });
    }
  } else {
    // En chats privados: solo el owner puede usar comandos
    if (!isOwner) {
      return sock.sendMessage(from, {
        text: "❌ Solo el owner puede usar comandos en chats privados.",
      });
    }
  }

  switch (command.toLowerCase()) {
    case "prefix":
    case "bot":
    case "report":
    case "reload":
    case "setowner":
      await handleSystemCommand(sock, from, sender, command, args, config, isOwner);
      break;

    case "addlevel":
      await handleLevelsCommand(sock, from, args, config, isOwner);
      break;

    case "dellevel":
      await handleDeleteLevelCommand(sock, from, args, config, isOwner);
      break;

    case "level":
    case "levels":
      await handleListLevelsCommand(sock, from, config);
      break;

    case "ping":
    case "p":
      const start = Date.now();
      await sock.sendMessage(from, { text: "🏓 Pong!" });
      const latency = Date.now() - start;
      await sock.sendMessage(from, { text: `⚡ Velocidad de respuesta: ${latency}ms` });
      break;

    case "rev":
      await handleRevCommand(sock, msg, config, sender, from);
      break;

    case "setrev":
      await handleSetRevCommand(sock, from, args, config, sender);
      break;

    case "uso":
    case "help":
    case "ayuda":
      const usoText = `
╭━━━[ 📖 *MANUAL DE USO* ]━━━╮
┃
┃ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃
┃ ⚙️ *SISTEMA DE REVISION*
┃   
┃ 📤 *${config.prefix}rev*
┃   Reenvía contenido al chat configurado
┃   *Debe responder a un mensaje* y reenvia el
┃   contenido a revision de admins
┃
┃ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃
┃ 🔧 *CONFIGURACIÓN DEL BOT*
┃
┃ 🤖 *${config.prefix}bot on/off*
┃   Activa/desactiva el bot en este chat
┃
┃ 📤 *${config.prefix}setrev on/off*
┃   Activa/desactiva configuración de destinatario
┃   para reenvíos
┃
┃ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃
┃ ℹ️ *OTROS COMANDOS*
┃
┃ 🩺 *${config.prefix}estado*
┃   Muestra estado del bot y configuración
┃
┃ 🏓 *${config.prefix}ping / ${config.prefix}p*
┃   Ver velocidad de respuesta del bot
┃
┃
┃ 📖 *${config.prefix}menu*
┃   Muestra lista de comandos disponibles
┃
┃ 📖 *${config.prefix}uso*
┃   Muestra este manual de uso
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
      `.trim();
      
      await sock.sendMessage(from, { text: usoText });
      break;

    case "menu":
      const menu = `
╭━━━[ 🌟 *Menú del Bot* 🌟 ]━━━╮
┃ 🦶 *#kick* - Expulsar usuario (siempre con #)
┃ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ ⚙️ *${config.prefix}prefix* - Cambiar prefijo
┃ 🤖 *${config.prefix}bot on/off* - Activar/desactivar bot
┃ 📤 *${config.prefix}setrev on/off* - Reenvío de contenido
┃ 🔄 *${config.prefix}reload* - Reiniciar bot
┃ 👑 *${config.prefix}setowner* - Cambiar owner
┃ 🩺 *${config.prefix}estado* - Ver estado del bot
┃ 🏓 *${config.prefix}ping* - Ver velocidad
┃ 📤 *${config.prefix}rev* - Reenviar contenido
┃ 📖 *${config.prefix}uso* - Manual de uso
╰━━━━━━━━━━━━━━━━━━━━━━━╯
*Nota:* 
• #kick siempre usa el prefijo #
• Otros comandos usan: ${config.prefix}
• Comandos para administradores del grupo`;
      await sock.sendMessage(from, { text: menu });
      break;

    case "estado":
      const reportStatus = config.reportActive && config.reportActive[from] ? "✅ Activado" : "❌ Desactivado";
      const botStatus = config.botActive && config.botActive[from] ? "✅ Activado" : "❌ Desactivado";
      const revStatus = config.revActive && config.revActive[from] ? "✅ Activado" : "❌ Desactivado";

      // Calcular uptime
      const uptime = calculateUptime();

      // Mostrar solo el número de niveles
      const numeroNiveles = Object.keys(config.levels || {}).length;

      await sock.sendMessage(from, {
        text: `🤖 *Estado del Bot*\n\n` +
          `⚙️ Prefijo actual: ${config.prefix}\n` +
          `🎯 Comando kick: # (fijo)\n` +
         // `📊 Reportes: ${reportStatus}\n` +
          `📤 Reenvíos: ${revStatus}\n` +
          `🔧 Bot: ${botStatus}\n` +
          `⏰ Uptime: ${uptime}\n` +
          `👑 Owner: ${config.owner ? config.owner.split('@')[0] : 'No configurado'}\n` +
          `👥 Modo: ${from.endsWith('@g.us') ? 'Grupo - Comandos para admins' : 'Privado - Solo owner'}\n` +
          `📋 Niveles: ${numeroNiveles}`
      });
      break;
  }
}

// Función para manejar el comando rev
async function handleRevCommand(sock, msg, config, sender, from) {
  try {
    // Verificar si los reenvíos están activos
    if (!config.revActive || config.revActive[from] === false) {
      await sock.sendMessage(from, { text: "❌ Los reenvíos están desactivados en este chat." });
      return;
    }

    // Verificar que haya un chat configurado para reenvíos
    if (!config.revChat) {
      await sock.sendMessage(from, { text: "❌ No hay chat de reenvíos configurado. Usa .setrev on en el chat destino." });
      return;
    }

    const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMessage) {
      await sock.sendMessage(from, { text: "❌ Debes responder a un mensaje para reenviarlo." });
      return;
    }

    // Obtener información del remitente original
    const quotedSender = msg.message.extendedTextMessage.contextInfo.participant;
    const originalSenderNumber = quotedSender.split('@')[0];
    const originalSenderFormatted = formatPhoneNumber(originalSenderNumber);

    // Obtener información del que ejecuta el comando
    const executorNumber = sender.split('@')[0];
    const executorFormatted = formatPhoneNumber(executorNumber);

    // Enviar encabezado del reenvío CON MENCIONES
    await sock.sendMessage(config.revChat, {
      text: `📤 *CONTENIDO REENVIADO*\n\n👤 *De:* @${originalSenderFormatted}\n🔄 *Reenviado por:* @${executorFormatted}\n📅 *Fecha:* ${moment().format("DD/MM/YYYY HH:mm")}`,
      mentions: [quotedSender, sender] // Mencionar al remitente original y al que reenvía
    });

    // Recrear el mensaje original EXACTAMENTE igual que en #kick
    const copy = (obj) => JSON.parse(JSON.stringify(obj));
    
    let fakeMsg = copy(msg);
    fakeMsg.key.fromMe = false;
    fakeMsg.key.remoteJid = config.revChat;
    
    let who = msg.message.extendedTextMessage.contextInfo.participant;
    
    // Si es un grupo, usar el participante original
    if (from.endsWith("@g.us")) {
      fakeMsg.key.participant = who;
    } else {
      fakeMsg.key.participant = who;
    }
    
    // Copiar el mensaje original exactamente
    fakeMsg.message = copy(quotedMessage);
    
    // Enviar el mensaje recreado (igual que Summi Bot)
    await sock.relayMessage(config.revChat, fakeMsg.message, {
      messageId: fakeMsg.key.id
    });

  

  } catch (error) {
    console.error("❌ Error en comando rev:", error);
    await sock.sendMessage(from, { 
      text: "❌ Error al reenviar el contenido." 
    });
  }
}

// Función para manejar setrev
async function handleSetRevCommand(sock, from, args, config, sender) {
  if (args[0] === "on") {
    // Configurar este chat como chat de reenvíos
    config.revChat = from;
    
    // Inicializar revActive si no existe
    if (!config.revActive) config.revActive = {};
    config.revActive[from] = true;
    
    saveConfig(config);
    await sock.sendMessage(from, { 
      text: "✅ Reenvíos activados. Este chat recibirá los contenidos reenviados con .rev" 
    });
  } else if (args[0] === "off") {
    // Inicializar revActive si no existe
    if (!config.revActive) config.revActive = {};
    config.revActive[from] = false;
    
    saveConfig(config);
    await sock.sendMessage(from, { 
      text: "🚫 Reenvíos desactivados en este chat." 
    });
  } else {
    await sock.sendMessage(from, { 
      text: "❗ Usa: .setrev on / off" 
    });
  }
}

// Función para calcular el uptime en formato legible
function calculateUptime() {
  const now = Date.now();
  const uptimeMs = now - startTime;

  // Convertir milisegundos a formato legible
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts = [];

  if (days > 0) {
    parts.push(`${days} día${days > 1 ? 's' : ''}`);
  }
  if (hours % 24 > 0) {
    parts.push(`${hours % 24} hora${hours % 24 > 1 ? 's' : ''}`);
  }
  if (minutes % 60 > 0 && days === 0) {
    parts.push(`${minutes % 60} minuto${minutes % 60 > 1 ? 's' : ''}`);
  }
  if (seconds % 60 > 0 && hours === 0 && days === 0) {
    parts.push(`${seconds % 60} segundo${seconds % 60 > 1 ? 's' : ''}`);
  }

  return parts.join(', ') || '0 segundos';
}

// Función auxiliar para formatear números de teléfono
function formatPhoneNumber(number) {
  // Remover cualquier caracter no numérico
  const cleanNumber = number.replace(/\D/g, '');
  
  // Formatear según la longitud del número
  if (cleanNumber.length === 12) {
    // Formato: 57 318 035 5926
    return cleanNumber.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4');
  } else if (cleanNumber.length === 11) {
    // Formato: 57 318 035 592
    return cleanNumber.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
  } else if (cleanNumber.length === 10) {
    // Formato: 318 035 5926
    return cleanNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  } else if (cleanNumber.length === 9) {
    // Formato: 318 035 592
    return cleanNumber.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  }
  
  // Si no coincide con ningún formato conocido, devolver el número limpio
  return cleanNumber;
}