/*
  This file contains the complete application logic.
  It replaces alert() and confirm() with non-blocking
  UI elements and includes the mobile-first calendar logic.
*/

// --- Global Elements ---
const loading = document.getElementById('loading');
const refreshBtn = document.getElementById('refresh-btn');
const team = ['Charles', 'Kempson', 'Wilson', 'James'];
let calendar; // To hold the FullCalendar instance
let allAppointments = []; // Cache for calendar click summary

// --- Main Tab Navigation ---
const mainTabNav = document.getElementById('tab-nav');
const mainTabContent = document.getElementById('tab-content');
const mainTabs = mainTabNav.querySelectorAll('.tab');
const mainPanels = mainTabContent.querySelectorAll('.tab-panel');

// --- Sub-Tab Navigation ---
const subTabNav = document.getElementById('sub-tab-nav');
const subTabContent = document.getElementById('sub-tab-content');
const subTabs = subTabNav.querySelectorAll('.tab');
const subPanels = subTabContent.querySelectorAll('.tab-panel');

// --- Job Lists ---
const wipList = document.getElementById('wip-list');
const confirmedList = document.getElementById('confirmed-list');
const scheduleList = document.getElementById('schedule-list');
const questionList = document.getElementById('question-list');
const calendarEl = document.getElementById('calendar');

// --- Empty Messages ---
const wipEmpty = document.getElementById('wip-empty');
const confirmedEmpty = document.getElementById('confirmed-empty');
const scheduleEmpty = document.getElementById('schedule-empty');
const questionEmpty = document.getElementById('question-empty');

// --- Count Badges ---
const wipCount = document.getElementById('wip-count');
const confirmedCount = document.getElementById('confirmed-count');
const newCount = document.getElementById('new-count');
const scheduleCount = document.getElementById('schedule-count');
const questionCount = document.getElementById('question-count');

// --- Modal Elements ---
const summaryModal = document.getElementById('day-summary-modal');
const summaryDate = document.getElementById('day-summary-date');
const summaryList = document.getElementById('day-summary-list');
const modalCloseBtn = document.getElementById('modal-close-btn');

// --- Today Summary Elements ---
const todaySummaryContainer = document.getElementById('today-summary-container');
const todaySummaryList = document.getElementById('today-summary-list');
const todaySummaryEmpty = document.getElementById('today-summary-empty');

// --- NEW Notification & Confirmation Elements ---
const toastEl = document.getElementById('toast-notification');
const toastMessage = document.getElementById('toast-message');
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmBtnOk = document.getElementById('confirm-btn-ok');
const confirmBtnCancel = document.getElementById('confirm-btn-cancel');

// --- NEW: Custom Notification Functions ---

/**
 * Shows a toast notification.
 * @param {string} message The message to display.
 * @param {boolean} [isError=true] If true, shows a red error toast. If false, shows a blue info toast.
 */
function showToast(message, isError = true) {
  toastMessage.textContent = message;
  
  if (isError) {
    toastEl.classList.remove('bg-blue-600');
    toastEl.classList.add('bg-red-600');
  } else {
    toastEl.classList.remove('bg-red-600');
    toastEl.classList.add('bg-blue-600');
  }
  
  toastEl.classList.remove('hidden');
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 3000); // Hide after 3 seconds
}

/**
 * Shows a confirmation modal.
 * @param {string} message The message for the confirmation.
 * @param {string} title The title for the modal.
 * @returns {Promise<boolean>} A promise that resolves to true if OK, false if Cancel.
 */
function showConfirmation(message, title = 'Are you sure?') {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmModal.showModal();

  return new Promise((resolve) => {
    // Remove old listeners to prevent duplicates
    const newOkBtn = confirmBtnOk.cloneNode(true);
    const newCancelBtn = confirmBtnCancel.cloneNode(true);
    confirmBtnOk.parentNode.replaceChild(newOkBtn, confirmBtnOk);
    confirmBtnCancel.parentNode.replaceChild(newCancelBtn, confirmBtnCancel);
    
    // Add new listeners
    newOkBtn.addEventListener('click', () => {
      confirmModal.close();
      resolve(true);
    });
    newCancelBtn.addEventListener('click', () => {
      confirmModal.close();
      resolve(false);
    });
  });
}


