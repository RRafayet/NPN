// ===== Notifications =====
async function loadNotifications() {
  try {
    var data = await api('/api/tickets/user/notifications');
    var countEl = document.getElementById('notif-count');
    if (data.unread_count > 0) {
      countEl.textContent = data.unread_count;
      countEl.classList.add('visible');
    } else {
      countEl.classList.remove('visible');
    }
    var list = document.getElementById('notif-list');
    if (data.notifications.length === 0) {
      list.innerHTML = '<div style="padding:30px;text-align:center;color:var(--npe-gray-500);font-size:13px;">No notifications</div>';
      return;
    }
    list.innerHTML = data.notifications.map(function(n) {
      return '<div class="notif-item' + (n.is_read ? '' : ' unread') + '" onclick="handleNotifClick(' + (n.ticket_id || 0) + ')">' +
        '<div>' + escapeHtml(n.message) + '</div>' +
        '<div class="notif-time">' + formatDate(n.created_at) + ' ' + formatTime(n.created_at) + '</div>' +
        '</div>';
    }).join('');
  } catch (e) { console.error(e); }
}

function handleNotifClick(ticketId) {
  document.getElementById('notif-dropdown').classList.remove('open');
  if (ticketId) viewTicket(ticketId);
}

function initNotifications() {
  document.getElementById('notif-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    var dd = document.getElementById('notif-dropdown');
    dd.classList.toggle('open');
    if (dd.classList.contains('open')) loadNotifications();
  });

  document.addEventListener('click', function() {
    document.getElementById('notif-dropdown').classList.remove('open');
  });

  document.getElementById('notif-dropdown').addEventListener('click', function(e) { e.stopPropagation(); });

  document.getElementById('mark-all-read').addEventListener('click', async function(e) {
    e.preventDefault();
    await api('/api/tickets/user/notifications/read', { method: 'PUT' });
    loadNotifications();
  });

  // Poll notifications every 30 seconds
  setInterval(loadNotifications, 30000);
}
