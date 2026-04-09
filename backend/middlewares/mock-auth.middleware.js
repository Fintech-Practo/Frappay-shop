// Mock Authentication Middleware for Development Testing
// WARNING: Use ONLY in development environment!

const mockUsers = {
  regular: {
    userId: 1,
    email: 'testuser@example.com',
    role: 'USER',
    name: 'Test User'
  },
  admin: {
    userId: 2,
    email: 'admin@example.com',
    role: 'ADMIN',
    name: 'Admin User'
  },
  seller: {
    userId: 3,
    email: 'seller@example.com',
    role: 'SELLER',
    name: 'Seller User'
  }
};

const mockAuth = (userType = 'regular') => {
  return (req, res, next) => {
    // Check if mock auth is enabled via environment variable
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Mock auth not allowed in production' });
    }

    // Check for X-Mock-User header to specify user type
    const mockUserType = req.headers['x-mock-user'] || userType;
    
    if (mockUsers[mockUserType]) {
      req.user = mockUsers[mockUserType];
      console.log(`🔓 Mock Auth: Using ${mockUserType} user`, req.user);
      next();
    } else {
      res.status(401).json({ error: 'Invalid mock user type' });
    }
  };
};

module.exports = mockAuth;
