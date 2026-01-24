import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: 'JWT_SECRET not configured' });
    }
    const user = jwt.verify(token, secret);
    req.user = user; // Attach user info to request
    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

// Middleware to check if user is super admin (admin@gmail.com)
export const isSuperAdmin = (req, res, next) => {
  if (req.user.email !== 'admin@gmail.com' || !req.user.isSuperAdmin) {
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied. Super admin privileges required.' 
    });
  }
  next();
};