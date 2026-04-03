import chalk from 'chalk'

/**
 * Imprime los logs en consola con el estilo visual de Nino Nakano
 * @param {boolean} isCmd - Si es un comando prefixado
 * @param {string} sender - JID del usuario
 * @param {string|null} group - Nombre del grupo o null
 * @param {string} content - Texto del mensaje
 * @param {string} pushName - Nombre real del usuario en WhatsApp
 */
export const printLog = (isCmd, sender, group, content, pushName = 'Usuario') => {
    // Tiempo en formato 24h para un look más técnico
    const time = new Date().toLocaleTimeString('es-CO', { hour12: false })
    
    // Colores característicos: Rosa intenso para comandos, Lavanda para mensajes
    const typeColor = isCmd ? '#FF69B4' : '#DDA0DD'
    const typeLabel = isCmd ? ' [ CMD ] ' : ' [ MSG ] '
    
    const type = chalk.hex(typeColor).bold(typeLabel)
    const user = chalk.cyan(`${pushName} `) + chalk.gray(`(@${sender.split('@')[0]})`)
    
    // Ubicación con icono descriptivo
    const location = group 
        ? chalk.yellow(` 👥 ${group}`) 
        : chalk.hex('#8B008B')(' 👤 Privado')

    // Truncado de texto inteligente
    const rawText = String(content || '').replace(/\n/g, ' ') // Evitamos saltos de línea en el log
    const text = rawText.length > 55 ? rawText.substring(0, 52) + '...' : rawText

    // Salida final limpia y alineada
    console.log(
        chalk.gray(`[${time}]`) + 
        type + 
        user + 
        location + 
        chalk.white(`\n╰─> `) + chalk.italic.white(text)
    )
}

export default printLog
