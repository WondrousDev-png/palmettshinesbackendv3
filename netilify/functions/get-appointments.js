export async function handler() {
  // This shares the same 'appointments' array with schedule.js in a real app must use persisted DB
  return {
    statusCode: 200,
    body: JSON.stringify(require('./schedule').appointments || [])
  };
}
