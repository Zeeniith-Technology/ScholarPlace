import dotenv from 'dotenv';
// Load environment variables FIRST before importing services
dotenv.config();

// Production safety: refuse to start with default/weak JWT_SECRET
if (process.env.NODE_ENV === 'production') {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'your-secret-key' || secret.length < 32) {
        console.error('Production requires a strong JWT_SECRET (min 32 chars). Do not use the default.');
        process.exit(1);
    }
    if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('localhost')) {
        console.error('Production requires MONGO_URI to point to a non-local database.');
        process.exit(1);
    }
    if (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.includes('localhost')) {
        console.error('Production requires FRONTEND_URL to be your live frontend URL (e.g. https://...).');
        process.exit(1);
    }
}

import cluster from 'node:cluster';
import os from 'node:os';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { connectDB } from './methods.js';
import router from './router.js';
// Initialize AI Service at startup to ensure it's ready
import './services/aiService.js';

// Cluster: set USE_CLUSTER=true to run multiple workers (resilience + load spread). Default off for local dev.
const useCluster = process.env.USE_CLUSTER === 'true';
const numWorkers = Math.max(1, parseInt(process.env.CLUSTER_WORKERS, 10) || Math.min(os.cpus().length, 4));

if (useCluster && cluster.isPrimary) {
    console.log(`🔄 Primary ${process.pid}: spawning ${numWorkers} worker(s)`);
    for (let i = 0; i < numWorkers; i++) cluster.fork();
    cluster.on('exit', (worker, code, signal) => {
        console.log(`⚠️ Worker ${worker.process.pid} exited (${code || signal}). Restarting.`);
        cluster.fork();
    });
    // Primary process does not start the HTTP server; workers do.
} else {
    // Worker process (or single-process when USE_CLUSTER is not set): start the server
    if (useCluster && cluster.isWorker && !process.env.MONGO_MAX_POOL_SIZE) {
        process.env.MONGO_MAX_POOL_SIZE = String(Math.max(25, Math.floor(200 / numWorkers)));
    }

    const app = express();
    const httpServer = createServer(app);

    const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://scholarplace.in",
        "https://www.scholarplace.in",
        process.env.FRONTEND_URL
    ].filter((v, i, a) => v && a.indexOf(v) === i); // Unique non-empty values

    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    const port = process.env.PORT || 5000;

    // Middleware
    app.use(cors({
        origin: allowedOrigins,
        credentials: true
    }));
    app.use(cookieParser()); // Parse cookies
    // Allow larger payloads for code submissions (default 100kb can be tight)
    app.use(express.json({ limit: process.env.BODY_JSON_LIMIT || '2mb' }));
    app.use(express.urlencoded({ extended: true, limit: process.env.BODY_URLENC_LIMIT || '2mb' }));

    // Socket.io connection handling
    io.use((socket, next) => {
        // Authenticate socket connection using JWT token
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const secret = process.env.JWT_SECRET || 'your-secret-key';
            const decoded = jwt.verify(token, secret);

            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            socket.user = decoded;
            next();
        } catch (error) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`✅ User connected: ${socket.userId} (${socket.userRole})`);

        // Join user-specific room for progress updates
        socket.join(`user:${socket.userId}`);

        // Join admin room if admin/superadmin
        if (socket.userRole === 'Admin' || socket.userRole === 'Superadmin') {
            socket.join('admin');
        }

        // Handle progress tracking events
        socket.on('track-progress', async (data) => {
            try {
                const { week, day, action, progressData } = data;

                // Emit progress update to the user's room
                io.to(`user:${socket.userId}`).emit('progress-updated', {
                    week,
                    day,
                    action,
                    progressData,
                    timestamp: new Date()
                });

                // If admin, also notify admin room
                io.to('admin').emit('student-progress-updated', {
                    userId: socket.userId,
                    week,
                    day,
                    action,
                    progressData,
                    timestamp: new Date()
                });
            } catch (error) {
                socket.emit('error', { message: 'Failed to track progress' });
            }
        });

        // Handle study session tracking
        socket.on('study-session-start', async (data) => {
            const { week, day } = data;
            socket.currentWeek = week;
            socket.currentDay = day;
            socket.sessionStartTime = Date.now();

            // Join week-specific room for broadcasting
            socket.join(`week:${week}`);
        });

        socket.on('study-session-update', async (data) => {
            const { week, day, timeSpent, progress } = data;

            // Emit real-time progress to user
            io.to(`user:${socket.userId}`).emit('study-progress', {
                week,
                day,
                timeSpent,
                progress,
                timestamp: new Date()
            });
        });

        socket.on('disconnect', () => {
            console.log(`❌ User disconnected: ${socket.userId}`);
        });
    });

    // Make io available to routes
    app.set('io', io);

    // Connect to MongoDB first
    connectDB()
        .then(() => {
            // Use router for ALL routes
            app.use('/', router);

            // Health check
            app.get('/health', (req, res) => {
                res.json({ status: 'ok', message: 'Server is running' });
            });

            // Start server
            httpServer.listen(port, () => {
                console.log(`🚀 Server connected on port ${port}`);
                console.log(`📡 WebSocket server ready for real-time updates`);

                // 🟢 Render Keep-Alive Logic
                // Pings the server every 14 minutes (840,000 ms) to prevent sleep
                if (process.env.NODE_ENV === 'production') {
                    const interval = 14 * 60 * 1000; // 14 minutes
                    const serverUrl = process.env.SERVER_URL ||
                        (process.env.RENDER_EXTERNAL_URL ? process.env.RENDER_EXTERNAL_URL : null);

                    if (serverUrl) {
                        console.log(`⏰ Keep-Alive enabled for: ${serverUrl}`);
                        setInterval(() => {
                            fetch(`${serverUrl}/health`)
                                .then(res => console.log(`🔄 Self-ping success: ${res.status}`))
                                .catch(err => console.error(`❌ Self-ping failed:`, err.message));
                        }, interval);
                    } else {
                        console.log('⚠️ Keep-Alive skipped: SERVER_URL or RENDER_EXTERNAL_URL not set');
                    }
                }
            });
        })
        .catch((error) => {
            console.error('Failed to start server:', error);
            process.exit(1);
        });
} // end cluster worker / single-process block
