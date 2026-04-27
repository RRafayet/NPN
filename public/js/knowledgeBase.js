// ===== Knowledge Base — Documents only =====

function docIcon(mimeType, originalName) {
  var ext = (originalName || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return '&#128196;';
  if (['doc','docx'].indexOf(ext) !== -1) return '&#128210;';
  if (['xls','xlsx','csv'].indexOf(ext) !== -1) return '&#128202;';
  if (['ppt','pptx'].indexOf(ext) !== -1) return '&#128203;';
  if (['zip','rar','7z'].indexOf(ext) !== -1) return '&#128230;';
  if (['png','jpg','jpeg','gif','webp'].indexOf(ext) !== -1) return '&#128247;';
  return '&#128196;';
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function loadKnowledgeBase() {
  loadDocuments();
}

async function loadDocuments() {
  try {
    var isAdmin = currentUser && currentUser.role === 'admin';
    var uploadBtn = document.getElementById('btn-upload-doc');
    if (uploadBtn) uploadBtn.style.display = isAdmin ? '' : 'none';

    var data = await api('/api/docs');
    var list = document.getElementById('doc-list');
    var empty = document.getElementById('doc-empty');

    if (!data.documents || data.documents.length === 0) {
      list.innerHTML = '';
      empty.style.display = '';
      return;
    }
    empty.style.display = 'none';
    list.innerHTML = data.documents.map(function(d) {
      var deleteBtn = isAdmin
        ? '<button class="btn btn-sm" style="background:#dc3545;color:#fff;margin-left:8px;" onclick="deleteDocument(' + d.id + ')">Delete</button>'
        : '';
      return '<div class="doc-card">' +
        '<div class="doc-icon">' + docIcon(d.mime_type, d.original_name) + '</div>' +
        '<div class="doc-info">' +
          '<div class="doc-title">' + escapeHtml(d.title) + '</div>' +
          '<div class="doc-meta">' +
            '<span class="kb-category">' + escapeHtml(d.category) + '</span>' +
            '<span style="color:#999;font-size:12px;margin-left:8px;">' + formatFileSize(d.file_size) + '</span>' +
            '<span style="color:#999;font-size:12px;margin-left:8px;">' + formatDate(d.created_at) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="doc-actions">' +
          '<a href="/uploads/docs/' + encodeURIComponent(d.filename) + '" download="' + escapeHtml(d.original_name) + '" class="btn btn-sm btn-primary">&#11015; Download</a>' +
          deleteBtn +
        '</div>' +
      '</div>';
    }).join('');
  } catch (e) { console.error(e); }
}

async function deleteDocument(id) {
  if (!confirm('Delete this document?')) return;
  try {
    await api('/api/docs/' + id, { method: 'DELETE' });
    loadDocuments();
  } catch (e) { alert('Error: ' + e.message); }
}

function openDocModal() {
  document.getElementById('doc-upload-form').reset();
  document.getElementById('doc-file-name').textContent = '';
  document.getElementById('doc-upload-error').classList.remove('visible');
  document.getElementById('doc-upload-modal').classList.add('active');
}

function closeDocModal() {
  document.getElementById('doc-upload-modal').classList.remove('active');
}

function initDocUpload() {
  var uploadArea = document.getElementById('doc-upload-area');
  var fileInput = document.getElementById('doc-file');

  document.getElementById('btn-upload-doc').addEventListener('click', openDocModal);

  uploadArea.addEventListener('click', function() { fileInput.click(); });
  uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--npe-red)';
  });
  uploadArea.addEventListener('dragleave', function() { uploadArea.style.borderColor = ''; });
  uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadArea.style.borderColor = '';
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      document.getElementById('doc-file-name').textContent = e.dataTransfer.files[0].name;
    }
  });
  fileInput.addEventListener('change', function() {
    if (fileInput.files.length) {
      document.getElementById('doc-file-name').textContent = fileInput.files[0].name;
    }
  });

  document.getElementById('doc-upload-btn').addEventListener('click', async function() {
    var errEl = document.getElementById('doc-upload-error');
    errEl.classList.remove('visible');
    var title = document.getElementById('doc-title').value.trim();
    var file = document.getElementById('doc-file').files[0];
    if (!title) { errEl.textContent = 'Please enter a title'; errEl.classList.add('visible'); return; }
    if (!file) { errEl.textContent = 'Please select a file'; errEl.classList.add('visible'); return; }

    var btn = this;
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    try {
      var formData = new FormData();
      formData.append('title', title);
      formData.append('category', document.getElementById('doc-category').value.trim() || 'General');
      formData.append('file', file);
      await api('/api/docs', { method: 'POST', body: formData });
      closeDocModal();
      loadDocuments();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.add('visible');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload';
    }
  });
}

function initKBSearch() {}
function loadManageKB() {}
function initManageKB() {}
