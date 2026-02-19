const { ActivityLog } = require('../models');

const logActivity = async (req, res, next) => {
  // Log after response is sent
  const originalSend = res.send;
  res.send = function(data) {
    res.send = originalSend;
    
    // Only log if user is authenticated and request was successful
    if (req.user && res.statusCode < 400) {
      const action = `${req.method} ${req.path}`;
      const entityType = req.path.split('/')[2] || 'unknown';
      
      ActivityLog.create({
        userId: req.user.id,
        action,
        entityType,
        entityId: req.params.id || null,
        details: {
          body: req.path.includes('change-password') ? {} : req.body,
          query: req.query
        },
        ipAddress: req.ip || req.connection.remoteAddress
      }).catch(err => console.error('Activity log error:', err));
    }
    
    return res.send(data);
  };
  
  next();
};

module.exports = logActivity;

