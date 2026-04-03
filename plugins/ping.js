import os from 'os'
import { performance } from 'perf_hooks'

/**
 * Plugin de Velocidad - Z0RT SYSTEMS
 */
let handler = async (m, { conn }) => {
    // 1. Iniciamos el cronómetro de alta precisión
    const start = performance.now()

    // 2. Mensaje inicial (Actitud Nino)
    const { key } = await m.reply('Calculando mi velocidad... No me presiones, tonto. 🦋')

    // 3. Cálculos de Hardware
    const end = performance.now()
    const latencia = (end - start).toFixed(2)

    // RAM del proceso (RSS es la memoria real ocupada en el sistema)
    const ramBot = (process.memoryUsage().rss / 1024 / 1024).toFixed(2)
    const ramTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1) // En GB para que se vea limpio
    
    // Info del Sistema
    const nets = os.networkInterfaces()
    const platform = os.platform() === 'android' ? 'Termux (Android)' : os.platform()
    const cpuModelo = os.cpus()[0]?.model || 'Desconocido'

    const stats = `
🦋 *NINO NAKANO SPEED* 🦋
_¡Ugh! Mira lo rápido que soy, ¿impresionado?_

⚡ *Latencia:* \`${latencia} ms\`
🛰️ *Servidor:* \`${platform}\`
🧠 *CPU:* \`${cpuModelo.split(' @')[0]}\`
💾 *Uso RAM:* \`${ramBot} MB / ${ramTotal} GB\`

> ꒰⌢ ʚ˚₊‧ ✎ ꒱ *STATUS:*
Nino está corriendo perfectamente. No parpadees o te lo perderás. 💅✨`.trim()

    // 4. Editamos el mensaje con el resultado final
    await conn.sendMessage(m.chat, { text: stats, edit: key })
}

handler.command = ['ping', 'p', 'speed', 'latencia']
handler.owner = false 

export default handler
