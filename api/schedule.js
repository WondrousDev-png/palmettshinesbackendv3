const express = require('express');
const fs = require('fs').promises; // Use promises for async file handling
const path = require('path');

const router = express.Router();
const DB_PATH = path.join(__dirname, '..', 'appointments.json');

// A helper function to read the appointments database
const getAppointments = async () => {
  try {
    // Try to read the file
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist, return an empty array
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

// A helper function to save the appointments database
const saveAppointments = async (appointments) => {
  await fs.writeFile(DB_PATH, JSON.stringify(appointments, null, 2), 'utf8');
};

// ✨ Your custom logic for estimating time
const getEstimatedTime = (carType) => {
  switch (carType) {
    case 'Sedan':
      return 'Approx. 2 hours';
    case 'SUV':
      return 'Approx. 3 hours';
    case 'Truck':
      return 'Approx. 3.5 hours';
    case 'Van':
      return 'Approx. 4 hours';
    default:
      return 'Approx. 2-4 hours (TBD)';
  }
};

// --- API ENDPOINTS ---

/**
 * POST /api/schedule
 * Receives a new appointment from the customer.html form.
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, car, subject, availability, message } = req.body;

    // Basic validation
    if (!name || !email || !car || !subject) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const appointments = await getAppointments();

    const newAppointment = {
      id: Date.now().toString(), // Simple unique ID
      receivedAt: new Date().toISOString(),
      name,
      email,
      phone,
      car,
      subject,
      availability: availability || 'N/A',
      message,
      estimatedTime: getEstimatedTime(car), // ✨ Auto-calculate time
      status: 'Pending', // For your admin panel
    };

    appointments.push(newAppointment);
    await saveAppointments(appointments);

    res.status(201).json({ message: 'Your request has been submitted successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

/**
 * GET /api/schedule
 * Lets the admin.html page fetch all submitted appointments.
 */
router.get('/', async (req, res) => {
  try {
    const appointments = await getAppointments();
    // Return newest first
    res.status(200).json(appointments.reverse());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not fetch appointments.' });
  }
});

module.exports = router;