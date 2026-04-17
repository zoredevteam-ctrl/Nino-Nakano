/**
 * PING / SPEED - NINO NAKANO
 * Latencia, RAM, CPU, Uptime del bot
 * Comandos: #ping, #speed, #latencia, #p
 * Z0RT SYSTEMS
 */

import os from 'os'
import { performance } from 'perf_hooks'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Barra de progreso visual
const bar = (used, total, size = 10) => {
    const pct  = Math.min(used / total, 1)
    const fill = Math.round(pct * size)
    const empty = size - fill
    return '█'.repeat(fill) + '░'.repeat(empty) + ` ${(pct * 100).toFixed(1)}%`
}

// Uptime legible
const formatUptime = (seconds) => {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (d > 0) return `${d}d ${h}h ${m}m`
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
}

// Calidad de latencia
const rateLatency = (ms) => {
    const n = parseFloat(ms)
    if (n < 100)  return '🟢 Excelente'
    if (n < 300)  return '🟡 Buena'
    if (n < 600)  return '🟠 Regular'
    return           '🔴 Lenta'
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn }) => {
    const start = performance.now()

    // Mensaje inicial
    const { key } = await m.reply('Calculando mi velocidad... No me presiones, tonto. 🦋')

    // Latencia real (tiempo desde que se envió el mensaje hasta que llegó la respuesta)
    const latencia = (performance.now() - start).toFixed(2)

    // ── RAM ──
    const mem        = process.memoryUsage()
    const ramUsed    = mem.rss / 1024 / 1024           // MB usados por el proceso
    const heapUsed   = mem.heapUsed / 1024 / 1024      // Heap JS usado
    const heapTotal  = mem.heapTotal / 1024 / 1024     // Heap JS total
    const ramTotal   = os.totalmem() / 1024 / 1024     // RAM total del sistema en MB
    const ramFree    = os.freemem() / 1024 / 1024      // RAM libre
    const ramSysUsed = ramTotal - ramFree               // RAM del sistema usada

    // ── CPU ──
    const cpus      = os.cpus()
    const cpuModelo = cpus[0]?.model?.split(' @')[0]?.trim() || 'Desconocido'
    const cpuCores  = cpus.length

    // ── SISTEMA ──
    const plat       = os.platform()
    const platform   = plat === 'android' ? 'Termux (Android)' :
                       plat === 'linux'   ? 'Linux / VPS' :
                       plat === 'win32'   ? 'Windows' : plat
    const arch       = os.arch()
    const nodeVer    = process.version
    const botUptime  = formatUptime(process.uptime())
    const sysUptime  = formatUptime(os.uptime())

    // ── BARRAS ──
    const ramBotBar = bar(ramUsed,    ramTotal)
    const ramSysBar = bar(ramSysUsed, ramTotal)
    const heapBar   = bar(heapUsed,   heapTotal)

    const stats =
        `🦋 *NINO NAKANO — SPEED TEST* 🦋\n` +
        `_¡Ugh! Mira lo rápido que soy, ¿impresionado?_ 👑\n\n` +

        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⚡ *LATENCIA*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🏓 Ping:    \`${latencia} ms\`\n` +
        `📊 Estado:  ${rateLatency(latencia)}\n\n` +

        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💾 *MEMORIA*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🎀 Bot (RSS):  ${ramBotBar}\n` +
        `   \`${ramUsed.toFixed(1)} MB / ${(ramTotal / 1024).toFixed(1)} GB\`\n` +
        `🖥️ Sistema:    ${ramSysBar}\n` +
        `   \`${(ramSysUsed / 1024).toFixed(2)} GB / ${(ramTotal / 1024).toFixed(1)} GB\`\n` +
        `📦 Heap JS:    ${heapBar}\n` +
        `   \`${heapUsed.toFixed(1)} MB / ${heapTotal.toFixed(1)} MB\`\n\n` +

        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🖥️ *SISTEMA*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🛰️ Plataforma: \`${platform}\`\n` +
        `🔧 Arch:       \`${arch}\`\n` +
        `🧠 CPU:        \`${cpuModelo}\`\n` +
        `⚙️ Núcleos:    \`${cpuCores} cores\`\n` +
        `💚 Node.js:    \`${nodeVer}\`\n\n` +

        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⏱️ *UPTIME*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🎀 Bot:     \`${botUptime}\`\n` +
        `🖥️ Sistema: \`${sysUptime}\`\n\n` +

        `> ꒰⌢ ʚ˚₊‧ ✎ ꒱ *Z0RT SYSTEMS* — Nino corre sin fallas. No parpadees. 🦋`

    await conn.sendMessage(m.chat, { text: stats, edit: key })
}

handler.command = ['ping', 'p', 'speed', 'latencia']
handler.owner   = false
export default handler
