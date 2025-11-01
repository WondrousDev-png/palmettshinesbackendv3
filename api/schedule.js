// --- NEW: Import Vercel KV ---
const { kv } = require('@vercel/kv');

// --- Helper Functions (Rewritten for KV) ---
const getAppointments = async () => {
  // Get the array from the database. If it doesn't exist, return [].
  const appointments = await kv.get('appointments');
  return appointments || [];
};

const saveAppointments = async (appointments) => {
  // Save the entire array back to the database
  await kv.set('appointments', appointments);
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

// --- Exported Route Handlers (Logic is identical, just uses new helpers) ---

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

