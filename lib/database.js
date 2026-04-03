import fs from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import chalk from 'chalk'

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
        this._isWriting = false

        // Iniciamos el ciclo de auto-guardado inteligente
        this._startAutoSave()
    }

    /**
     * Carga los datos de forma asíncrona
     */
    async read() {
        if (this._isReading) return
        this._isReading = true
        try {
            if (existsSync(this.filePath)) {
                const content = await fs.readFile(this.filePath, 'utf-8')
                // Validamos que el archivo no esté vacío antes de parsear
                if (content.trim().length > 0) {
                    this.data = JSON.parse(content)
                }
            } else {
                console.log(chalk.cyan('🦋 [Database]: Archivo no encontrado. Creando uno nuevo...'))
                await this.write()
            }
        } catch (e) {
            console.error(chalk.red('🦋 [Database Error]:'), 'El archivo está corrupto. Usando base vacía para evitar crash.')
            // No sobreescribimos el archivo corrupto inmediatamente, dejamos que el usuario lo revise
            this.data = { users: {}, groups: {}, chats: {}, settings: {} }
        } finally {
            this._isReading = false
        }
    }

    /**
     * Guarda los datos de forma atómica (Método Z0RT SYSTEMS)
     */
    async write() {
        if (this._isWriting) return
        this._isWriting = true
        try {
            // Protección: No guardar si la data esencial se perdió
            if (!this.data || typeof this.data !== 'object') return

            const dir = path.dirname(this.filePath)
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

            const tmpPath = `${this.filePath}.tmp`
            const strData = JSON.stringify(this.data, null, 2)
            
            await fs.writeFile(tmpPath, strData)
            await fs.rename(tmpPath, this.filePath) 
        } catch (e) {
            console.error(chalk.red('🦋 [Database]: Error al sincronizar datos.'), e)
        } finally {
            this._isWriting = false
        }
    }

    /**
     * Ciclo de auto-guardado que no colapsa el bot
     */
    async _startAutoSave() {
        // Guardamos cada 40 segundos para no estresar el almacenamiento de Termux
        await new Promise(resolve => setTimeout(resolve, 40000))
        await this.write()
        this._startAutoSave() // Llamada recursiva segura
    }

    // Alias para compatibilidad con el resto de tus archivos
    async load() { await this.read() }
    async save() { await this.write() }
}

const database = new Database()
export { database }
export default database
