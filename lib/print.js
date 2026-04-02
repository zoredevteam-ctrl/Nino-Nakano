const chalk = require('chalk');

const printLog = (isCmd, sender, group, content) => {
    const time = new Date().toLocaleTimeString();
    const type = isCmd ? chalk.magenta(' [CMD] ') : chalk.blue(' [MSG] ');
    const user = chalk.cyan(`@${sender}`);
    const location = group ? chalk.yellow(` en ${group}`) : chalk.green(' (DM)');
    
    console.log(
        chalk.gray(`[${time}]`) + 
        type + 
        user + 
        location + 
        chalk.white(`: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`)
    );
};

module.exports = { printLog };
