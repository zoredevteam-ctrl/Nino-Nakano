import './settings.js'
import chalk from 'chalk'

export async function handler(m, conn, plugins) {
    if (!m) return
    if (m.isBaileys) return

    // Configuración de variables básicas
    const body = (typeof m.text == 'string' ? m.text : '')
    const isCommand = body.startsWith(global.prefix)
    const command = isCommand ? body.slice(global.prefix.length).trim().split(/\s+/).shift().toLowerCase() : ''
    
    // Si no es comando, ignoramos
    if (!isCommand) return

    // Argumentos
    const args = body.trim().split(/\s+/).slice(1)
    const text = args.join(' ')
    const sender = m.sender
    const isOwner = global.owner.some(o => o[0] === sender.split('@')[0]) || global.owners?.includes(sender.split('@')[0])
    
    // Buscar el plugin que contenga el comando
    let plugin = null
    for (let name in plugins) {
        let p = plugins[name]
        if (!p) continue
        if (p.command && (Array.isArray(p.command) ? p.command.includes(command) : p.command === command)) {
            plugin = p
            break
        }
    }

    if (!plugin) return // Comando no encontrado

    // Logs en consola
    console.log(chalk.bgAnsi256(201).white.bold(' CMD '), chalk.cyanBright(`${global.prefix}${command}`), chalk.white('de'), chalk.yellow(m.pushName || sender.split('@')[0]))

    try {
        // Ejecutar el plugin
        await plugin(conn, m, {
            conn,
            command,
            args,
            text,
            isOwner,
            isGroup: m.isGroup,
            sender,
            userAdmin: m.isGroup ? (await conn.groupMetadata(m.chat)).participants.find(p => p.id === sender)?.admin : false,
            isBotAdmin: m.isGroup ? (await conn.groupMetadata(m.chat)).participants.find(p => p.id === conn.user.id.split(':')[0] + '@s.whatsapp.net')?.admin : false
        })
    } catch (e) {
        console.error(e)
        m.reply(global.mess.error)
    }
}
