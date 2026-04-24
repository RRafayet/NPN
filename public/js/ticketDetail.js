// ===== Ticket Detail & Chat =====
function formatPriorityReason(reason) {
  var labels = {
    'operations_down': 'Operations Down',
    'warehouse_equipment': 'Warehouse Equipment',
    'fleet_delivery': 'Fleet & Delivery',
    'customer_impacting': 'Customer Impacting',
    'safety_compliance': 'Safety or Compliance',
    'personal_productivity': 'Personal Productivity'
  };
  if (!reason) return '';
  return labels[reason] || reason;
}

var chatPollInterval = null;
var lastMessageCount = 0;

function startChatPolling(ticketId) {
  stopChatPolling();
  chatPollInterval = setInterval(async function() {
    if (currentPage !== 'ticket-detail' || !currentTicket || currentTicket.id !== ticketId) {
      stopChatPolling();
      return;
    }
    try {
      var data = await api('/api/tickets/' + ticketId);
      // Update chat only if new messages arrived
      if (data.messages.length !== lastMessageCount) {
        lastMessageCount = data.messages.length;
        renderChat(data.messages);
      }
      // Update ticket status badge silently
      if (data.ticket.status !== currentTicket.status) {
        currentTicket = data.ticket;
        var statusEl = document.getElementById('detail-status-badge');
        statusEl.className = 'badge badge-' + data.ticket.status;
        statusEl.textContent = data.ticket.status.replace('_', ' ');
        document.getElementById('chat-input-area').style.display = data.ticket.status === 'closed' ? 'none' : '';
      }
    } catch (e) { /* silent */ }
  }, 5000);
}

function stopChatPolling() {
  if (chatPollInterval) {
    clearInterval(chatPollInterval);
    chatPollInterval = null;
  }
}

async function viewTicket(id) {
  try {
    var data = await api('/api/tickets/' + id);
    currentTicket = data.ticket;
    var ticket = data.ticket;
    var messages = data.messages;

    document.getElementById('detail-ticket-number').textContent = '#' + ticket.ticket_number;
    document.getElementById('detail-requester').textContent = ticket.requester_name;
    document.getElementById('detail-device').textContent = ticket.device_name;
    document.getElementById('detail-description').textContent = ticket.description;
    document.getElementById('detail-date').textContent = formatDate(ticket.created_at) + ' ' + formatTime(ticket.created_at);

    var priorityEl = document.getElementById('detail-priority');
    if (ticket.priority === 'high') {
      var reasonLabel = formatPriorityReason(ticket.priority_reason);
      priorityEl.innerHTML = '<span class="badge badge-priority">&#9888; Priority</span>' +
        (reasonLabel ? ' <span class="priority-reason-tag">' + escapeHtml(reasonLabel) + '</span>' : '');
    } else {
      priorityEl.innerHTML = '<span style="color:var(--npe-gray-500);">Normal</span>';
    }

    var statusEl = document.getElementById('detail-status-badge');
    statusEl.className = 'badge badge-' + ticket.status;
    statusEl.textContent = ticket.status.replace('_', ' ');

    var assignedName = 'Unassigned';
    if (data.assigned_user) assignedName = data.assigned_user.name;
    document.getElementById('detail-assigned').textContent = assignedName;

    if (ticket.image_path) {
      document.getElementById('detail-image-container').style.display = '';
      document.getElementById('detail-image').src = ticket.image_path;
    } else {
      document.getElementById('detail-image-container').style.display = 'none';
    }

    // Admin actions
    if (currentUser.role === 'admin' && ticket.status !== 'closed') {
      document.getElementById('admin-actions').style.display = '';
      var assignSelect = document.getElementById('action-assign');
      assignSelect.innerHTML = '<option value="">Assign to...</option>';
      staffList.forEach(function(s) {
        var sel = ticket.assigned_to === s.id ? ' selected' : '';
        assignSelect.innerHTML += '<option value="' + s.id + '"' + sel + '>' + escapeHtml(s.name) + '</option>';
      });
    } else {
      document.getElementById('admin-actions').style.display = 'none';
    }

    // Hide chat input if ticket closed
    document.getElementById('chat-input-area').style.display = ticket.status === 'closed' ? 'none' : '';

    lastMessageCount = messages ? messages.length : 0;
    renderChat(messages);
    navigateTo('ticket-detail');
    startChatPolling(id);
  } catch (e) {
    alert('Error loading ticket: ' + e.message);
  }
}

function renderChat(messages) {
  var container = document.getElementById('chat-messages');
  if (!messages || messages.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:40px 20px;"><div class="empty-state-icon">&#128172;</div><p>No messages yet. Start a conversation.</p></div>';
    return;
  }
  container.innerHTML = messages.map(function(m) {
    var isSelf = m.sender_id === currentUser.id;
    return '<div class="chat-msg' + (isSelf ? ' self' : '') + '">' +
      '<div class="chat-avatar">' + getInitials(m.sender_name) + '</div>' +
      '<div>' +
      '<div class="chat-sender">' + escapeHtml(m.sender_name) + '</div>' +
      '<div class="chat-bubble">' + escapeHtml(m.message) + '</div>' +
      '<div class="chat-time">' + formatDate(m.created_at) + ' ' + formatTime(m.created_at) + '</div>' +
      '</div></div>';
  }).join('');
  container.scrollTop = container.scrollHeight;
}

function initTicketDetail() {
  document.getElementById('back-to-tickets').addEventListener('click', function() {
    if (currentUser.role === 'admin') navigateTo('all-tickets');
    else navigateTo('my-tickets');
  });

  // Send chat
  function sendMessage() {
    var input = document.getElementById('chat-input');
    var msg = input.value.trim();
    if (!msg || !currentTicket) return;
    input.value = '';
    api('/api/tickets/' + currentTicket.id + '/messages', {
      method: 'POST',
      body: { message: msg }
    }).then(function(data) {
      renderChat(data.messages);
    }).catch(function(e) { alert('Error: ' + e.message); });
  }

  document.getElementById('chat-send-btn').addEventListener('click', sendMessage);
  document.getElementById('chat-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
  });

  // Admin: assign
  document.getElementById('btn-assign-ticket').addEventListener('click', function() {
    var val = document.getElementById('action-assign').value;
    if (!val) return alert('Select a staff member');
    api('/api/tickets/' + currentTicket.id + '/assign', {
      method: 'PUT', body: { assigned_to: parseInt(val) }
    }).then(function() { viewTicket(currentTicket.id); });
  });

  // Admin: in progress
  document.getElementById('btn-in-progress').addEventListener('click', function() {
    api('/api/tickets/' + currentTicket.id + '/status', {
      method: 'PUT', body: { status: 'in_progress' }
    }).then(function() { viewTicket(currentTicket.id); });
  });

  // Admin: close
  document.getElementById('btn-close-ticket').addEventListener('click', function() {
    if (!confirm('Close this ticket? The user will be notified.')) return;
    api('/api/tickets/' + currentTicket.id + '/status', {
      method: 'PUT', body: { status: 'closed' }
    }).then(function() { viewTicket(currentTicket.id); });
  });

  // Image preview
  document.getElementById('detail-image').addEventListener('click', function() {
    document.getElementById('image-modal-img').src = this.src;
    document.getElementById('image-modal').classList.add('active');
  });
  document.getElementById('image-modal').addEventListener('click', function() {
    this.classList.remove('active');
  });
}
