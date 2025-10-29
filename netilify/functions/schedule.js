// netlify/functions/schedule.js

let rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

export const config = {
  path: "/api/schedule"
};

export async function handler(event) {
  // Rate limiting by client IP address
  const ip = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  let timestamps = rateLimitMap.get(ip) || [];
  timestamps = timestamps.filter(t => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) {
    return {
      statusCode: 429,
      body: JSON.stringify({ message: 'Too many requests, please wait a moment.' })
    };
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid JSON' })
    };
  }

  const { name, email, car, subject, message, availability } = data;
  if (!name || !email || !car || !subject || !message) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields' })
    };
  }

  const durationByCar = {
    Sedan: 120,
    SUV: 150,
    Truck: 180,
    Convertible: 140,
    Van: 160,
    Other: 130
  };

  const estimatedDuration = durationByCar[car] || 120;

  const appointment = {
    id: Date.now(),
    name,
    email,
    phone: data.phone || '',
    car,
    subject,
    availability: availability || 'To be confirmed',
    message,
    estimatedDuration
  };

  // Could save appointment to DB here if needed

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Appointment for ${name} scheduled. Estimated duration: ${estimatedDuration} minutes.`,
      appointment
    })
  };
}