// --- API Call Functions (Updated) ---

async function assignJob(id) {
  // This function is for *just* saving assignments
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
    showToast('Error: ' + error.message);
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
    showToast('Error: ' + error.message);
  }
}

async function deleteJob(id, action) {
  const msg = action === 'complete'
    ? 'Mark job as completed and remove?'
    : 'Permanently delete this job?';
  
  const confirmed = await showConfirmation(msg);

  if (confirmed) {
    try {
      const response = await fetch(`/api/schedule/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete');
      fetchAppointments();
    } catch (error) {
      showToast('Error: ' + error.message);
    }
  }
}

async function confirmAppointment(id) {
  // This function is now used for BOTH confirming AND rescheduling
  const dateInput = document.getElementById(`date-input-${id}`);
  const confirmedDate = dateInput.value;
  
  if (!confirmedDate) {
    showToast('Please select a date and time.', false); // Use non-error toast
    return;
  }

  const form = document.getElementById(`assign-form-${id}`);
  const checkboxes = form.querySelectorAll('input[type="checkbox"]:checked');
  const assignedTo = Array.from(checkboxes).map(cb => cb.value);

  try {
    const response = await fetch(`/api/schedule/confirm/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        confirmedDate: confirmedDate,
        assignedTo: assignedTo 
      })
    });
    if (!response.ok) throw new Error('Failed to confirm/reschedule');
    fetchAppointments();
  } catch (error) {
    showToast('Error: ' + error.message);
  }
}

// --- NEW: Reschedule UI Toggle ---
function toggleReschedule(id) {
  const statusBlock = document.getElementById(`status-block-${id}`);
  const rescheduleBlock = document.getElementById(`reschedule-block-${id}`);
  
  const isHidden = rescheduleBlock.style.display === 'none';
  if (isHidden) {
    statusBlock.style.display = 'none';
    rescheduleBlock.style.display = 'block';
  } else {
    statusBlock.style.display = 'block';
    rescheduleBlock.style.display = 'none';
  }
}


