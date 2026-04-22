// ===== Tickets =====
async function loadStaff() {
  try {
    var data = await api('/api/tickets/staff/list');
    staffList = data.staff;
  } catch (e) { console.error(e); }
}

function priorityBadge(priority) {
  if (priority === 'high') {
    return '<span class="badge badge-priority">&#9888; Priority</span>';
  }
  return '';
}

function renderTicketRows(tickets, tbody, isAdmin) {
  if (tickets.length === 0) {
    return false;
  }
  tbody.innerHTML = tickets.map(function(t) {
    var assignedName = '-';
    if (t.assigned_to) {
      var s = staffList.find(function(st) { return st.id === t.assigned_to; });
      if (s) assignedName = s.name;
    }
    var priorityMark = t.priority === 'high' ? ' class="row-priority"' : '';
    var row = '<tr' + priorityMark + '>' +
      '<td><span class="ticket-number" onclick="viewTicket(' + t.id + ')">' + escapeHtml(t.ticket_number) + '</span>' +
      (isAdmin && t.priority === 'high' ? ' ' + priorityBadge(t.priority) : '') + '</td>';
    if (isAdmin) row += '<td>' + escapeHtml(t.requester_name) + '</td>';
    row += '<td>' + escapeHtml(t.device_name) + '</td>' +
      '<td>' + escapeHtml(truncate(t.description, 40)) + '</td>';
    if (isAdmin) row += '<td>' + escapeHtml(assignedName) + '</td>';
    row += '<td>' + statusBadge(t.status) + '</td>' +
      '<td>' + formatDate(t.created_at) + '</td>' +
      '</tr>';
    return row;
  }).join('');
  return true;
}

async function loadMyTickets() {
  try {
    var data = await api('/api/tickets');
    allTickets = data.tickets;
    applyFilter('my-tickets', allTickets);
  } catch (e) { console.error(e); }
}

async function loadAllTickets() {
  try {
    var data = await api('/api/tickets');
    allTickets = data.tickets;
    applyFilter('all-tickets', allTickets);
  } catch (e) { console.error(e); }
}

function applyFilter(pageId, tickets) {
  var filterBtns = document.querySelectorAll('#' + pageId + '-filters .filter-tab');
  var activeFilter = 'all';
  filterBtns.forEach(function(btn) {
    if (btn.classList.contains('active')) activeFilter = btn.dataset.filter;
  });
  var filtered = activeFilter === 'all' ? tickets :
    activeFilter === 'priority' ? tickets.filter(function(t) { return t.priority === 'high'; }) :
    tickets.filter(function(t) { return t.status === activeFilter; });
  var tbodyId = pageId === 'my-tickets' ? 'my-tickets-body' : 'all-tickets-body';
  var emptyId = pageId === 'my-tickets' ? 'my-tickets-empty' : 'all-tickets-empty';
  var isAdmin = pageId === 'all-tickets';
  var tbody = document.getElementById(tbodyId);
  var hasRows = renderTicketRows(filtered, tbody, isAdmin);
  document.getElementById(emptyId).style.display = hasRows ? 'none' : '';
  tbody.parentElement.parentElement.style.display = hasRows ? '' : 'none';
}

function initTicketFilters() {
  ['my-tickets-filters', 'all-tickets-filters'].forEach(function(filterId) {
    var container = document.getElementById(filterId);
    if (!container) return;
    container.addEventListener('click', function(e) {
      if (!e.target.classList.contains('filter-tab')) return;
      container.querySelectorAll('.filter-tab').forEach(function(b) { b.classList.remove('active'); });
      e.target.classList.add('active');
      var pageId = filterId.replace('-filters', '');
      applyFilter(pageId, allTickets);
    });
  });
}

// ===== New Request Form =====
function loadNewRequestForm() {
  var select = document.getElementById('req-assign');
  select.innerHTML = '<option value="">-- Select IT Staff --</option>';
  staffList.forEach(function(s) {
    select.innerHTML += '<option value="' + s.id + '">' + escapeHtml(s.name) + ' (' + escapeHtml(s.email) + ')</option>';
  });
}

function togglePriority() {
  var input = document.getElementById('req-priority');
  var btn = document.getElementById('priority-toggle');
  var icon = document.getElementById('priority-icon');
  var hintOff = document.getElementById('priority-hint-off');
  var hintOn = document.getElementById('priority-hint-on');
  if (input.value === 'normal') {
    input.value = 'high';
    btn.className = 'btn btn-priority-on';
    icon.textContent = '⚠';
    btn.childNodes[1].textContent = ' Priority On';
    hintOff.style.display = 'none';
    hintOn.style.display = '';
  } else {
    input.value = 'normal';
    btn.className = 'btn btn-priority-off';
    icon.innerHTML = '&#9679;';
    btn.childNodes[1].textContent = ' Mark as Priority';
    hintOff.style.display = '';
    hintOn.style.display = 'none';
  }
}

function resetNewRequestForm() {
  document.getElementById('new-request-form').reset();
  document.getElementById('new-request-form').style.display = '';
  document.getElementById('request-success').style.display = 'none';
  document.getElementById('file-name').textContent = '';
  document.getElementById('file-upload-area').classList.remove('has-file');
  // Reset priority
  document.getElementById('req-priority').value = 'normal';
  var btn = document.getElementById('priority-toggle');
  btn.className = 'btn btn-priority-off';
  document.getElementById('priority-icon').innerHTML = '&#9679;';
  btn.childNodes[1].textContent = ' Mark as Priority';
  document.getElementById('priority-hint-off').style.display = '';
  document.getElementById('priority-hint-on').style.display = 'none';
}

function initNewRequest() {
  var uploadArea = document.getElementById('file-upload-area');
  var fileInput = document.getElementById('req-image');

  uploadArea.addEventListener('click', function() { fileInput.click(); });
  uploadArea.addEventListener('dragover', function(e) { e.preventDefault(); uploadArea.style.borderColor = 'var(--npe-red)'; });
  uploadArea.addEventListener('dragleave', function() { uploadArea.style.borderColor = ''; });
  uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadArea.style.borderColor = '';
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      document.getElementById('file-name').textContent = e.dataTransfer.files[0].name;
      uploadArea.classList.add('has-file');
    }
  });
  fileInput.addEventListener('change', function() {
    if (fileInput.files.length) {
      document.getElementById('file-name').textContent = fileInput.files[0].name;
      uploadArea.classList.add('has-file');
    }
  });

  document.getElementById('new-request-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = document.getElementById('submit-request-btn');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      var formData = new FormData();
      formData.append('device_name', document.getElementById('req-device').value);
      formData.append('description', document.getElementById('req-description').value);
      formData.append('assigned_to', document.getElementById('req-assign').value);
      formData.append('cc', document.getElementById('req-cc').value);
      formData.append('priority', document.getElementById('req-priority').value);
      if (fileInput.files.length) formData.append('image', fileInput.files[0]);
      var data = await api('/api/tickets', { method: 'POST', body: formData });
      document.getElementById('new-ticket-number').textContent = '#' + data.ticket.ticket_number;
      document.getElementById('new-request-form').style.display = 'none';
      document.getElementById('request-success').style.display = '';
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Request';
    }
  });
}
