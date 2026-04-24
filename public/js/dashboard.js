// ===== Dashboard =====
async function loadDashboard() {
  try {
    var data = await api('/api/tickets');
    allTickets = data.tickets;
    var open = allTickets.filter(function(t) { return t.status === 'open'; }).length;
    var inProgress = allTickets.filter(function(t) { return t.status === 'in_progress'; }).length;
    var closed = allTickets.filter(function(t) { return t.status === 'closed'; }).length;
    var total = allTickets.length;

    document.getElementById('stats-grid').innerHTML =
      '<div class="stat-card"><div class="stat-icon red">&#128196;</div><div class="stat-info"><h3>' + total + '</h3><p>Total Tickets</p></div></div>' +
      '<div class="stat-card"><div class="stat-icon orange">&#128308;</div><div class="stat-info"><h3>' + open + '</h3><p>Open</p></div></div>' +
      '<div class="stat-card"><div class="stat-icon blue">&#128260;</div><div class="stat-info"><h3>' + inProgress + '</h3><p>In Progress</p></div></div>' +
      '<div class="stat-card"><div class="stat-icon green">&#9989;</div><div class="stat-info"><h3>' + closed + '</h3><p>Closed</p></div></div>';

    var recent = allTickets.slice(0, 10);
    var tbody = document.getElementById('dashboard-tickets');
    if (recent.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--npe-gray-500);">No tickets yet. Create your first IT request!</td></tr>';
      return;
    }
    tbody.innerHTML = recent.map(function(t) {
      var priorityMark = t.priority === 'high' ? ' class="row-priority"' : '';
      var priorityTag = (currentUser.role === 'admin' && t.priority === 'high') ? ' ' + priorityBadge(t.priority, t.priority_reason) : '';
      return '<tr' + priorityMark + '>' +
        '<td><span class="ticket-number" onclick="viewTicket(' + t.id + ')">' + escapeHtml(t.ticket_number) + '</span>' + priorityTag + '</td>' +
        '<td>' + escapeHtml(t.requester_name) + '</td>' +
        '<td>' + escapeHtml(t.device_name) + '</td>' +
        '<td>' + escapeHtml(truncate(t.description, 40)) + '</td>' +
        '<td>' + statusBadge(t.status) + '</td>' +
        '<td>' + formatDate(t.created_at) + '</td>' +
        '</tr>';
    }).join('');

    // Update badges
    if (open > 0) {
      document.getElementById('open-tickets-badge').textContent = open;
      document.getElementById('open-tickets-badge').style.display = '';
    }
    if (currentUser.role === 'admin' && (open + inProgress) > 0) {
      var badge = document.getElementById('all-tickets-badge');
      badge.textContent = open + inProgress;
      badge.style.display = '';
    }
  } catch (e) {
    console.error('Dashboard load error:', e);
  }
}