// --- Universal Card Rendering Function ---
function renderAppointmentCard(appt) {
  
  const isQuestionType = appt.subject === 'General Question' || appt.subject === 'Service Inquiry';

  // --- Block 1: Build Assignment HTML ---
  const options = team.map(name => {
    const isChecked = appt.assignedTo && appt.assignedTo.includes(name);
    return `
      <label class="flex items-center space-x-2">
        <input type="checkbox" class="form-checkbox" value="${name}" ${isChecked ? 'checked' : ''}>
        <span>${name}</span>
      </label>
    `;
  }).join('');
  
  const assignButtonText = (isQuestionType && appt.status === 'Pending') ? 'Assign & Confirm' : 'Save Assignments';
  
  const assignHtml = `
    <form id="assign-form-${appt.id}" class="space-y-2">
      <p class="text-sm text-gray-600 mb-2">${(isQuestionType) ? 'Assign to Respond:' : 'Assign team:'}</p>
      <div class="grid grid-cols-2 gap-2">${options}</div>
      <button type="button" onclick="assignJob('${appt.id}')" class="mt-2 w-full bg-blue-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-blue-700 transition text-sm">
        ${assignButtonText}
      </button>
    </form>
  `;

  // --- Block 2: Build Card-Specific HTML ---
  let statusColor, cardDetailsHtml, statusHtml, footerHtml;

  // Set Status Color
  statusColor = 'bg-blue-100 text-blue-800'; // Pending
  if (appt.status === 'Confirmed') statusColor = 'bg-green-100 text-green-800';
  else if (appt.status === 'Work in Progress') statusColor = 'bg-yellow-100 text-yellow-800';

  // Set Card Details
  if (isQuestionType) {
    cardDetailsHtml = `
      <div><strong class="text-gray-600 block">Contact:</strong><p>${appt.email}</p><p>${appt.phone}</p></div>
      <div class="bg-gray-50 p-4 rounded-md col-span-2">
        <strong class="text-gray-600 block mb-1">Message:</strong>
        <p class="text-gray-800 whitespace-pre-wrap">${appt.message}</p>
      </div>
    `;
  } else {
    cardDetailsHtml = `
      <div><strong class="text-gray-600 block">Contact:</strong><p>${appt.email}</p><p>${appt.phone}</p></div>
      <div><strong class="text-gray-600 block">Vehicle:</strong><p>${appt.car} (${appt.estimatedTime})</p></div>
      <div><strong class="text-gray-600 block">Subject:</strong><p>${appt.subject}</p></div>
      <div><strong class="text-gray-600 block">Availability:</strong><p>${appt.availability}</p></div>
      <div class="bg-gray-50 p-4 rounded-md col-span-2">
        <strong class="text-gray-600 block mb-1">Message:</strong>
        <p class="text-gray-800 whitespace-pre-wrap">${appt.message}</p>
      </div>
    `;
  }

  // --- Block 3: Status/Confirm/Reschedule HTML ---
  statusHtml = ''; // Default to empty
  // Get a pre-filled value for the date picker (for rescheduling)
  const isoDate = appt.confirmedDate ? new Date(appt.confirmedDate).toISOString().slice(0, 16) : '';

  if (appt.status === 'Pending' && !isQuestionType) {
    // Only show "Confirm" for non-questions
    statusHtml = `
      <div id="confirm-section-${appt.id}">
        <p class="text-sm text-gray-600 mb-2">Confirm this appointment:</p>
        <div class="flex flex-col sm:flex-row gap-2">
          <input type="datetime-local" id="date-input-${appt.id}" class="form-input block w-full rounded-lg border-gray-300 shadow-sm text-sm">
          <button onclick="confirmAppointment('${appt.id}')" class="bg-green-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-green-700 transition text-sm whitespace-nowrap">
            Confirm & Save
          </button>
        </div>
      </div>
    `;
  } else if (appt.status === 'Confirmed') {
    const friendlyDate = appt.confirmedDate ? new Date(appt.confirmedDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';
    const dateDisplay = (isQuestionType || !appt.confirmedDate) ? '' : `<p class="text-sm text-green-700 font-semibold">Confirmed for: ${friendlyDate}</p>`;
    
    statusHtml = `
      <div id="status-block-${appt.id}">
        ${dateDisplay}
        <button onclick="updateStatus('${appt.id}', 'Work in Progress')" class="mt-2 w-full bg-yellow-500 text-yellow-900 font-bold py-2 px-3 rounded-lg hover:bg-yellow-600 transition text-sm">
          Start Work
        </button>
        ${!isQuestionType ? `<button onclick="toggleReschedule('${appt.id}')" class="mt-2 w-full bg-gray-500 text-white font-bold py-2 px-3 rounded-lg hover:bg-gray-600 transition text-sm">Reschedule</button>` : ''}
      </div>
      <div id="reschedule-block-${appt.id}" style="display: none;">
        <p class="text-sm text-gray-600 mb-2">Select new date & time:</p>
        <input type="datetime-local" id="date-input-${appt.id}" class="form-input block w-full rounded-lg border-gray-300 shadow-sm text-sm mb-2" value="${isoDate}">
        <div class="flex flex-col sm:flex-row gap-2">
          <button onclick="confirmAppointment('${appt.id}')" class="w-full bg-green-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-green-700 transition text-sm">
            Save New Date
          </button>
          <button onclick="toggleReschedule('${appt.id}')" class="w-full bg-gray-300 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-400 transition text-sm">
            Cancel
          </button>
        </div>
      </div>
    `;
  } else if (appt.status === 'Work in Progress') {
    statusHtml = `
      <div id="status-block-${appt.id}">
        <p class="text-sm text-yellow-700 font-semibold">Job is currently in progress.</p>
        <button onclick="updateStatus('${appt.id}', 'Confirmed')" class="mt-2 w-full bg-gray-400 text-gray-900 font-bold py-2 px-3 rounded-lg hover:bg-gray-500 transition text-sm">
          Pause Work
        </button>
        ${!isQuestionType ? `<button onclick="toggleReschedule('${appt.id}')" class="mt-2 w-full bg-gray-500 text-white font-bold py-2 px-3 rounded-lg hover:bg-gray-600 transition text-sm">Reschedule</button>` : ''}
      </div>
      <div id="reschedule-block-${appt.id}" style="display: none;">
        <p class="text-sm text-gray-600 mb-2">Select new date & time:</p>
        <input type="datetime-local" id="date-input-${appt.id}" class="form-input block w-full rounded-lg border-gray-300 shadow-sm text-sm mb-2" value="${isoDate}">
        <div class="flex flex-col sm:flex-row gap-2">
          <button onclick="confirmAppointment('${appt.id}')" class="w-full bg-green-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-green-700 transition text-sm">
            Save New Date
          </button>
          <button onclick="toggleReschedule('${appt.id}')" class="w-full bg-gray-300 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-400 transition text-sm">
            Cancel
          </button>
        </div>
      </div>
    `;
  }
  
  // --- Block 4: Set Footer HTML ---
  if (isQuestionType && appt.status === 'Pending') {
    footerHtml = `
      <button onclick="deleteJob('${appt.id}', 'delete')" class="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition text-sm">
        Delete
      </button>
    `;
  } else {
    footerHtml = `
      <button onclick="deleteJob('${appt.id}', 'complete')" class="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition text-sm">
        ${isQuestionType ? 'Mark as Responded' : 'Mark as Completed'}
      </button>
      <button onclick="deleteJob('${appt.id}', 'delete')" class="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition text-sm">
        Delete Job
      </button>
    `;
  }

  // --- Block 5: Assemble the Card ---
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
        ${cardDetailsHtml}
      </div>
      
      <div class="space-y-4">
        ${statusHtml ? `
          <div class="mt-4 pt-4 border-t border-gray-200">
            ${statusHtml}
          </div>
        ` : ''}
        
        <div id="assign-section-${appt.id}" class="mt-4 pt-4 border-t border-gray-200">
          ${assignHtml}
        </div>
      </div>
    </div>
    
    <div class="p-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
      ${footerHtml}
    </div>
  `;
  return card;
}

// --- Today's Summary Function ---
function renderTodaySummary(appointments) {
  const today = new Date().toDateString();
  
  const eventsForToday = appointments.filter(appt => {
    if (!appt.confirmedDate) return false;
    const eventDate = new Date(appt.confirmedDate);
    return eventDate.toDateString() === today;
  });

  todaySummaryList.innerHTML = ''; // Clear old list
  
  if (eventsForToday.length === 0) {
    todaySummaryEmpty.style.display = 'block';
    todaySummaryContainer.style.display = 'block';
  } else {
    // Sort by time
    eventsForToday.sort((a, b) => new Date(a.confirmedDate) - new Date(b.confirmedDate));
    
    eventsForToday.forEach(appt => {
      const time = new Date(appt.confirmedDate).toLocaleString([], { timeStyle: 'short' });
      const teamString = appt.assignedTo.length ? ` (${appt.assignedTo.join(', ')})` : '';
      
      const li = document.createElement('li');
      li.className = "p-4 bg-white rounded-lg shadow-sm border";
      li.innerHTML = `
        <span class="font-semibold text-orange-600">${time}</span> - 
        <span class="font-medium text-gray-800">${appt.name}${teamString}</span> - 
        <span class="text-gray-600">${appt.car || appt.subject}</span>
      `;
      todaySummaryList.appendChild(li);
    });
    
    todaySummaryEmpty.style.display = 'none';
    todaySummaryContainer.style.display = 'block';
  }
}


// --- Main Fetch and Render Function ---
const fetchAppointments = async () => {
  // 1. Clear all lists and show loading
  loading.style.display = 'block';
  wipList.innerHTML = '';
  confirmedList.innerHTML = '';
  scheduleList.innerHTML = '';
  questionList.innerHTML = '';
  todaySummaryContainer.style.display = 'none'; // Hide today summary on load
  [wipEmpty, confirmedEmpty, scheduleEmpty, questionEmpty].forEach(el => el.style.display = 'none');

  try {
    const response = await fetch('/api/schedule');
    if (response.status === 401) {
      loading.style.display = 'none';
      showToast('Error: Unauthorized. Please refresh and log in.');
      return;
    }
    if (!response.ok) throw new Error('Failed to fetch data');
    
    allAppointments = await response.json(); // Save to global cache
    loading.style.display = 'none'; 

    // 2. Create local arrays for each category
    const wipJobs = [];
    const confirmedJobs = [];
    const scheduleJobs = [];
    const questionJobs = [];
    const calendarEvents = [];

    // 3. Sort appointments into local arrays
    for (const appt of allAppointments) {
      const isQuestion = appt.subject === 'General Question' || appt.subject === 'Service Inquiry';

      switch (appt.status) {
        case 'Work in Progress':
          wipJobs.push(appt);
          break;
        case 'Confirmed':
          confirmedJobs.push(appt);
          if (appt.confirmedDate) {
            const calDate = new Date(appt.confirmedDate);
            const calTime = calDate.toLocaleString([], { timeStyle: 'short' });
            const teamString = appt.assignedTo.length ? ` (${appt.assignedTo.join(', ')})` : '';
            
            calendarEvents.push({
              title: `${calTime} - ${appt.name}${teamString} - ${appt.car}`,
              start: appt.confirmedDate,
              allDay: false
            });
          }
          break;
        case 'Pending':
          if (isQuestion) {
            questionJobs.push(appt);
          } else {
            scheduleJobs.push(appt); // 'Schedule Service' & 'Other'
          }
          break;
      }
    }

    // --- 3.5. Render Today's Summary ---
    renderTodaySummary(allAppointments);

    // 4. Render "Work in Progress" section
    wipCount.textContent = wipJobs.length;
    if (wipJobs.length > 0) {
      wipJobs.forEach(appt => wipList.appendChild(renderAppointmentCard(appt)));
    } else {
      wipEmpty.style.display = 'block';
    }

    // 5. Render "Confirmed" section
    confirmedCount.textContent = confirmedJobs.length;
    if (confirmedJobs.length > 0) {
      confirmedJobs.forEach(appt => confirmedList.appendChild(renderAppointmentCard(appt)));
    } else {
      confirmedEmpty.style.display = 'block';
    }

    // 6. Render "Schedule" sub-tab
    scheduleCount.textContent = scheduleJobs.length;
    if (scheduleJobs.length > 0) {
      scheduleJobs.forEach(appt => scheduleList.appendChild(renderAppointmentCard(appt)));
    } else {
      scheduleEmpty.style.display = 'block';
    }

    // 7. Render "Question" sub-tab
    questionCount.textContent = questionJobs.length;
    if (questionJobs.length > 0) {
      questionJobs.forEach(appt => questionList.appendChild(renderAppointmentCard(appt)));
    } else {
      questionEmpty.style.display = 'block';
    }

    // 8. Update "New Requests" main tab count
    newCount.textContent = scheduleJobs.length + questionJobs.length;

    // 9. Render Calendar (NOW MOBILE-FIRST)
    if (calendar) {
      calendar.destroy(); 
    }
    
    // Check if the current window is narrow (likely a phone in vertical mode)
    const isMobile = window.innerWidth < 640; // Tailwind's 'sm' breakpoint

    calendar = new FullCalendar.Calendar(calendarEl, {
      // Set mobile-friendly list view as default on small screens
      initialView: isMobile ? 'listWeek' : 'dayGridMonth',
      
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        // Show fewer view options on mobile
        right: isMobile ? 'listWeek,dayGridMonth' : 'dayGridMonth,timeGridWeek,listWeek'
      },
      
      // Add an event listener to dynamically change view on resize (e.g., phone rotation)
      windowResize: function(arg) {
        const currentIsMobile = window.innerWidth < 640;
        // If we're now on mobile and in a grid view, switch to list
        if (currentIsMobile && (arg.view.type === 'dayGridMonth' || arg.view.type === 'timeGridWeek')) {
          calendar.changeView('listWeek');
        } 
        // If we're now on desktop and in list view, switch to month
        else if (!currentIsMobile && arg.view.type === 'listWeek') {
          calendar.changeView('dayGridMonth');
        }
      },
      
      // --- Your existing calendar options ---
      events: calendarEvents,
      editable: false, 
      dayMaxEvents: true, 
      eventTimeFormat: {
        hour: 'numeric',
        minute: '2-digit',
        meridiem: 'short'
      },
      dateClick: (arg) => {
        handleDateClick(arg.date);
      }
    });
    
    // Render only if the calendar panel is active
    if (document.getElementById('panel-calendar').classList.contains('active')) {
      calendar.render();
    }

  } catch (error) {
    loading.style.display = 'none';
    showToast(`Error loading appointments: ${error.message}`);
    console.error(error);
  }
};

// --- Calendar Day Click Handler ---
function handleDateClick(date) {
  // 1. Set modal title
  summaryDate.textContent = date.toLocaleDateString([], { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  // 2. Filter all appointments for the clicked day
  const eventsForDay = allAppointments.filter(appt => {
    if (!appt.confirmedDate) return false;
    const eventDate = new Date(appt.confirmedDate);
    // Compare dates by ignoring the time
    return eventDate.toDateString() === date.toDateString();
  });

  // 3. Populate the modal list
  summaryList.innerHTML = ''; // Clear old list
  if (eventsForDay.length === 0) {
    summaryList.innerHTML = '<li class="text-gray-500 text-center">No scheduled jobs for this day.</li>';
  } else {
    // Sort by time
    eventsForDay.sort((a, b) => new Date(a.confirmedDate) - new Date(b.confirmedDate));
    
    eventsForDay.forEach(appt => {
      const time = new Date(appt.confirmedDate).toLocaleString([], { timeStyle: 'short' });
      const teamString = appt.assignedTo.length ? ` (${appt.assignedTo.join(', ')})` : '';
      
      const li = document.createElement('li');
      li.className = 'p-3 bg-gray-50 rounded-md text-gray-700';
      li.innerHTML = `<strong>${time} - ${appt.name}${teamString}</strong>
                      <span class="block text-sm text-gray-600">${appt.car || appt.subject}</span>`;
      summaryList.appendChild(li);
    });
  }

  // 4. Show the modal
  summaryModal.showModal();
}

// --- Tab Switching Logic ---
function setupTabSwitcher(nav, panels) {
  nav.addEventListener('click', (e) => {
    const clickedTab = e.target.closest('.tab');
    if (!clickedTab) return;

    nav.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    panels.forEach(panel => panel.classList.remove('active'));
    clickedTab.classList.add('active');
    
    const tabName = clickedTab.dataset.tab;
    const panel = document.getElementById(`panel-${tabName}`);
    panel.classList.add('active');

    if (tabName === 'calendar' && calendar) {
      setTimeout(() => calendar.render(), 0); // Render on next tick
    }
  });
}

// --- Initial Load & Modal Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  setupTabSwitcher(mainTabNav, mainPanels);
  setupTabSwitcher(subTabNav, subPanels);
  fetchAppointments();
  refreshBtn.addEventListener('click', fetchAppointments);

  // --- Modal close listeners ---
  modalCloseBtn.addEventListener('click', () => summaryModal.close());
  summaryModal.addEventListener('click', (e) => {
    const dialogDimensions = summaryModal.getBoundingClientRect();
    if (
      e.clientX < dialogDimensions.left ||
      e.clientX > dialogDimensions.right ||
      e.clientY < dialogDimensions.top ||
      e.clientY > dialogDimensions.bottom
    ) {
      summaryModal.close();
    }
  });
});
