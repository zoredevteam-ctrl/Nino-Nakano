import chalk from 'chalk';

/**
 * Imprime los logs de mensajes y comandos en la consola con estilo
 * @param {boolean} isCmd - Si el mensaje es un comando
 * @param {string} sender - Quién envía el mensaje
 * @param {string|null} group - Nombre del grupo o null si es chat privado
 * @param {string} content - El texto del mensaje
 */
export const printLog = (isCmd, sender, group, content) => {
    const time = new Date().toLocaleTimeString();
    
    // Colores estilo Nino: Magenta para comandos, Rosa para mensajes normales
    const type = isCmd 
        ? chalk.hex('#FF69B4').bold(' [CMD] ') 
        : chalk.hex('#DDA0DD')(' [MSG] ');
    
    const user = chalk.cyan(`@${sender.split('@')[0]}`);
    const location = group 
        ? chalk.yellow(` en ${group}`) 
        : chalk.hex('#8B008B')(' (Privado)');

    // Aseguramos que content sea un string para evitar errores si llega vacío
    const text = String(content || '');

    console.log(
        chalk.gray(`[${time}]`) + 
        type + 
        user + 
        location + 
        chalk.white(`: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`)
    );
};

// Si prefieres exportarlo como un objeto por defecto
export default { printLog };
