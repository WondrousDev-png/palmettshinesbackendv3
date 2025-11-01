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
      return []; 
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

// --- HTML Response Functions ---
const createSuccessHtml = (name) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>
        body { font-family: 'Inter', sans-serif; background-color: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
        .container { padding: 2rem; background-color: white; border-radius: 0.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        h1 { color: #166534; }
        p { color: #374151; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Thank You, ${name}!</h1>
        <p>Your request has been submitted successfully.</p>
        <p>We will get back to you as soon as possible!</p>
      </div>
    </body>
    </html>
  `;
};

const createErrorHtml = (message) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>
        body { font-family: 'Inter', sans-serif; background-color: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
        .container { padding: 2rem; background-color: white; border-radius: 0.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        h1 { color: #991b1b; }
        p { color: #374151; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Error</h1>
        <p>Something went wrong. Please try again.</p>
        <p style="font-size: 0.8rem; color: #6b7280;">Details: ${message}</p>
      </div>
    </body>
    </html>
  `;
};

// --- Exported Route Handlers ---

/**
 * PUBLIC - POST /api/schedule
 */
exports.submitAppointment = async (req, res) => {
  // --- DEBUG LOGGING ---
  console.log('--- New Appointment Submission ---');
  try {
    // This is the most important log
    console.log('Form Body Received:', req.body);

    const { name, email, car, subject, phone, availability, message } = req.body;

    if (!name || !email || !car || !subject) {
      // Log if validation fails
      console.error('Validation Failed: Missing required fields.');
      console.error({ name, email, car, subject });
      return res.status(400).send(createErrorHtml('Missing required fields. Please go back and fill out the form.'));
    }
    
    console.log('Validation Passed.');
    const appointments = await getAppointments();
    console.log(`Found ${appointments.length} existing appointments.`);

    const newAppointment = {
      id: Date.now().toString(),
      receivedAt: new Date().toISOString(),
      name,
      email,
      phone: phone || 'N/A',
      car,
      subject,
      availability: availability || 'N/A',
      message: message || 'N/A',
      estimatedTime: getEstimatedTime(car),
      status: 'Pending',
      confirmedDate: null, 
      assignedTo: null,
    };

    appointments.push(newAppointment);
    
    console.log('Attempting to save...');
    await saveAppointments(appointments);
    console.log('Save successful! New total: ' + appointments.length);

    res.status(201).send(createSuccessHtml(name));

  } catch (error) {
    // --- This will catch any errors from get/save ---
    console.error('--- !! SERVER ERROR !! ---');
    console.error(error.message);
    console.error(error.stack); // Full error details
    res.status(500).send(createErrorHtml('Server error. We have been notified. Please try again later.'));
  }
};

/**
 * PROTECTED - GET /api/schedule
 */
exports.getAppointments = async (req, res) => {
  try {
    const appointments = await getAppointments();
    res.status(200).json(appointments.reverse()); 
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not fetch appointments.' });
  }
};

/**
 * PROTECTED - POST /api/schedule/confirm/:id
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

/**
 * PROTECTED - POST /api/schedule/assign/:id
 */
exports.assignJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(400).json({ message: 'Team member name is required' });
    }

    const appointments = await getAppointments();
    let appointmentFound = false;

    const updatedAppointments = appointments.map(appt => {
      if (appt.id === id) {
        appointmentFound = true;
        return { ...appt, assignedTo: assignedTo };
      }
      return appt;
    });

    if (!appointmentFound) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await saveAppointments(updatedAppointments);
    res.status(200).json({ message: 'Job assigned successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while assigning job.' });
  }
};

/**
 * PROTECTED - DELETE /api/schedule/:id
 */
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const appointments = await getAppointments();
    const updatedAppointments = appointments.filter(appt => appt.id !== id);

    if (appointments.length === updatedAppointments.length) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await saveAppointments(updatedAppointments);
    res.status(200).json({ message: 'Job removed successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while deleting job.' });
  }
};