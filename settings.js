const fs = require('fs');

// Configuración de Identidad
global.botName = 'Nino Nakano';
global.ownerName = 'Z0RT SYSTEMS';
global.ownerNumber = '57XXXXXXXXX'; // Tu número sin el @s.whatsapp.net
global.prefix = '#';

// Enlaces y Visuales
global.rcanal = 'https://whatsapp.com/channel/0029Vb6p68rF6smrH4Jeay3Y';
global.banner = 'https://i.pinimg.com/736x/d6/33/16/d633161c60668b556f8f53765e94b294.jpg'; // Imagen de Nino 🦋

// Mensajes de Sistema (Estilo Tsundere)
global.mess = {
    wait: 'Un momento, no me apresures... 🦋',
    success: '¡Listo! Qué fácil fue. ✨',
    error: 'Ugh, algo salió mal en el código. Revísalo, tonto. 💢',
    owner: '¿Y tú quién eres? Este comando es solo para mi creador. 😤',
    group: '¡Oye! Esto solo funciona en grupos. 🙄',
    admin: '¿Quién te crees? Solo los administradores pueden hacer esto. 💅',
    botAdmin: 'Primero hazme administradora si quieres que haga el trabajo por ti. 😒'
};

// Guardado automático al editar este archivo
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log('¡Actualizado settings.js!');
    delete require.cache[file];
    require(file);
});
