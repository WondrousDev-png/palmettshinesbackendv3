// --- Global Elements ---
const loading = document.getElementById('loading');
const refreshBtn = document.getElementById('refresh-btn');
const team = ['Charles', 'Kempson', 'Wilson', 'James'];

// Tab Navigation
const tabNav = document.getElementById('tab-nav');
const tabContent = document.getElementById('tab-content');
const tabs = tabNav.querySelectorAll('.tab');
const panels = tabContent.querySelectorAll('.tab-panel');

// Lists
const progressList = document.getElementById('progress-list');
const progressContainer = document.getElementById('progress-container');
const scheduleList = document.getElementById('schedule-list');
const inquiryList = document.getElementById('inquiry-list');
const questionList = document.getElementById('question-list');

// Empty Messages
const scheduleEmpty = document.getElementById('schedule-empty');
const inquiryEmpty = document.getElementById('inquiry-empty');
const questionEmpty = document.getElementById('question-empty');

// Count Badges
const scheduleCount = document.getElementById('schedule-count');
const inquiryCount = document.getElementById('inquiry-count');
const questionCount = document.getElementById('question-count');


// --- API Call Functions ---

async function assignJob(id) {
  const form = document.getElementById(`assign-form-${id}`);
  const checkboxes = form.querySelectorAll('input[type="checkbox"]:checked');
  const assignedTo = Array.from(checkboxes).map(cb => cb.value);

  try {
    const response = await fetch(`/api/schedule/assign/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo: assignedTo })
    });
    if (!response.ok) throw new Error('Failed to assign');
    fetchAppointments();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function updateStatus(id, newStatus) {
  try {
    const response = await fetch(`/api/schedule/status/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (!response.ok) throw new Error('Failed to update status');
    fetchAppointments();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function deleteJob(id, action) {
  const msg = action === 'complete'
    ? 'Mark job as completed and remove?'
    : 'Permanently delete this job?';
  
  if (confirm(msg)) {
    try {
      const response = await fetch(`/api/schedule/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete');
      fetchAppointments();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }
}

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
    if (!response.ok) throw new Error('Failed to confirm');
    fetchAppointments();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}


// --- NEW: Universal Card Rendering Function ---
function renderAppointmentCard(appt) {
  // 1. Determine Status Color
  let statusColor = 'bg-blue-100 text-blue-800'; // Pending
  if (appt.status === 'Confirmed') statusColor = 'bg-green-100 text-green-800';
  else if (appt.status === 'Work in Progress') statusColor = 'bg-yellow-100 text-yellow-800';

  // 2. Build Assignment Checkboxes
  const options = team.map(name => {
    const isChecked = appt.assignedTo && appt.assignedTo.includes(name);
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

  // 3. Build Confirmation / Status HTML
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
    confirmHtml = `
      <p class="text-sm text-yellow-700 font-semibold">Job is currently in progress.</p>
      <button onclick="updateStatus('${appt.id}', 'Confirmed')" class="mt-2 w-full bg-gray-400 text-gray-900 font-bold py-2 px-3 rounded-lg hover:bg-gray-500 transition text-sm">
        Pause Work
      </button>
    `;
  }

  // 4. Create the Card Element
  const card = document.createElement('div');
  card.className = 'card overflow-hidden flex flex-col';
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
        <div><strong class="text-gray-600 block">Contact:</strong><p>${appt.email}</p><p>${appt.phone}</p></div>
        <div><strong class="text-gray-600 block">Vehicle:</strong><p>${appt.car} (${appt.estimatedTime})</p></div>
        <div><strong class="text-gray-600 block">Subject:</strong><p>${appt.subject}</p></div>
        <div><strong class="text-gray-600 block">Availability:</strong><p>${appt.availability}</p></div>
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
  return card;
}


// --- NEW: Main Fetch and Render Function ---
const fetchAppointments = async () => {
  // 1. Clear all lists and show loading
  loading.style.display = 'block';
  progressList.innerHTML = '';
  scheduleList.innerHTML = '';
  inquiryList.innerHTML = '';
  questionList.innerHTML = '';
  progressContainer.style.display = 'none';
  scheduleEmpty.style.display = 'none';
  inquiryEmpty.style.display = 'none';
  questionEmpty.style.display = 'none';

  try {
    const response = await fetch('/api/schedule');
    if (response.status === 401) {
      loading.style.display = 'none';
      progressContainer.innerHTML = '<p class="text-red-600 text-center card p-6">Error: Unauthorized. Please refresh and log in.</p>';
      return;
    }
    if (!response.ok) throw new Error('Failed to fetch data');
    
    // API already sorts 'Work in Progress' to the top
    const appointments = await response.json();
    loading.style.display = 'none'; 

    // 2. Create local arrays for each category
    const inProgressJobs = [];
    const scheduleJobs = [];
    const inquiryJobs = [];
    const questionJobs = [];

    // 3. Sort appointments into local arrays
    for (const appt of appointments) {
      if (appt.status === 'Work in Progress') {
        inProgressJobs.push(appt);
      } else if (appt.subject === 'Schedule Service' || appt.subject === 'Other') {
        scheduleJobs.push(appt);
      } else if (appt.subject === 'Service Inquiry') {
        inquiryJobs.push(appt);
      } else { // 'General Question'
        questionJobs.push(appt);
      }
    }

    // 4. Render "Work in Progress" section
    if (inProgressJobs.length > 0) {
      progressContainer.style.display = 'block';
      for (const appt of inProgressJobs) {
        progressList.appendChild(renderAppointmentCard(appt));
      }
    }

    // 5. Render "Schedule Service" section
    scheduleCount.textContent = scheduleJobs.length;
    if (scheduleJobs.length > 0) {
      for (const appt of scheduleJobs) {
        scheduleList.appendChild(renderAppointmentCard(appt));
      }
    } else {
      scheduleEmpty.style.display = 'block';
    }

    // 6. Render "Service Inquiry" section
    inquiryCount.textContent = inquiryJobs.length;
    if (inquiryJobs.length > 0) {
      for (const appt of inquiryJobs) {
        inquiryList.appendChild(renderAppointmentCard(appt));
      }
    } else {
      inquiryEmpty.style.display = 'block';
    }

    // 7. Render "General Question" section
    questionCount.textContent = questionJobs.length;
    if (questionJobs.length > 0) {
      for (const appt of questionJobs) {
        questionList.appendChild(renderAppointmentCard(appt));
      }
    } else {
      questionEmpty.style.display = 'block';
    }

  } catch (error) {
    loading.style.display = 'none';
    progressContainer.innerHTML = `<p class="text-red-600 text-center card p-6">Error loading appointments: ${error.message}</p>`;
  }
};

// --- NEW: Tab Switching Logic ---
tabNav.addEventListener('click', (e) => {
  const clickedTab = e.target.closest('.tab');
  if (!clickedTab) return; // Didn't click a tab

  // 1. Deactivate all tabs and panels
  tabs.forEach(tab => tab.classList.remove('active'));
  panels.forEach(panel => panel.classList.remove('active'));

  // 2. Activate the clicked tab
  clickedTab.classList.add('active');
  
  // 3. Activate the corresponding panel
  const tabName = clickedTab.dataset.tab;
  const panel = document.getElementById(`panel-${tabName}`);
  panel.classList.add('active');
});

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
  fetchAppointments();
  refreshBtn.addEventListener('click', fetchAppointments);
});