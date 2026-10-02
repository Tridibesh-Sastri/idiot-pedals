import mongoose from 'mongoose'
import config from './config.js'

/*
 * Connection pool and timeouts.
 *
 * Without an explicit serverSelectionTimeoutMS a request against an unreachable
 * database hangs until the driver's default (30s) elapses, which shows up as a
 * stuck request rather than a fast error. socketTimeoutMS bounds a connection
 * that has gone silent mid-operation.
 */
const CONNECT_OPTIONS = {
    maxPoolSize: config.MONGO_MAX_POOL_SIZE,
    minPoolSize: config.MONGO_MIN_POOL_SIZE,
    serverSelectionTimeoutMS: config.MONGO_SERVER_SELECTION_TIMEOUT_MS,
    socketTimeoutMS: config.MONGO_SOCKET_TIMEOUT_MS,
    // Return a definitive error instead of retrying writes forever.
    retryWrites: true,
}

const connectDb = async () => {
    try {
        await mongoose.connect(config.MONGO_URI, CONNECT_OPTIONS)

        console.log(
            `MongoDB connected successfully (pool ${config.MONGO_MIN_POOL_SIZE}-${config.MONGO_MAX_POOL_SIZE})`
        )

        return mongoose.connection
    } catch (error) {
        console.error('MongoDB connection failed:', error.message)

        throw error
    }
}

export { CONNECT_OPTIONS }
export default connectDb