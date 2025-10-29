// We export the same 'appointments' array for demo purposes; in real, this needs shared DB or KV store.

import { Handler } from '@netlify/functions';

let appointments = []; // This should be external DB in production

export const handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify(appointments),
  };
};
