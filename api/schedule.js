const Redis = require('ioredis');

let redis;

// --- NEW DEBUGGING ---
// Print all environment variables to see what Railway is providing
console.log("--- App Starting ---");
console.log("--- All Environment Variables ---");
console.log(process.env);
console.log("---------------------------------");
// --- END DEBUGGING ---

// --- NEW: Resilient Connection ---
if (process.env.REDISHOST && process.env.REDISPORT && process.env.REDISPASSWORD) {
  // If variables exist, connect to the real database.
  redis = new Redis({
    host: process.env.REDISHOST,
    port: process.env.REDISPORT,
    password: process.env.REDISPASSWORD,
    maxRetriesPerRequest: null
  });
  redis.on('connect', () => console.log('Connected to Redis database!'));
  redis.on('error', (err) => console.error('Redis Connection Error:', err));
} else {
  // --- This prevents the crash ---
  console.warn('--- REDIS ENV VARS NOT FOUND ---');
  console.warn('App is running in "mock" database mode.');
  console.warn('Please add a Redis service in Railway to enable data saving.');
  
  let mockAppointments = [];
  redis = {
    get: async (key) => {
      console.log('Mock DB: Getting appointments');
      return JSON.stringify(mockAppointments);
    },
    set: async (key, value) => {
      console.warn('Mock DB: "Saving" appointments (not really). Add Redis to save.');
      mockAppointments = JSON.parse(value);
      return 'OK';
    },
  };
}

// --- Helper Functions (Rewritten for Redis) ---
const getAppointments = async () => {
  const data = await redis.get('appointments');
  if (!data) {
    return [];
  }
  return JSON.parse(data);
};

const saveAppointments = async (appointments) => {
  await redis.set('appointments', JSON.stringify(appointments));
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

// --- HTML Response Functions (No Change) ---
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

// --- Exported Route Handlers (No logic change needed) ---

exports.submitAppointment = async (req, res) => {
  try {
    const { name, email, car, subject, phone, availability, message } = req.body;
    if (!name || !email || !car || !subject) {
      return res.status(400).send(createErrorHtml('Missing required fields.'));
    }
    const appointments = await getAppointments();
    const newAppointment = {
      id: Date.now().toString(),
      receivedAt: new Date().toISOString(),
      name, email, phone: phone || 'N/A', car, subject,
      availability: availability || 'N/A',
      message: message || 'N/A',
      estimatedTime: getEstimatedTime(car),
      status: 'Pending',
      confirmedDate: null, 
      assignedTo: [],
    };
    appointments.push(newAppointment);
    await saveAppointments(appointments);
    res.status(201).send(createSuccessHtml(name));
  } catch (error) {
    console.error("Error in submitAppointment:", error);
    res.status(500).send(createErrorHtml('Server error.'));
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const appointments = await getAppointments();
    res.status(200).json(appointments.reverse()); 
  } catch (error) {
    console.error("Error in getAppointments:", error);
    res.status(500).json({ message: 'Could not fetch appointments.' });
  }
};

exports.confirmAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmedDate } = req.body;
    const appointments = await getAppointments();
    const updatedAppointments = appointments.map(appt => {
      if (appt.id === id) {
        return { ...appt, status: 'Confirmed', confirmedDate: confirmedDate };
      }
      return appt;
    });
    await saveAppointments(updatedAppointments);
    res.status(200).json({ message: 'Appointment confirmed' });
  } catch (error) {
    console.error("Error in confirmAppointment:", error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const appointments = await getAppointments();
    const updatedAppointments = appointments.map(appt => {
      if (appt.id === id) {
        return { ...appt, status: status };
      }
      return appt;
    });
    await saveAppointments(updatedAppointments);
    res.status(200).json({ message: 'Status updated' });
  } catch (error) {
    console.error("Error in updateStatus:", error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.assignJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const appointments = await getAppointments();
    const updatedAppointments = appointments.map(appt => {
      if (appt.id === id) {
        return { ...appt, assignedTo: assignedTo };
      }
      return appt;
    });
    await saveAppointments(updatedAppointments);
    res.status(200).json({ message: 'Job assigned' });
  } catch (error) {
    console.error("Error in assignJob:", error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const appointments = await getAppointments();
    const updatedAppointments = appointments.filter(appt => appt.id !== id);
    await saveAppointments(updatedAppointments);
    res.status(200).json({ message: 'Job removed' });
  } catch (error) {
    console.error("Error in deleteJob:", error);
    res.status(500).json({ message: 'Server error.' });
  }
};

