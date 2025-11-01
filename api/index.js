const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
const scheduleApi = require('./schedule.js'); // Updated path

const app = express();

// --- Security & Middleware ---
app.use(cors());
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
const adminAuth = basicAuth({
  users: { 'admin': 'cellosuite123' },
  challenge: true,
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- UPDATED: Vercel path for static files ---
// Vercel automatically serves the 'public' folder.
// This code explicitly serves the 'public' folder for Express.
app.use(express.static(path.join(process.cwd(), 'public')));


// --- Routes ---
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// --- UPDATED: Vercel path for views ---
app.get('/admin', adminAuth, (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'admin.html'));
});

// --- API Routes ---
app.post('/api/schedule', apiLimiter, scheduleApi.submitAppointment);
app.get('/api/schedule', adminAuth, scheduleApi.getAppointments);
app.post('/api/schedule/confirm/:id', adminAuth, scheduleApi.confirmAppointment);
app.post('/api/schedule/assign/:id', adminAuth, scheduleApi.assignJob);
app.delete('/api/schedule/:id', adminAuth, scheduleApi.deleteJob);
app.post('/api/schedule/status/:id', adminAuth, scheduleApi.updateStatus);


// --- IMPORTANT ---
// We no longer call app.listen()
// We export the app for Vercel to run
module.exports = app;
