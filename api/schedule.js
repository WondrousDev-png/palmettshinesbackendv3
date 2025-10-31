const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'appointments.json');

// --- Helper Functions ---

const getAppointments = async () => {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []; // Return empty array if file doesn't exist
    }
    throw error;
  }
};

const saveAppointments = async (appointments) => {
  await fs.writeFile(DB_PATH, JSON.stringify(appointments, null, 2), 'utf8');
};

const getEstimatedTime = (carType) => {
  switch (carType) {
    case 'Sedan': return 'Approx. 2 hours';
    case 'SUV': return 'Approx. 3 hours';
    case 'Truck': return 'Approx. 3.5 hours';
    case 'Van': return 'Approx. 4 hours';
    default: return 'Approx. 2-4 hours (TBD)';
  }
};

// --- Exported Route Handlers ---

/**
 * PUBLIC - POST /api/schedule
 * Receives a new appointment from the customer.html form.
 */
exports.submitAppointment = async (req, res) => {
  try {
    const { name, email, phone, car, subject, availability, message } = req.body;

    if (!name || !email || !car || !subject) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const appointments = await getAppointments();

    const newAppointment = {
      id: Date.now().toString(),
      receivedAt: new Date().toISOString(),
      name,
      email,
      phone,
      car,
      subject,
      availability: availability || 'N/A',
      message,
      estimatedTime: getEstimatedTime(car),
      status: 'Pending',
      confirmedDate: null,
    };

    appointments.push(newAppointment);
    await saveAppointments(appointments);

    res.status(201).json({ message: 'Your request has been submitted successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

/**
 * PROTECTED - GET /api/schedule
 * Lets the admin.html page fetch all submitted appointments.
 */
exports.getAppointments = async (req, res) => {
  try {
    const appointments = await getAppointments();
    res.status(200).json(appointments.reverse()); // Newest first
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not fetch appointments.' });
  }
};

/**
 * PROTECTED - POST /api/schedule/confirm/:id
 * Allows admin to confirm an appointment and set a date.
 */
exports.confirmAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmedDate } = req.body;

    if (!confirmedDate) {
      return res.status(400).json({ message: 'Confirmed date is required' });
    }

    const appointments = await getAppointments();
    let appointmentFound = false;

    const updatedAppointments = appointments.map(appt => {
      if (appt.id === id) {
        appointmentFound = true;
        return { ...appt, status: 'Confirmed', confirmedDate: confirmedDate };
      }
      return appt;
    });

    if (!appointmentFound) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await saveAppointments(updatedAppointments);
    res.status(200).json({ message: 'Appointment confirmed successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while confirming.' });
  }
};
