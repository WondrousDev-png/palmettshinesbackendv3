const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const scheduleRoutes = require('./api/schedule');

const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ Rate Limiting: Basic DDoS protection
// This allows 100 requests per 15 minutes from a single IP.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Apply the rate limiter to all API requests
app.use('/api/', limiter);

// Middleware to parse JSON bodies (from your form)
app.use(express.json());

// Serve static files (admin.html and customer.html)
// This serves public/index.html at the root URL (/)
app.use(express.static(path.join(__dirname, 'public')));

// Use your API routes
app.use('/api/schedule', scheduleRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});