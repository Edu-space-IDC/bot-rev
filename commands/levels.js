import { saveConfig } from "../utils/storage.js";

export async function handleLevelsCommand(sock, from, args, config, isOwner) {
  // En grupos, cualquier admin puede añadir niveles
  // En privado, solo el owner puede añadir niveles
  
  const [nivel, emoji] = args;
  if (!nivel || !emoji) return sock.sendMessage(from, { text: "❗ Usa: #addlevel palabra emoji\nEjemplo: #addlevel spam 🟡\n> Recuerda, añadir palabras clave y no oraciones completas\n> Ej: bl, +18, acoso, comentarios, etc."
   });

  // Inicializar levels si no existe
  if (!config.levels) config.levels = {};
  
  config.levels[nivel.toLowerCase()] = emoji;
  saveConfig(config);
  
  // Mostrar todos los niveles actuales
  const nivelesList = Object.entries(config.levels).map(([n, e]) => `• ${n}: ${e}`).join('\n');
  
  sock.sendMessage(from, { 
    text: `✅ Nivel añadido: *${nivel}* → ${emoji}\n\n📊 Niveles actuales:\n${nivelesList}` 
  });
}

export async function handleDeleteLevelCommand(sock, from, args, config, isOwner) {
  // En grupos, cualquier admin puede eliminar niveles
  // En privado, solo el owner puede eliminar niveles
  
  const nivel = args[0];
  if (!nivel) {
    // Mostrar lista de niveles disponibles para eliminar
    const nivelesList = Object.entries(config.levels || {}).map(([n, e]) => `• ${n}: ${e}`).join('\n') || 'No hay niveles configurados';
    
    return sock.sendMessage(from, { 
      text: `❗ Usa: #dellevel <nombre_del_nivel>\n\n📋 Niveles disponibles:\n${nivelesList}\n\nEjemplo: #dellevel spam` 
    });
  }

  // Inicializar levels si no existe
  if (!config.levels) config.levels = {};
  
  const nivelLower = nivel.toLowerCase();
  
  // Verificar si el nivel existe
  if (!config.levels[nivelLower]) {
    const nivelesDisponibles = Object.keys(config.levels).join(', ') || 'No hay niveles configurados';
    return sock.sendMessage(from, { 
      text: `❌ El nivel "*${nivel}*" no existe.\n\n📋 Niveles disponibles: ${nivelesDisponibles}` 
    });
  }

  // Eliminar el nivel
  const emojiEliminado = config.levels[nivelLower];
  delete config.levels[nivelLower];
  saveConfig(config);
  
  // Mostrar niveles restantes
  const nivelesRestantes = Object.entries(config.levels).map(([n, e]) => `• ${n}: ${e}`).join('\n') || 'No hay niveles configurados';
  
  sock.sendMessage(from, { 
    text: `✅ Nivel eliminado: *${nivel}* (${emojiEliminado})\n\n📊 Niveles restantes:\n${nivelesRestantes}` 
  });
}

export async function handleListLevelsCommand(sock, from, config) {
  // Cualquier usuario puede ver los niveles (no requiere permisos)
  
  const niveles = config.levels || {};
  
  if (Object.keys(niveles).length === 0) {
    return sock.sendMessage(from, { 
      text: `📋 *Niveles de Gravedad*\n\nNo hay niveles configurados.\n\nUsa *${config.prefix}addlevel* para añadir nuevos niveles.` 
    });
  }

  const nivelesList = Object.entries(niveles).map(([nivel, emoji]) => 
    `• *${nivel}*: ${emoji}`
  ).join('\n');

  const totalNiveles = Object.keys(niveles).length;
  
  sock.sendMessage(from, { 
    text: `📋 *Niveles de Gravedad*\n\n${nivelesList}\n\n📊 Total: ${totalNiveles} niveles configurados\n\n💡 *Uso:* Al usar #kick, la gravedad se asignará automáticamente según el motivo.` 
  });
}