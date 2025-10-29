import { Handler } from '@netlify/functions';

// Import appointments from storage if implemented; here referenced from schedule.js
// For simplicity, we keep appointments in-memory, so we share data inside the function files.
// To properly share, use external DB or state (not shown here).
// This example assumes appointments stored here.

let appointments = []; // This should be in a shared or DB module

export const handler: Handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify(appointments),
  };
};
