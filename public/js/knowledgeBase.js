// ===== Knowledge Base =====
async function loadKnowledgeBase() {
  try {
    var catData = await api('/api/kb/categories');
    var cats = catData.categories;
    var catContainer = document.getElementById('kb-categories');
    catContainer.innerHTML = '<button class="filter-tab active" data-cat="">All</button>';
    cats.forEach(function(c) {
      catContainer.innerHTML += '<button class="filter-tab" data-cat="' + escapeHtml(c) + '">' + escapeHtml(c) + '</button>';
    });

    catContainer.querySelectorAll('.filter-tab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        catContainer.querySelectorAll('.filter-tab').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        fetchKBArticles(btn.dataset.cat, document.getElementById('kb-search').value);
      });
    });

    fetchKBArticles('', '');
  } catch (e) { console.error(e); }
}

async function fetchKBArticles(category, search) {
  try {
    var url = '/api/kb?';
    if (category) url += 'category=' + encodeURIComponent(category) + '&';
    if (search) url += 'search=' + encodeURIComponent(search);
    var data = await api(url);
    var grid = document.getElementById('kb-grid');
    var empty = document.getElementById('kb-empty');

    if (data.articles.length === 0) {
      grid.innerHTML = '';
      empty.style.display = '';
      // Show "Add Article" button for admins
      var adminBtn = empty.querySelector('.admin-only-btn');
      if (adminBtn) adminBtn.style.display = (currentUser && currentUser.role === 'admin') ? '' : 'none';
      return;
    }
    empty.style.display = 'none';
    grid.innerHTML = data.articles.map(function(a) {
      var plainText = a.content.replace(/<[^>]*>/g, '');
      return '<div class="kb-card" onclick="viewArticle(' + a.id + ')">' +
        '<div class="kb-card-body">' +
        '<span class="kb-category">' + escapeHtml(a.category) + '</span>' +
        '<h3>' + escapeHtml(a.title) + '</h3>' +
        '<p>' + escapeHtml(truncate(plainText, 120)) + '</p>' +
        '</div></div>';
    }).join('');
  } catch (e) { console.error(e); }
}

async function viewArticle(id) {
  try {
    var data = await api('/api/kb/' + id);
    var a = data.article;
    document.getElementById('article-category').textContent = a.category;
    document.getElementById('article-title').textContent = a.title;
    document.getElementById('article-content').innerHTML = a.content;
    navigateTo('kb-article');
  } catch (e) { alert('Error: ' + e.message); }
}

function initKBSearch() {
  var timer;
  document.getElementById('kb-search').addEventListener('input', function() {
    clearTimeout(timer);
    var val = this.value;
    timer = setTimeout(function() {
      var activeCat = '';
      var activeBtn = document.querySelector('#kb-categories .filter-tab.active');
      if (activeBtn) activeCat = activeBtn.dataset.cat || '';
      fetchKBArticles(activeCat, val);
    }, 300);
  });
}

// ===== Manage KB (Admin) =====
async function loadManageKB() {
  try {
    var data = await api('/api/kb');
    var tbody = document.getElementById('manage-kb-body');
    if (data.articles.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--npe-gray-500);">No articles yet.</td></tr>';
      return;
    }
    tbody.innerHTML = data.articles.map(function(a) {
      return '<tr>' +
        '<td>' + escapeHtml(a.title) + '</td>' +
        '<td><span class="kb-category">' + escapeHtml(a.category) + '</span></td>' +
        '<td>' + formatDate(a.created_at) + '</td>' +
        '<td><button class="btn btn-secondary btn-sm" onclick="editArticle(' + a.id + ')">Edit</button> ' +
        '<button class="btn btn-sm" style="background:#dc3545;color:#fff;" onclick="deleteArticle(' + a.id + ')">Delete</button></td>' +
        '</tr>';
    }).join('');
  } catch (e) { console.error(e); }
}

function openKBModal(title) {
  document.getElementById('kb-modal-title').textContent = title || 'New Article';
  document.getElementById('kb-modal').classList.add('active');
}

function closeKBModal() {
  document.getElementById('kb-modal').classList.remove('active');
  document.getElementById('kb-article-form').reset();
  document.getElementById('kb-edit-id').value = '';
}

async function editArticle(id) {
  try {
    var data = await api('/api/kb/' + id);
    var a = data.article;
    document.getElementById('kb-edit-id').value = a.id;
    document.getElementById('kb-title').value = a.title;
    document.getElementById('kb-category-input').value = a.category;
    document.getElementById('kb-content').value = a.content;
    openKBModal('Edit Article');
  } catch (e) { alert('Error: ' + e.message); }
}

async function deleteArticle(id) {
  if (!confirm('Delete this article?')) return;
  try {
    await api('/api/kb/' + id, { method: 'DELETE' });
    loadManageKB();
  } catch (e) { alert('Error: ' + e.message); }
}

function initManageKB() {
  document.getElementById('btn-new-article').addEventListener('click', function() {
    closeKBModal();
    openKBModal('New Article');
  });

  document.getElementById('kb-save-btn').addEventListener('click', async function() {
    var editId = document.getElementById('kb-edit-id').value;
    var body = {
      title: document.getElementById('kb-title').value,
      category: document.getElementById('kb-category-input').value,
      content: document.getElementById('kb-content').value
    };
    if (!body.title || !body.category || !body.content) return alert('All fields required');
    try {
      if (editId) {
        await api('/api/kb/' + editId, { method: 'PUT', body: body });
      } else {
        await api('/api/kb', { method: 'POST', body: body });
      }
      closeKBModal();
      loadManageKB();
    } catch (e) { alert('Error: ' + e.message); }
  });
}
