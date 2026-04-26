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
  // Check if this is a password reset link
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get('reset_token');
  if (resetToken) {
    showAuth();
    showResetPasswordForm(resetToken);
    return;
  }

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

function showResetPasswordForm(token) {
  var authTitle = document.getElementById('auth-title');
  var authSubtitle = document.getElementById('auth-subtitle');
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('forgot-password-form').style.display = 'none';
  document.getElementById('reset-password-form').style.display = '';
  document.getElementById('auth-toggle-text').style.display = 'none';
  document.getElementById('auth-toggle-btn').style.display = 'none';
  authTitle.textContent = 'Set New Password';
  authSubtitle.textContent = 'Choose a new password for your account';
  document.getElementById('reset-password-form').dataset.token = token;
}

function showLoginView() {
  var authTitle = document.getElementById('auth-title');
  var authSubtitle = document.getElementById('auth-subtitle');
  var toggleText = document.getElementById('auth-toggle-text');
  var toggleBtn = document.getElementById('auth-toggle-btn');
  document.getElementById('login-form').style.display = '';
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('forgot-password-form').style.display = 'none';
  document.getElementById('reset-password-form').style.display = 'none';
  toggleText.style.display = '';
  toggleBtn.style.display = '';
  toggleText.textContent = "Don't have an account?";
  toggleBtn.textContent = 'Register here';
  authTitle.textContent = 'IT Support Portal';
  authSubtitle.textContent = 'Sign in to manage your IT requests';
}

function initAuth() {
  var loginForm = document.getElementById('login-form');
  var registerForm = document.getElementById('register-form');
  var forgotForm = document.getElementById('forgot-password-form');
  var resetForm = document.getElementById('reset-password-form');
  var toggleBtn = document.getElementById('auth-toggle-btn');
  var toggleText = document.getElementById('auth-toggle-text');
  var authTitle = document.getElementById('auth-title');
  var authSubtitle = document.getElementById('auth-subtitle');
  var authError = document.getElementById('auth-error');
  var isLogin = true;

  // Forgot password link
  document.getElementById('forgot-password-link').addEventListener('click', function(e) {
    e.preventDefault();
    authError.classList.remove('visible');
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    forgotForm.style.display = '';
    resetForm.style.display = 'none';
    toggleText.style.display = 'none';
    toggleBtn.style.display = 'none';
    authTitle.textContent = 'Forgot Password';
    authSubtitle.textContent = 'We\'ll send a reset link to your email';
  });

  // Forgot password form submit
  forgotForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    authError.classList.remove('visible');
    var submitBtn = forgotForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    try {
      await api('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: document.getElementById('forgot-email').value }
      });
      authError.style.color = '#28a745';
      authError.textContent = 'If that email is registered, a reset link has been sent. Check your inbox.';
      authError.classList.add('visible');
      setTimeout(function() {
        authError.style.color = '';
        showLoginView();
      }, 4000);
    } catch (err) {
      authError.style.color = '';
      authError.textContent = err.message;
      authError.classList.add('visible');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Reset Link';
    }
  });

  // Reset password form submit
  resetForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    authError.classList.remove('visible');
    var newPass = document.getElementById('new-password').value;
    var confirmPass = document.getElementById('confirm-password').value;
    if (newPass !== confirmPass) {
      authError.textContent = 'Passwords do not match';
      authError.classList.add('visible');
      return;
    }
    var submitBtn = resetForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: { token: resetForm.dataset.token, password: newPass }
      });
      // Remove token from URL without reloading
      window.history.replaceState({}, document.title, '/');
      authError.style.color = '#28a745';
      authError.textContent = 'Password reset successfully! You can now sign in.';
      authError.classList.add('visible');
      setTimeout(function() {
        authError.style.color = '';
        showLoginView();
      }, 3000);
    } catch (err) {
      authError.style.color = '';
      authError.textContent = err.message;
      authError.classList.add('visible');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Set New Password';
    }
  });

  toggleBtn.addEventListener('click', function(e) {
    e.preventDefault();
    isLogin = !isLogin;
    authError.classList.remove('visible');
    if (isLogin) {
      loginForm.style.display = '';
      registerForm.style.display = 'none';
      forgotForm.style.display = 'none';
      resetForm.style.display = 'none';
      toggleText.style.display = '';
      toggleBtn.style.display = '';
      toggleText.textContent = "Don't have an account?";
      toggleBtn.textContent = 'Register here';
      authTitle.textContent = 'IT Support Portal';
      authSubtitle.textContent = 'Sign in to manage your IT requests';
    } else {
      loginForm.style.display = 'none';
      registerForm.style.display = '';
      forgotForm.style.display = 'none';
      resetForm.style.display = 'none';
      toggleText.style.display = '';
      toggleBtn.style.display = '';
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
