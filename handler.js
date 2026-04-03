import chalk from 'chalk'

export async function handler(m, conn, plugins) {
    if (!m || !m.chat || !m.text) return
    if (m.key.fromMe || m.isBaileys) return

    // Definimos el prefijo aquí (puedes cambiarlo)
    const prefix = global.prefix || '#'
    const body = m.text.trim()

    if (!body.startsWith(prefix)) return

    const command = body.slice(prefix.length).trim().split(/\s+/).shift().toLowerCase()
    const args = body.slice(prefix.length).trim().split(/\s+/).slice(1)
    const text = args.join(' ')
    const sender = m.sender
    const isGroup = m.chat.endsWith('@g.us')

    // Logs para que veas en Termux qué está pasando
    console.log(chalk.bgMagenta.white.bold(' CMD '), 
                chalk.cyan(`\( {prefix} \){command}`), 
                chalk.white('→'), 
                chalk.yellow(m.pushName || sender.split('@')[0]))

    // Buscar el plugin (compatible con Map que usamos en index.js)
    let pluginFound = null
    for (const [filename, plugin] of plugins.entries()) {
        if (!plugin) continue

        let cmdList = []
        if (plugin.command) {
            cmdList = Array.isArray(plugin.command) ? plugin.command : [plugin.command]
        } else if (plugin.default?.command) {
            cmdList = Array.isArray(plugin.default.command) ? plugin.default.command : [plugin.default.command]
        } else {
            // fallback por nombre de archivo
            cmdList = [filename.replace('.js', '').toLowerCase()]
        }

        if (cmdList.some(cmd => cmd.toLowerCase() === command)) {
            pluginFound = plugin
            break
        }
    }

    if (!pluginFound) {
        // Fallback para comandos básicos aunque no haya plugin
        if (command === 'ping') {
            return await conn.sendMessage(m.chat, { text: `✅ *PONG!* 🦋\nBot activo y respondiendo.` })
        }
        if (command === 'menu') {
            return await conn.sendMessage(m.chat, { text: `🦋 *Nino Nakano Menu*\n\nComandos disponibles:\n\( {prefix}ping\n \){prefix}menu\n\nMás comandos en la carpeta plugins/` })
        }
        return // comando no encontrado
    }

    try {
        // Ejecutar el plugin
        const execute = typeof pluginFound === 'function' 
            ? pluginFound 
            : (pluginFound.handler || pluginFound.default || pluginFound.execute)

        if (typeof execute !== 'function') {
            console.log(chalk.yellow(`[WARN] Plugin ${command} no tiene función ejecutable`))
            return
        }

        await execute(conn, m, {
            conn,
            command,
            args,
            text,
            sender,
            isGroup,
            plugins
        })

    } catch (err) {
        console.error(chalk.bgRed.white.bold(' ERROR '), chalk.red(`Comando ${command}:`), err)
        await m.reply(`❌ Error ejecutando *\( {command}*\n \){err.message || err}`)
    }
}