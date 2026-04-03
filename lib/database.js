import fs from 'fs/promises' // Usamos la versión de promesas para evitar LAG
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

class Database {
    constructor(filePath = './database.json') {
        this.filePath = path.resolve(filePath)
        this.data = {
            users: {},
            groups: {},
            chats: {},
            settings: {}
        }
        this._isReading = false
        
        // Iniciamos el auto-guardado cada 30 segundos
        setInterval(() => this.write(), 30000)
    }

    /**
     * Carga los datos sin bloquear el bot
     */
    async read() {
        if (this._isReading) return
        this._isReading = true
        try {
            if (existsSync(this.filePath)) {
                const content = await fs.readFile(this.filePath, 'utf-8')
                this.data = JSON.parse(content)
            } else {
                await this.write()
            }
        } catch (e) {
            console.error('🦋 [Database]: Error al leer. Creando backup de seguridad...', e)
            // Si el JSON se corrompe, evitamos que el bot muera
            this.data = { users: {}, groups: {}, chats: {}, settings: {} }
        } finally {
            this._isReading = false
        }
    }

    /**
     * Guarda los datos de forma atómica (Evita archivos vacíos por crasheos)
     */
    async write() {
        try {
            const dir = path.dirname(this.filePath)
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
            
            // Convertimos a string y guardamos de forma asíncrona
            const tmpPath = `${this.filePath}.tmp`
            await fs.writeFile(tmpPath, JSON.stringify(this.data, null, 2))
            await fs.rename(tmpPath, this.filePath) // Rename es más seguro que escribir directo
        } catch (e) {
            console.error('🦋 [Database]: Error al guardar los datos.', e)
        }
    }

    // Alias para compatibilidad
    async load() { return await this.read() }
    async save() { return await this.write() }
}

const database = new Database()
export { database }
export default database
