import { saveConfig } from "../utils/storage.js";

export async function handleSystemCommand(sock, from, sender, cmd, args, config, isOwner) {
  // En grupos, cualquier admin puede usar estos comandos
  // En chats privados, solo el owner puede usar comandos
  
  // Verificar permisos según el tipo de chat
  if (from.endsWith("@g.us")) {
    // En grupos: cualquier admin puede usar los comandos
    // No se necesita verificación adicional ya que functions.js ya validó que es admin
  } else {
    // En chats privados: solo el owner puede usar comandos
    if (!isOwner) {
      return sock.sendMessage(from, { text: "❌ Solo el owner puede usar comandos en chats privados." });
    }
  }

  switch (cmd.toLowerCase()) {
    case "prefix":
      if (!args[0])
        return sock.sendMessage(from, { text: "❗ Usa: #prefix nuevoPrefijo" });
      config.prefix = args[0];
      saveConfig(config);
      sock.sendMessage(from, { text: `✅ Prefijo cambiado a: ${args[0]}` });
      break;

    case "report":
      if (args[0] === "on") {
        // Configurar este chat como chat de reportes
        config.reportChat = from;
        
        // Inicializar reportActive si no existe
        if (!config.reportActive) config.reportActive = {};
        config.reportActive[from] = true;
        
        saveConfig(config);
        sock.sendMessage(from, { text: "✅ Reportes activados en este chat." });
      } else if (args[0] === "off") {
        // Inicializar reportActive si no existe
        if (!config.reportActive) config.reportActive = {};
        config.reportActive[from] = false;
        
        saveConfig(config);
        sock.sendMessage(from, { text: "🚫 Reportes desactivados en este chat." });
      } else {
        sock.sendMessage(from, { text: "❗ Usa: #report on / off" });
      }
      break;

    case "bot":
      // ✅ ESTE COMANDO SIEMPRE FUNCIONA, INCLUSO CUANDO EL BOT ESTÁ DESACTIVADO
      if (args[0] === "on") {
        if (!config.botActive) config.botActive = {};
        config.botActive[from] = true;
        saveConfig(config);
        sock.sendMessage(from, { text: "🤖 Bot activado en este chat." });
      } else if (args[0] === "off") {
        if (!config.botActive) config.botActive = {};
        config.botActive[from] = false;
        saveConfig(config);
        sock.sendMessage(from, { text: "🛑 Bot desactivado en este chat." });
      } else {
        sock.sendMessage(from, { text: "❗ Usa: #bot on / off" });
      }
      break;

    case "reload":
      // Solo el owner puede reiniciar el bot (por seguridad)
      if (!isOwner) {
        return sock.sendMessage(from, { text: "❌ Solo el owner puede reiniciar el bot." });
      }
      sock.sendMessage(from, { text: "🔄 Reiniciando bot..." });
      process.exit(0);
      break;

    case "setowner":
      // Solo el owner actual puede cambiar el owner
      if (!isOwner) {
        return sock.sendMessage(from, { text: "❌ Solo el owner actual puede cambiar el owner." });
      }
      
      if (!args[0]) {
        return sock.sendMessage(from, { text: "❗ Usa: #setowner [número]@s.whatsapp.net" });
      }
      
      let newOwner = args[0];
      if (!newOwner.includes('@s.whatsapp.net')) {
        newOwner = newOwner + '@s.whatsapp.net';
      }
      
      config.owner = newOwner;
      saveConfig(config);
      sock.sendMessage(from, { text: `✅ Owner cambiado a: ${newOwner}` });
      break;
  }
}