import express from 'express'
import cors from 'cors'
import authRouter from '../routers/auth.routes.js'

const app = express()

app.use(express.json())

app.use(cors())




export default app