import 'dotenv/config'
import { createApiApp } from './api.js'

const port = Number(process.env.API_PORT || 3001)
const app = createApiApp()
app.listen(port, '127.0.0.1', () => {
  console.log(`FORGE. API listening on http://127.0.0.1:${port}`)
})
