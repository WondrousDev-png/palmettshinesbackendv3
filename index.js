const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
const scheduleApi = require('./api/schedule');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Security & Middleware ---

// 1. CORS: Allow all websites to access your API (for customer.html)
app.use(cors());

// 2. Rate Limiting: Basic DDoS protection
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// 3. Admin Password Protection
const adminAuth = basicAuth({
  users: { 'admin': 'cellosuite123' }, // User: admin, Pass: cellosuite123
  challenge: true, // This pops up the native browser login dialog
  unauthorizedResponse: 'Unauthorized Access',
});

// 4. Body Parser
app.use(express.json());

// 5. Static Files (for customer.html)
app.use(express.static(path.join(__dirname, 'public')));


// --- Routes ---

// 1. Root: Redirects to the admin login
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// 2. Admin Panel HTML Route (Protected)
// Users must enter the password to see this page
app.get('/admin', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// 3. API Routes
// PUBLIC: Customer can submit a form (rate-limited)
app.post('/api/schedule', apiLimiter, scheduleApi.submitAppointment);

// PROTECTED: Admin-only routes (password-protected)
app.get('/api/schedule', adminAuth, scheduleApi.getAppointments);
app.post('/api/schedule/confirm/:id', adminAuth, scheduleApi.confirmAppointment);


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

