import os from 'os'

/**
 * Plugin para medir la velocidad de respuesta del bot
 */
let handler = async (conn, m, { conn: nino }) => {
    const start = Date.now()
    
    // Enviamos el mensaje inicial usando el sistema de smsg
    const { key } = await conn.sendMessage(m.chat, { 
        text: 'Calculando mi velocidad... No te desesperes. 🦋' 
    }, { quoted: m })
    
    const end = Date.now()
    const latencia = end - start

    // Estadísticas de hardware
    const ramUsada = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    const ramTotal = Math.round(os.totalmem() / 1024 / 1024)
    const uptimeH = Math.floor(process.uptime() / 3600)
    const uptimeM = Math.floor((process.uptime() % 3600) / 60)
    const uptimeS = Math.floor(process.uptime() % 60)

    const stats = `
🦋 *NINO NAKANO SPEED* 🦋

⚡ *Latencia:* \`${latencia} ms\`
💻 *Host:* \`${os.hostname()}\`
🧠 *RAM:* \`${ramUsada} MB / ${ramTotal} MB\`
🛰️ *Uptime:* \`${uptimeH}h ${uptimeM}m ${uptimeS}s\`

¡No parpadees, tonto! Soy mucho más rápida de lo que tus ojos pueden ver. 💅✨`.trim()

    // Editamos el mensaje enviado anteriormente con los resultados
    await conn.sendMessage(m.chat, { text: stats, edit: key })
}

// --- CONFIGURACIÓN ---
handler.command = ['ping', 'p', 'speed'] // Comandos que activan el plugin
handler.owner = false // Cualquiera puede ver qué tan rápida soy 🙄

export default handler
