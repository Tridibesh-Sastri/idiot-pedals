import mongoose from 'mongoose'
import config from './config.js'

const connectDb = ()=>{
    try {
        mongoose.connect(config.MONGO_URI)
    } catch (error) {
        console.error(`Connection error to connect to db ${error}`)
    }
}