import chalk from 'chalk'

export async function handler(m, conn, plugins) {
  if (!m || !m.chat) return
  if (m.key?.fromMe || m.isBaileys) return

  const prefix = global.prefix || '#'
  // BUGFIX: m.text puede ser undefined si el mensaje no es de texto; se usa ?? ''
  const body = (m.text ?? '').trim()

  if (!body.startsWith(prefix)) return

  const args    = body.slice(prefix.length).trim().split(/\s+/)
  const command = args.shift().toLowerCase()
  const text    = args.join(' ')
  const sender  = m.sender
  const isGroup = m.chat.endsWith('@g.us')

  // BUGFIX: se corrigieron los template literals rotos con \( y \)
  console.log(
    chalk.bgMagenta.white.bold(' CMD '),
    chalk.cyan(`${prefix}${command}`),
    chalk.white('→'),
    chalk.yellow(m.pushName || sender?.split('@')[0] || '?')
  )

  // ─── BUSCAR PLUGIN ───────────────────────────────────────────────────────────
  let pluginFound = null

  for (const [filename, plugin] of plugins.entries()) {
    if (!plugin) continue

    // Soporta plugin directo o plugin.default (módulos ESM)
    const resolved = (typeof plugin === 'function' || plugin?.command || plugin?.handler)
      ? plugin
      : plugin?.default

    if (!resolved) continue

    let cmdList = []
    if (resolved.command) {
      cmdList = Array.isArray(resolved.command) ? resolved.command : [resolved.command]
    } else {
      // fallback: nombre del archivo sin extensión
      cmdList = [filename.replace(/\.js$/i, '').toLowerCase()]
    }

    if (cmdList.some(cmd => String(cmd).toLowerCase() === command)) {
      pluginFound = resolved
      break
    }
  }

  // ─── COMANDOS BUILT-IN (si no hay plugin) ────────────────────────────────────
  if (!pluginFound) {
    if (command === 'ping') {
      return conn.sendMessage(m.chat, { text: '✅ *PONG!* 🦋\nBot activo y respondiendo.' })
    }

    if (command === 'menu') {
      const list = [...plugins.keys()]
        .map(f => `${prefix}${f.replace(/\.js$/i, '')}`)
        .join('\n') || '(sin plugins cargados)'

      return conn.sendMessage(m.chat, {
        text: `🦋 *Nino Nakano — Menú*\n\n*Built-in:*\n${prefix}ping\n${prefix}menu\n\n*Plugins:*\n${list}`
      })
    }

    return // comando no encontrado, ignorar silenciosamente
  }

  // ─── EJECUTAR PLUGIN ─────────────────────────────────────────────────────────
  try {
    // Resuelve la función ejecutable del plugin
    const execute = typeof pluginFound === 'function'
      ? pluginFound
      : (pluginFound.handler ?? pluginFound.execute ?? pluginFound.default)

    if (typeof execute !== 'function') {
      console.log(chalk.bgYellow.black.bold('  WARN  '), chalk.yellow(`Plugin "${command}" no tiene función ejecutable`))
      return
    }

    await execute(conn, m, {
      conn,
      command,
      args,
      text,
      sender,
      isGroup,
      plugins,
      prefix
    })

  } catch (err) {
    console.error(
      chalk.bgRed.white.bold('  ERROR '),
      chalk.red(`Comando ${command}:`),
      err
    )
    // BUGFIX: se corrigió el template literal roto con \( y \)
    try {
      await conn.sendMessage(m.chat, {
        text: `❌ Error ejecutando *${command}*\n${err?.message || String(err)}`
      })
    } catch {
      // Si falla el sendMessage, al menos no crashea el bot
    }
  }
}
