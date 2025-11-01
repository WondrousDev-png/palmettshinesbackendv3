const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
const scheduleApi = require('./api/schedule');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Security & Middleware ---
app.use(cors());
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
const adminAuth = basicAuth({
  users: { 'admin': 'cellosuite123' }, // User: admin, Pass: cellosuite123
  challenge: true,
  unauthorizedResponse: 'Unauthorized Access',
});
app.use(express.json()); // For API requests
app.use(express.urlencoded({ extended: true })); // For Google Sites form
app.use(express.static(path.join(__dirname, 'public')));


// --- Routes ---
app.get('/', (req, res) => {
  res.redirect('/admin');
});
app.get('/admin', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// --- API Routes ---
// PUBLIC
app.post('/api/schedule', apiLimiter, scheduleApi.submitAppointment);

// PROTECTED
app.get('/api/schedule', adminAuth, scheduleApi.getAppointments);
app.post('/api/schedule/confirm/:id', adminAuth, scheduleApi.confirmAppointment);
app.post('/api/schedule/assign/:id', adminAuth, scheduleApi.assignJob);
app.delete('/api/schedule/:id', adminAuth, scheduleApi.deleteJob);
// --- NEW ROUTE ---
app.post('/api/schedule/status/:id', adminAuth, scheduleApi.updateStatus);


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});