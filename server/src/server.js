import http from 'node:http'
import mongoose from 'mongoose'

import app from './app/app.js'
import connectDb from './config/db.connect.js'
import config from './config/config.js'
import { initCleanupJob } from './jobs/cleanupTokens.js'
import { initStockReleaseJob } from './jobs/releaseExpiredStock.js'

let server
let cleanupJob
let stockReleaseJob
let isShuttingDown = false

const SHUTDOWN_TIMEOUT_MS = 10_000

/*
 * -------------------------------------------------------
 * START SERVER
 * -------------------------------------------------------
 */

const startServer = async () => {
    try {
        /*
         * ---------------------------------------------------
         * DATABASE FIRST
         * ---------------------------------------------------
         *
         * The HTTP server must not accept requests until
         * MongoDB has successfully connected.
         */

        await connectDb()

        /*
         * ---------------------------------------------------
         * HTTP SERVER
         * ---------------------------------------------------
         */

        server = http.createServer(app)

        /*
         * ---------------------------------------------------
         * HTTP SERVER ERROR
         * ---------------------------------------------------
         */

        server.on('error', (error) => {
            console.error('HTTP server error:', error)

            /*
             * If the server cannot bind/listen during startup,
             * terminate the process instead of continuing in
             * an unknown state.
             */

            if (!server.listening) {
                process.exitCode = 1
            }
        })

        /*
         * ---------------------------------------------------
         * START LISTENING
         * ---------------------------------------------------
         */

        server.listen(config.PORT, () => {
            console.log(
                `Server is running on port ${config.PORT}`
            )

            /*
             * Start background jobs only after the
             * application is successfully listening.
             */

            try {
                cleanupJob = initCleanupJob()
                stockReleaseJob = initStockReleaseJob()
            } catch (error) {
                console.error(
                    'Failed to initialize background jobs:',
                    error
                )

                /*
                 * Background maintenance must not stop the API from
                 * serving, but the failure must remain visible.
                 */
            }
        })
    } catch (error) {
        console.error('Failed to start server:', error)

        /*
         * Startup failure is fatal.
         */

        process.exitCode = 1
    }
}

/*
 * -------------------------------------------------------
 * GRACEFUL SHUTDOWN
 * -------------------------------------------------------
 *
 * Triggered by:
 *
 * SIGTERM → container/platform shutdown
 * SIGINT  → Ctrl+C/local shutdown
 *
 * fatal = true:
 *   Process exits with code 1.
 *
 * fatal = false:
 *   Normal graceful shutdown, exit code 0.
 */

const shutdown = async (signal, fatal = false) => {
    if (isShuttingDown) {
        return
    }

    isShuttingDown = true

    console.log(
        `Received ${signal}. Starting shutdown...`
    )

    /*
     * ---------------------------------------------------
     * SHUTDOWN TIMEOUT
     * ---------------------------------------------------
     *
     * Prevent the process from hanging forever because
     * of an open connection or stuck shutdown operation.
     */

    const forceExitTimer = setTimeout(() => {
        console.error(
            `Shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms.`
        )

        process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS)

    /*
     * Do not keep the Node.js event loop alive solely
     * because of this timer.
     */

    forceExitTimer.unref()

    try {
        /*
         * ---------------------------------------------------
         * STOP ACCEPTING NEW HTTP CONNECTIONS
         * ---------------------------------------------------
         */

        if (server?.listening) {
            await new Promise((resolve) => {
                server.close((error) => {
                    if (error) {
                        console.error(
                            'Error while closing HTTP server:',
                            error
                        )
                    }

                    resolve()
                })
            })
        }

        /*
         * ---------------------------------------------------
         * STOP BACKGROUND JOBS
         * ---------------------------------------------------
         */

        if (
            cleanupJob &&
            typeof cleanupJob.stop === 'function'
        ) {
            cleanupJob.stop()
            cleanupJob = undefined
        }

        if (
            stockReleaseJob &&
            typeof stockReleaseJob.stop === 'function'
        ) {
            stockReleaseJob.stop()
            stockReleaseJob = undefined
        }

        /*
         * ---------------------------------------------------
         * CLOSE DATABASE CONNECTION
         * ---------------------------------------------------
         */

        if (
            mongoose.connection.readyState !== 0
        ) {
            await mongoose.connection.close()

            console.log(
                'MongoDB connection closed.'
            )
        }
    } catch (error) {
        console.error(
            'Error during shutdown:',
            error
        )

        fatal = true
    } finally {
        clearTimeout(forceExitTimer)

        console.log('Server shutdown completed.')

        process.exit(fatal ? 1 : 0)
    }
}

/*
 * -------------------------------------------------------
 * PROCESS SIGNALS
 * -------------------------------------------------------
 */

process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
})

process.on('SIGINT', () => {
    void shutdown('SIGINT')
})

/*
 * -------------------------------------------------------
 * UNHANDLED PROMISE REJECTION
 * -------------------------------------------------------
 *
 * An unhandled rejection can leave the application in an
 * unknown state. Treat it as a fatal application error.
 */

process.on('unhandledRejection', (reason) => {
    console.error(
        'Unhandled promise rejection:',
        reason
    )

    void shutdown(
        'unhandledRejection',
        true
    )
})

/*
 * -------------------------------------------------------
 * UNCAUGHT EXCEPTION
 * -------------------------------------------------------
 *
 * Once Node reaches an uncaught exception, continuing
 * operation is unsafe.
 */

process.on('uncaughtException', (error) => {
    console.error(
        'Uncaught exception:',
        error
    )

    void shutdown(
        'uncaughtException',
        true
    )
})

/*
 * -------------------------------------------------------
 * START
 * -------------------------------------------------------
 */

await startServer()