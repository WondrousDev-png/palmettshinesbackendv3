const list = document.getElementById('appointments-list');
const loading = document.getElementById('loading');
const refreshBtn = document.getElementById('refresh-btn');
const team = ['Charles', 'Kempson', 'Wilson', 'James'];

// --- NEW: Assign Job Function (Handles Checkboxes) ---
async function assignJob(id) {
  const form = document.getElementById(`assign-form-${id}`);
  const checkboxes = form.querySelectorAll('input[type="checkbox"]:checked');
  
  // Build an array of the names that are checked
  const assignedTo = Array.from(checkboxes).map(cb => cb.value);

  try {
    const response = await fetch(`/api/schedule/assign/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Send the array of names
      body: JSON.stringify({ assignedTo: assignedTo })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to assign');
    }
    
    fetchAppointments(); // Refresh list

  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// --- NEW: Update Status Function ---
async function updateStatus(id, newStatus) {
  try {
    const response = await fetch(`/api/schedule/status/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update status');
    }
    
    fetchAppointments(); // Refresh list
  } catch (error) {
    alert('Error: ' + error.message);
  }
}


// --- Delete/Complete Job Function ---
async function deleteJob(id, action) {
  const msg = action === 'complete'
    ? 'Are you sure you want to mark this job as completed and remove it from the list?'
    : 'Are you sure you want to permanently delete this job? This cannot be undone.';
  
  if (confirm(msg)) {
    try {
      const response = await fetch(`/api/schedule/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete');
      }

      fetchAppointments(); // Refresh list

    } catch (error) {
      alert('Error: ' + error.message);
    }
  }
}

// --- Confirm Appointment Function ---
async function confirmAppointment(id) {
  const dateInput = document.getElementById(`date-input-${id}`);
  const confirmedDate = dateInput.value;
  
  if (!confirmedDate) {
    alert('Please enter a date and time.'); 
    return;
  }

  try {
    const response = await fetch(`/api/schedule/confirm/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmedDate: confirmedDate })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to confirm');
    }

    fetchAppointments();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// --- Fetch Appointments (Heavily Updated) ---
const fetchAppointments = async () => {
  list.innerHTML = ''; 
  loading.style.display = 'block'; 

  try {
    const response = await fetch('/api/schedule');
    if (response.status === 401) {
      list.innerHTML = '<p class="text-red-600 text-center card p-6">Error: Unauthorized. Please refresh and log in.</p>';
      return;
    }
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }
    const appointments = await response.json();
    
    loading.style.display = 'none'; 

    if (appointments.length === 0) {
      list.innerHTML = '<p class="text-gray-600 text-center card p-6">No appointments found.</p>';
      return;
    }

    appointments.forEach(appt => {
      const card = document.createElement('div');
      // Added flex classes to make the footer stick to the bottom
      card.className = 'card overflow-hidden flex flex-col';
      
      // --- NEW: Status Color Logic ---
      let statusColor = 'bg-blue-100 text-blue-800'; // Pending
      if (appt.status === 'Confirmed') {
        statusColor = 'bg-green-100 text-green-800';
      } else if (appt.status === 'Work in Progress') {
        statusColor = 'bg-yellow-100 text-yellow-800';
      }

      // --- NEW: HTML for Assigning Team (Checkboxes) ---
      // Check if a name is in the appt.assignedTo array
      const options = team.map(name => {
        const isChecked = appt.assignedTo.includes(name);
        return `
          <label class="flex items-center space-x-2">
            <input type="checkbox" class="form-checkbox" value="${name}" ${isChecked ? 'checked' : ''}>
            <span>${name}</span>
          </label>
        `;
      }).join('');
      
      const assignHtml = `
        <form id="assign-form-${appt.id}" class="space-y-2">
          <p class="text-sm text-gray-600 mb-2">Assign team:</p>
          <div class="grid grid-cols-2 gap-2">${options}</div>
          <button type="button" onclick="assignJob('${appt.id}')" class="mt-2 w-full bg-blue-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-blue-700 transition text-sm">
            Save Assignments
          </button>
        </form>
      `;

      // --- NEW: HTML for Confirming / Status ---
      let confirmHtml = '';
      if (appt.status === 'Pending') {
        confirmHtml = `
          <p class="text-sm text-gray-600 mb-2">Confirm this appointment:</p>
          <div class="flex gap-2">
            <input type="text" id="date-input-${appt.id}" class="form-input block w-full rounded-lg border-gray-300 shadow-sm text-sm" placeholder="e.g., Nov 5, 2 PM">
            <button onclick="confirmAppointment('${appt.id}')" class="bg-green-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-green-700 transition text-sm whitespace-nowrap">
              Confirm
            </button>
          </div>
        `;
      } else if (appt.status === 'Confirmed') {
        confirmHtml = `
          <p class="text-sm text-green-700 font-semibold">Confirmed for: ${appt.confirmedDate}</p>
          <button onclick="updateStatus('${appt.id}', 'Work in Progress')" class="mt-2 w-full bg-yellow-500 text-yellow-900 font-bold py-2 px-3 rounded-lg hover:bg-yellow-600 transition text-sm">
            Start Work
          </button>
        `;
      } else if (appt.status === 'Work in Progress') {
        confirmHtml = '<p class="text-sm text-yellow-700 font-semibold">Job is currently in progress.</p>';
      }

      // --- Main Card Template (Updated) ---
      card.innerHTML = `
        <div class="p-5 flex-grow">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h3 class="text-xl font-semibold text-gray-900">${appt.name}</h3>
              <p class="text-sm text-gray-500">${new Date(appt.receivedAt).toLocaleString()}</p>
            </div>
            <span class="${statusColor} text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap">${appt.status}</span>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm mb-4">
            <div>
              <strong class="text-gray-600 block">Contact:</strong>
              <p>${appt.email}</p>
              <p>${appt.phone || 'No phone provided'}</p>
            </div>
            <div>
              <strong class="text-gray-600 block">Vehicle:</strong>
              <p>${appt.car} (${appt.estimatedTime})</p>
            </div>
            <div>
              <strong class="text-gray-600 block">Subject:</strong>
              <p>${appt.subject}</p>
            </div>
            <div>
              <strong class="text-gray-600 block">Availability:</strong>
              <p>${appt.availability}</p>
            </div>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-md mb-4">
            <strong class="text-gray-600 block mb-1">Message:</strong>
            <p class="text-gray-800 whitespace-pre-wrap">${appt.message}</p>
          </div>

          <div class="space-y-4">
            <div id="confirm-section-${appt.id}" class="mt-4 pt-4 border-t border-gray-200">
              ${confirmHtml}
            </div>
            <div id="assign-section-${appt.id}" class="mt-4 pt-4 border-t border-gray-200">
              ${assignHtml}
            </div>
          </div>
        </div>

        <div class="p-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button onclick="deleteJob('${appt.id}', 'complete')" class="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition text-sm">
            Mark as Completed
          </button>
          <button onclick="deleteJob('${appt.id}', 'delete')" class="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition text-sm">
            Delete Job
          </button>
        </div>
      `;
      list.appendChild(card);
    });

  } catch (error) {
    loading.style.display = 'none';
    list.innerHTML = `<p class="text-red-600 text-center card p-6">Error loading appointments: ${error.message}</p>`;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  fetchAppointments();
  refreshBtn.addEventListener('click', fetchAppointments);
});