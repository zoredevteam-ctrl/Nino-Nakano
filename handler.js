import './settings.js'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Handler principal de mensajes
 * @param {import('@whiskeysockets/baileys').proto.IWebMessageInfo} m - Mensaje procesado por smsg
 * @param {import('@whiskeysockets/baileys').WASocket} conn - Conexión del bot
 * @param {Map} plugins - Mapa de plugins cargados en index.js
 */
export async function handler(m, conn, plugins) {
    try {
        if (!m || !m.message) return
        if (m.isBaileys) return // Ignorar mensajes de otros bots Baileys
        
        // Configuración básica
        const prefix = global.prefix || '#'
        const body = m.body || ''
        const isCmd = body.startsWith(prefix)
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
        const args = body.trim().split(/ +/).slice(1)
        const text = args.join(' ')
        const from = m.chat
        const sender = m.sender
        const senderNumber = sender.split('@')[0]

        // --- LÓGICA DE PERMISOS ---
        const owners = Array.isArray(global.owner) ? global.owner.map(o => o[0]) : []
        const isOwner = owners.includes(senderNumber) || m.fromMe

        const groupMetadata = m.isGroup ? await conn.groupMetadata(from).catch(() => ({})) : {}
        const participants = m.isGroup ? (groupMetadata.participants || []) : []
        const userAdmin = m.isGroup ? !!participants.find(p => p.id === sender)?.admin : false
        const botAdmin = m.isGroup ? !!participants.find(p => p.id === (conn.user.id.split(':')[0] + '@s.whatsapp.net'))?.admin : false

        // --- LOG DE COMANDOS EN CONSOLA ---
        if (isCmd) {
            console.log(
                chalk.hex('#FF69B4').bold(`[ CMD ] `) + 
                chalk.white(`${prefix}${command}`) + 
                chalk.hex('#DDA0DD')(` | De: ${m.pushName || senderNumber}`) +
                (m.isGroup ? chalk.yellow(` en ${groupMetadata.subject || 'Grupo'}`) : chalk.green(' (DM)'))
            );
        }

        if (!isCmd || !command) return

        // --- EJECUCIÓN DE PLUGINS ---
        let executed = false
        for (let name in plugins) {
            let plugin = plugins[name]
            if (!plugin) continue

            // Verificar si el comando coincide (soporta string o array)
            const matched = Array.isArray(plugin.command)
                ? plugin.command.some(cmd => cmd.toLowerCase() === command)
                : plugin.command?.toLowerCase() === command

            if (matched) {
                executed = true
                
                // --- SISTEMA DE RESTRICCIONES ---
                if (plugin.owner && !isOwner) {
                    return m.reply('🦋 *¡Oye!* Solo mi creador Aarom puede usar este comando. No seas entrometido/a. 💅')
                }
                if (plugin.group && !m.isGroup) {
                    return m.reply('🦋 Este comando es exclusivo para grupos. ¡Búscate amigos! 🙄')
                }
                if (plugin.admin && !userAdmin && !isOwner) {
                    return m.reply('🦋 Necesitas ser *Admin* para darme órdenes aquí. ¡Aprende tu lugar! 💢')
                }
                if (plugin.botAdmin && !botAdmin) {
                    return m.reply('🦋 ¡Hazme Admin primero! No puedo hacer nada si no tengo poder en el grupo. ✨')
                }

                try {
                    await plugin.call(conn, m, {
                        conn,
                        m,
                        args,
                        text,
                        command,
                        isOwner,
                        isGroup: m.isGroup,
                        userAdmin,
                        botAdmin,
                        participants,
                        groupMetadata,
                        pushname: m.pushName || 'Usuario'
                    })
                } catch (err) {
                    console.error(chalk.red(`[ERROR PLUGIN ${name}]:`), err)
                    m.reply(`🦋 *¡Ugh!* Algo salió mal ejecutando el comando: \`${err.message}\``)
                }
                break // Detener búsqueda después de encontrar el comando
            }
        }

    } catch (err) {
        console.error(chalk.bgRed.white(' ERROR CRÍTICO EN HANDLER '), err)
    }
}

// --- LOG DE RECARGA ---
let file = fileURLToPath(import.meta.url)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.hex('#FF69B4')('🦋 Handler.js actualizado. Aplicando cambios...'))
})
