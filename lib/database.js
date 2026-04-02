import fs from 'fs';
import path from 'path';

class Database {
    constructor(filePath = './database.json') {
        this.filePath = path.resolve(filePath);
        this.data = {
            users: {},
            groups: {},
            chats: {},
            settings: {}
        };
    }

    /**
     * Carga los datos del archivo JSON. 
     * El index.js lo llama como database.read()
     */
    async read() {
        try {
            if (fs.existsSync(this.filePath)) {
                const content = fs.readFileSync(this.filePath, 'utf-8');
                this.data = JSON.parse(content);
            } else {
                await this.write(); // Crea el archivo si no existe
            }
        } catch (e) {
            console.error('🦋 [Error Database]: No se pudo leer el archivo.', e);
            this.data = { users: {}, groups: {}, chats: {}, settings: {} };
        }
    }

    /**
     * Guarda los datos actuales en el archivo JSON.
     */
    async write() {
        try {
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error('🦋 [Error Database]: No se pudo guardar.', e);
        }
    }

    // Alias para mantener compatibilidad con otros plugins
    async load() { return await this.read(); }
    async save() { return await this.write(); }
}

// Exportamos una instancia única para que todo el bot comparta la misma base de datos
const database = new Database();
export { database };
export default database;
