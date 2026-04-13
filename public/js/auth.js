// ===== Auth Functions =====
function showAuth() {
  document.getElementById('auth-page').style.display = '';
  document.getElementById('app-layout').style.display = 'none';
}

function showApp() {
  document.getElementById('auth-page').style.display = 'none';
  document.getElementById('app-layout').style.display = '';
  document.getElementById('user-avatar').textContent = getInitials(currentUser.name);
  document.getElementById('user-display-name').textContent = currentUser.name;
  document.getElementById('user-display-role').textContent = currentUser.role === 'admin' ? 'IT Staff' : 'Employee';
  if (currentUser.role === 'admin') {
    document.getElementById('admin-nav').style.display = '';
  } else {
    document.getElementById('admin-nav').style.display = 'none';
  }
  loadStaff();
  navigateTo('dashboard');
}

async function checkAuth() {
  try {
    const data = await api('/api/auth/me');
    if (data.user) {
      currentUser = data.user;
      showApp();
    } else {
      showAuth();
    }
  } catch (e) {
    showAuth();
  }
}

function initAuth() {
  var loginForm = document.getElementById('login-form');
  var registerForm = document.getElementById('register-form');
  var toggleBtn = document.getElementById('auth-toggle-btn');
  var toggleText = document.getElementById('auth-toggle-text');
  var authTitle = document.getElementById('auth-title');
  var authSubtitle = document.getElementById('auth-subtitle');
  var authError = document.getElementById('auth-error');
  var isLogin = true;

  toggleBtn.addEventListener('click', function(e) {
    e.preventDefault();
    isLogin = !isLogin;
    authError.classList.remove('visible');
    if (isLogin) {
      loginForm.style.display = '';
      registerForm.style.display = 'none';
      toggleText.textContent = "Don't have an account?";
      toggleBtn.textContent = 'Register here';
      authTitle.textContent = 'IT Support Portal';
      authSubtitle.textContent = 'Sign in to manage your IT requests';
    } else {
      loginForm.style.display = 'none';
      registerForm.style.display = '';
      toggleText.textContent = 'Already have an account?';
      toggleBtn.textContent = 'Sign in';
      authTitle.textContent = 'Create Account';
      authSubtitle.textContent = 'Register to submit IT requests';
    }
  });

  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    authError.classList.remove('visible');
    try {
      var data = await api('/api/auth/login', {
        method: 'POST',
        body: {
          email: document.getElementById('login-email').value,
          password: document.getElementById('login-password').value
        }
      });
      currentUser = data.user;
      showApp();
    } catch (err) {
      authError.textContent = err.message;
      authError.classList.add('visible');
    }
  });

  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    authError.classList.remove('visible');
    try {
      var data = await api('/api/auth/register', {
        method: 'POST',
        body: {
          name: document.getElementById('reg-name').value,
          email: document.getElementById('reg-email').value,
          password: document.getElementById('reg-password').value
        }
      });
      currentUser = data.user;
      showApp();
    } catch (err) {
      authError.textContent = err.message;
      authError.classList.add('visible');
    }
  });

  document.getElementById('btn-logout').addEventListener('click', async function() {
    await api('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    showAuth();
  });
}
