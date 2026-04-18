import express from 'express'
   import path from 'path'
   import { fileURLToPath } from 'url'

   // Bot imports
   import './settings.js'
   import { startBot } from './index.js'

   const app = express();
   const PORT = process.env.PORT || 3000;

   // Servir la web
   app.use(express.static(path.join(__dirname, 'public')));
   app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

   app.listen(PORT, () => {
       console.log(`🔗 Servidor corriendo en: http://localhost:${PORT}`);
   });

   // Iniciar el bot
   startBot();