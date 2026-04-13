// ===== Navigation =====
function navigateTo(page) {
  currentPage = page;
  // Hide all pages
  document.querySelectorAll('.page').forEach(function(p) { p.style.display = 'none'; });
  // Show target
  var target = document.getElementById('page-' + page);
  if (target) target.style.display = '';
  // Update nav
  document.querySelectorAll('.nav-item').forEach(function(item) {
    item.classList.toggle('active', item.dataset.page === page);
  });
  // Update title
  var titles = {
    'dashboard': 'Dashboard',
    'new-request': 'New IT Request',
    'my-tickets': 'My Tickets',
    'all-tickets': 'All Tickets',
    'knowledge-base': 'Knowledge Base',
    'manage-kb': 'Manage Articles',
    'ticket-detail': 'Ticket Details',
    'kb-article': 'Article'
  };
  document.getElementById('page-title').textContent = titles[page] || 'Dashboard';
  // Load page data
  if (page === 'dashboard') loadDashboard();
  if (page === 'my-tickets') loadMyTickets();
  if (page === 'all-tickets') loadAllTickets();
  if (page === 'new-request') loadNewRequestForm();
  if (page === 'knowledge-base') loadKnowledgeBase();
  if (page === 'manage-kb') loadManageKB();
  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
}

function initNav() {
  document.querySelectorAll('.nav-item[data-page]').forEach(function(item) {
    item.addEventListener('click', function() {
      navigateTo(this.dataset.page);
    });
  });
  document.getElementById('mobile-toggle').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('open');
  });
}
