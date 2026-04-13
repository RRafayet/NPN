// ===== Nippon Express IT Portal - Core State & Utilities =====
let currentUser = null;
let currentPage = 'dashboard';
let allTickets = [];
let staffList = [];
let currentTicket = null;
let currentFilter = 'all';

// API helper
async function api(url, options = {}) {
  const defaults = { headers: { 'Content-Type': 'application/json' } };
  if (options.body instanceof FormData) {
    delete defaults.headers['Content-Type'];
  } else if (options.body && typeof options.body === 'object') {
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, { ...defaults, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function statusBadge(status) {
  return '<span class="badge badge-' + status + '">' + status.replace('_', ' ') + '</span>';
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}
