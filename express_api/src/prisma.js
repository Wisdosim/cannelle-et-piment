try { require('dotenv').config(); } catch (e) {}
const { PrismaClient } = require('@prisma/client');

// Singleton Prisma client - warn/error only in production
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

module.exports = prisma;
