import './settings.js'
import chalk from 'chalk'

export async function handler(m, conn, plugins) {
    // Validaciones de seguridad básicas
    if (!m || !m.chat) return
    if (m.key.fromMe || m.isBaileys) return // Evita que Nino se responda a sí misma y cicle

    // Configuración de variables
    const body = (typeof m.text === 'string' ? m.text : '')
    const isCommand = body.startsWith(global.prefix)
    const command = isCommand ? body.slice(global.prefix.length).trim().split(/\s+/).shift().toLowerCase() : ''

    // Si no es comando, cortamos ejecución aquí para no gastar recursos
    if (!isCommand) return

    // Argumentos e Identidad
    const args = body.trim().split(/\s+/).slice(1)
    const text = args.join(' ')
    const sender = m.sender || m.key.participant || m.key.remoteJid
    const isOwner = global.owner.some(o => o[0] === sender.split('@')[0]) || (global.owners && global.owners.includes(sender.split('@')[0]))
    const isGroup = m.chat.endsWith('@g.us')

    // Búsqueda del Plugin
    let plugin = null
    for (let name in plugins) {
        let p = plugins[name]
        if (!p) continue
        
        // Maneja tanto si command es un array como si es un string
        let cmdList = p.command || p.default?.command || []
        if (Array.isArray(cmdList) ? cmdList.includes(command) : cmdList === command) {
            plugin = p
            break
        }
    }

    if (!plugin) return // Si el comando no existe en los plugins, no hace nada

    // 🚀 OPTIMIZACIÓN CRÍTICA (Anti-Lag y Anti-Ban)
    let groupMetadata = null
    let participants = []
    let userAdmin = false
    let isBotAdmin = false

    if (isGroup) {
        try {
            // Solo pedimos la info del grupo UNA vez, no dos como en el código anterior
            groupMetadata = await conn.groupMetadata(m.chat)
            participants = groupMetadata.participants || []
            
            // Verificamos admins de forma segura
            userAdmin = !!participants.find(p => p.id === sender)?.admin
            const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
            isBotAdmin = !!participants.find(p => p.id === botJid)?.admin
        } catch (e) {
            console.log(chalk.red(`[!] Error obteniendo metadatos del grupo: ${m.chat}`))
        }
    }

    // Logs en consola estilo Z0RT
    console.log(chalk.bgAnsi256(201).white.bold(' CMD '), chalk.cyanBright(`${global.prefix}${command}`), chalk.white('de'), chalk.yellow(m.pushName || sender.split('@')[0]))

    try {
        // Ejecutar el plugin de forma segura (soporta objetos y funciones)
        const executePlugin = typeof plugin === 'function' ? plugin : (plugin.handler || plugin.default || plugin.execute)
        
        if (typeof executePlugin !== 'function') {
            console.log(chalk.bgYellow.red.bold(' WARN '), chalk.yellow(`El plugin para '${command}' no tiene una función ejecutable válida.`))
            return
        }

        await executePlugin(conn, m, {
            conn,
            command,
            args,
            text,
            isOwner,
            isGroup,
            sender,
            groupMetadata,
            participants,
            userAdmin,
            isBotAdmin
        })
    } catch (e) {
        console.error(chalk.bgRed.white.bold(' ERROR '), chalk.redBright(`Falló el comando ${command}:`), e)
        m.reply(global.mess.error)
    }
}
