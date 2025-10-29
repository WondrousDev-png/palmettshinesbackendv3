let appointments = [];

let rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 5;

export const config = {
  path: "/api/schedule",
};

function estimateDuration(car) {
  const lookup = {
    Sedan: 120,
    SUV: 150,
    Truck: 180,
    Convertible: 140,
    Van: 160,
    Other: 130,
  };
  return lookup[car] || 120;
}

function findNextAvailableSlot(appointments, duration) {
  const DAY_START = 9 * 60; // 9am
  const DAY_END = 17 * 60; // 5pm

  const now = new Date();
  let day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let todays = appointments.filter(a => {
    const apptDate = new Date(a.scheduledTime);
    return apptDate.toDateString() === day.toDateString();
  });

  todays.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));

  let lastEnd = DAY_START;
  for (let appt of todays) {
    let apptStart = new Date(appt.scheduledTime);
    let startMinutes = apptStart.getHours() * 60 + apptStart.getMinutes();
    if (startMinutes - lastEnd >= duration) {
      let hour = Math.floor(lastEnd / 60);
      let minute = lastEnd % 60;
      return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
    }
    lastEnd = Math.max(lastEnd, startMinutes + appt.estimatedDuration);
  }

  if (lastEnd + duration <= DAY_END) {
    let hour = Math.floor(lastEnd / 60);
    let minute = lastEnd % 60;
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
  }

  // Next day
  let nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);
  return new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 9, 0);
}

export async function handler(event) {
  const ip = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  let times = rateLimitMap.get(ip) || [];
  times = times.filter(t => now - t < WINDOW_MS);
  if (times.length >= MAX_REQUESTS) {
    return { statusCode: 429, body: JSON.stringify({ message: "Too many requests, please wait." }) };
  }
  times.push(now);
  rateLimitMap.set(ip, times);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ message: "Must POST" }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ message: "Invalid JSON" }) };
  }

  const { name, email, phone, car, subject, message } = data;
  if (!name || !email || !car || !subject || !message) {
    return { statusCode: 400, body: JSON.stringify({ message: "Missing fields" }) };
  }

  if (subject !== "Schedule Service") {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Thanks for reaching out, we will respond soon.", appointment: {} })
    };
  }

  let duration = estimateDuration(car);
  let scheduledTime = findNextAvailableSlot(appointments, duration);

  // Save appointment
  const appointment = {
    id: Date.now(),
    name,
    email,
    phone: phone || "",
    car,
    subject,
    message,
    estimatedDuration: duration,
    scheduledTime: scheduledTime.toISOString(),
  };
  appointments.push(appointment);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Appointment scheduled on ${scheduledTime.toLocaleString()}`,
      appointment,
    }),
  };
}
