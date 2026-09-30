import mongoose from 'mongoose'
import config from './config.js'

const connectDb = async () => {
    try {
        await mongoose.connect(config.MONGO_URI)

        console.log('MongoDB connected successfully')

        return mongoose.connection
    } catch (error) {
        console.error('MongoDB connection failed:', error.message)

        throw error
    }
}

export default connectDb