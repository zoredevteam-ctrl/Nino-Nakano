import os from 'os'

/**
 * Plugin para medir la velocidad de respuesta de Nino Nakano
 */
let handler = async (conn, m, { isOwner }) => {
    const start = Date.now()

    // Enviamos el mensaje inicial
    const { key } = await conn.sendMessage(m.chat, { 
        text: 'Calculando mi velocidad... No te desesperes. 🦋' 
    }, { quoted: m })

    const end = Date.now()
    const latencia = end - start

    // --- ESTADÍSTICAS DE HARDWARE ---
    // RAM usada por el bot (RSS es más preciso que heapUsed)
    const ramUsada = (process.memoryUsage().rss / 1024 / 1024).toFixed(2)
    const ramTotal = Math.round(os.totalmem() / 1024 / 1024)
    
    // Uptime calculado una sola vez
    const totalUptime = process.uptime()
    const uptimeH = Math.floor(totalUptime / 3600)
    const uptimeM = Math.floor((totalUptime % 3600) / 60)
    const uptimeS = Math.floor(totalUptime % 60)

    const stats = `
🦋 *NINO NAKANO SPEED* 🦋

⚡ *Latencia:* \`${latencia} ms\`
💻 *Host:* \`${os.hostname()}\`
🧠 *RAM:* \`${ramUsada} MB / ${ramTotal} MB\`
🛰️ *Uptime:* \`${uptimeH}h ${uptimeM}m ${uptimeS}s\`

¡No parpadees, tonto! Soy mucho más rápida de lo que tus ojos pueden ver. 💅✨`.trim()

    // Editamos el mensaje con el resultado final
    await conn.sendMessage(m.chat, { text: stats, edit: key })
}

handler.command = ['ping', 'p', 'speed']
handler.owner = false 

export default handler
