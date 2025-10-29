// This must share appointment data source or use DB in production.
// For demonstration, we create a simple importable appointments storage.

let appointments = [];

export async function handler() {
  return {
    statusCode: 200,
    body: JSON.stringify(appointments),
  };
}
