/**
 * Middleware Mode Demonstration — Read-Only Guard
 * Blocks all mutations (POST, PUT, PATCH, DELETE) when demo mode is active.
 * Demo mode is activated via: query param ?demo=1 OR cookie demo_mode=true
 */

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const DEMO_ACTIVE_HEADER = 'X-Demo-Mode';

function isDemoMode(req) {
  // Priority 1: query param
  if (req.query.demo === '1' || req.query.demo === 'true') return true;
  // Priority 2: cookie
  const cookieHeader = req.headers['cookie'] || '';
  if (cookieHeader.includes('demo_mode=true')) return true;
  // Priority 3: explicit header
  if (req.headers[DEMO_ACTIVE_HEADER.toLowerCase()] === 'true') return true;
  return false;
}

function demoModeMiddleware(req, res, next) {
  if (!isDemoMode(req)) return next();
  if (!MUTATING_METHODS.includes(req.method.toUpperCase())) return next();

  return res.status(403).json({
    error: 'Mode Démo : La modification des données est désactivée.',
    demo: true,
    code: 'DEMO_MODE_READONLY'
  });
}

module.exports = { demoModeMiddleware, isDemoMode };
