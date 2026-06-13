const API = '';
let currentUser = null;
let allMatches = [];
let pendingEntryFeeData = {};

// ============ AUTH ============
async function doLogin() {
  const login = document.getElementById('login-input').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  
  if (!login || !password) { errEl.textContent = 'Please fill all fields'; errEl.style.display = 'block'; return; }
  
  try {
    const res = await fetch(API + '/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error; errEl.style.display = 'block'; return; }
    
    currentUser = data.user;
    localStorage.setItem('ff_user', JSON.stringify(data.user));
    showApp();
  } catch (e) {
    errEl.textContent = 'Network error. Please try again.'; errEl.style.display = 'block';
  }
}

async function doRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const ff_uid = document.getElementById('reg-ffuid').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl = document.getElementById('register-error');
  const sucEl = document.getElementById('register-success');
  errEl.style.display = 'none'; sucEl.style.display = 'none';
  
  if (!username || !password) { errEl.textContent = 'Username and password required'; errEl.style.display = 'block'; return; }
  if (!email && !phone) { errEl.textContent = 'Email or phone number required'; errEl.style.display = 'block'; return; }
  
  try {
    const res = await fetch(API + '/api/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, phone, password, ff_uid })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error; errEl.style.display = 'block'; return; }
    
    sucEl.textContent = 'Registration successful! Please login.';
    sucEl.style.display = 'block';
    setTimeout(() => { document.getElementById('reg-username').value = ''; doLogin(); }, 1500);
  } catch (e) {
    errEl.textContent = 'Network error. Please try again.'; errEl.style.display = 'block';
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('ff_user');
  document.getElementById('app-page').style.display = 'none';
  document.getElementById('auth-page').style.display = 'flex';
}

// ============ APP ============
function showApp() {
  document.getElementById('auth-page').style.display = 'none';
  document.getElementById('app-page').style.display = 'block';
  loadMatches();
  showPage('home');
}

function showPage(page) {
  ['home', 'matches', 'my-matches', 'profile'].forEach(p => {
    document.getElementById('page-' + p).style.display = p === page ? 'block' : 'none';
  });
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  if (event && event.target && event.target.classList) event.target.classList.add('active');
  
  if (page === 'home') loadMatches();
  if (page === 'matches') loadMatches();
  if (page === 'my-matches') loadMyMatches();
  if (page === 'profile') loadProfile();
}

async function loadMatches() {
  try {
    const res = await fetch(API + '/api/matches');
    allMatches = await res.json();
    
    document.getElementById('home-matches').innerHTML = allMatches.slice(0, 6).map(m => matchCardHTML(m)).join('');
    document.getElementById('all-matches').innerHTML = allMatches.map(m => matchCardHTML(m)).join('');
    
    document.getElementById('stat-matches').textContent = allMatches.filter(m => m.status !== 'completed').length;
    const totalPrize = allMatches.reduce((s, m) => s + (m.prizePool || 0), 0);
    document.getElementById('stat-prize').textContent = '₹' + totalPrize;
  } catch (e) {
    console.error('Error loading matches:', e);
  }
}

function matchCardHTML(m) {
  const dt = new Date(m.scheduledAt);
  const timeStr = dt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  return `
    <div class="card match-card">
      <div class="card-header">
        <span class="card-title">${escHtml(m.title || 'Match')}</span>
        <span class="status-badge status-${m.status}">${m.status.toUpperCase()}</span>
      </div>
      <div class="match-info">
        <div class="match-info-item"><div class="label">Type</div><div class="value">${escHtml(m.type || 'N/A').toUpperCase()}</div></div>
        <div class="match-info-item"><div class="label">Entry Fee</div><div class="value">₹${m.entryFee || 0}</div></div>
        <div class="match-info-item"><div class="label">Players</div><div class="value">${m.registeredCount || 0}/${m.maxPlayers || 0}</div></div>
        <div class="match-info-item"><div class="label">Time</div><div class="value">${timeStr}</div></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${m.status === 'upcoming' ? `<button class="btn btn-primary btn-sm" onclick="joinMatch(${m.id}, '${escHtml(m.title)}', ${m.entryFee})">Join Match</button>` : ''}
      </div>
    </div>
  `;
}

async function joinMatch(matchId, matchTitle, entryFee) {
  if (!currentUser) return alert('Please login first');
  
  try {
    // Try to register first
    const res = await fetch(API + '/api/matches/' + matchId + '/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName: null })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      alert('Registration failed: ' + data.error);
      return;
    }
    
    // If entry fee is 0, registration is done
    if (entryFee === 0 || entryFee <= 0) {
      alert('✓ Successfully registered for ' + matchTitle);
      loadMatches();
      return;
    }
    
    // If entry fee > 0, show payment modal
    pendingEntryFeeData = {
      matchId: matchId,
      registrationId: data.id,
      entryFee: entryFee,
      matchTitle: matchTitle
    };
    
    openEntryFeeModal();
  } catch (e) {
    console.error('Join error:', e);
    alert('Network error: ' + e.message);
  }
}

function openEntryFeeModal() {
  document.getElementById('entry-fee-amount').textContent = pendingEntryFeeData.entryFee;
  document.getElementById('entry-fee-utr').value = '';
  document.getElementById('entry-fee-screenshot').value = '';
  document.getElementById('entry-fee-error').style.display = 'none';
  
  try {
    const res = fetch(API + '/api/upi-qr?amount=' + pendingEntryFeeData.entryFee);
    if (res) {
      res.then(r => r.json()).then(data => {
        document.getElementById('entry-fee-qr-code').src = data.qr;
        document.getElementById('entry-fee-upi-id').textContent = data.upi_id;
      }).catch(() => {});
    }
  } catch (e) {}
  
  openModal('entry-fee-modal');
}

async function submitEntryFeePayment() {
  const utr = document.getElementById('entry-fee-utr').value.trim();
  const screenshotInput = document.getElementById('entry-fee-screenshot');
  const screenshot = screenshotInput.files[0];
  const errEl = document.getElementById('entry-fee-error');
  const submitBtn = document.getElementById('submit-entry-fee-btn');
  
  errEl.style.display = 'none';
  
  if (!utr) { errEl.textContent = 'UTR number is required'; errEl.style.display = 'block'; return; }
  if (!screenshot) { errEl.textContent = 'Payment screenshot is required'; errEl.style.display = 'block'; return; }
  
  if (screenshot.size > 5 * 1024 * 1024) {
    errEl.textContent = 'Screenshot size must be less than 5MB'; errEl.style.display = 'block'; return;
  }
  
  if (!screenshot.type.startsWith('image/')) {
    errEl.textContent = 'Please upload a valid image file'; errEl.style.display = 'block'; return;
  }
  
  const formData = new FormData();
  formData.append('registration_id', pendingEntryFeeData.registrationId);
  formData.append('utr_number', utr);
  formData.append('screenshot', screenshot);
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';
  
  try {
    const res = await fetch(API + '/api/registrations/' + pendingEntryFeeData.registrationId + '/screenshot', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screenshot: await fileToDataURL(screenshot) })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      errEl.textContent = data.error || 'Failed to submit payment';
      errEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Payment & Register';
      return;
    }
    
    alert('✓ Payment submitted successfully! Entry fee recorded.');
    closeModal('entry-fee-modal');
    loadMatches();
    loadMyMatches();
  } catch (e) {
    console.error('Payment error:', e);
    errEl.textContent = 'Network error: ' + (e.message || 'Please try again');
    errEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Payment & Register';
  }
}

function fileToDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// ============ MY MATCHES ============
async function loadMyMatches() {
  if (!currentUser) return;
  try {
    const res = await fetch(API + '/api/my-registrations');
    const regs = await res.json();
    
    if (regs.length === 0) {
      document.getElementById('my-matches-list').innerHTML = '<div class="card"><p style="text-align:center;color:var(--text-muted)">No matches joined yet. Go to Matches to join!</p></div>';
      return;
    }
    
    document.getElementById('my-matches-list').innerHTML = regs.map(r => {
      const dt = new Date(r.match.scheduledAt);
      const timeStr = dt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      const payStatus = r.paymentStatus || 'pending';
      let payBadge = '';
      if (payStatus === 'confirmed') payBadge = '<span class="status-badge status-completed">PAID ✓</span>';
      else payBadge = '<span class="status-badge" style="background:rgba(255,193,7,0.2);color:var(--warning)">PENDING</span>';
      
      return `<div class="card">
        <div class="card-header">
          <span class="card-title">${escHtml(r.match.title || 'Match')}</span>
          ${payBadge}
        </div>
        <p style="color:var(--text-muted)">${timeStr} | ${r.match.type.toUpperCase()} | Entry: ₹${r.match.entryFee}</p>
      </div>`;
    }).join('');
  } catch (e) {
    console.error('Error loading my matches:', e);
  }
}

// ============ PROFILE ============
function loadProfile() {
  if (!currentUser) return;
  document.getElementById('profile-info').innerHTML = `
    <div class="match-info">
      <div class="match-info-item"><div class="label">Username</div><div class="value">${escHtml(currentUser.username)}</div></div>
      <div class="match-info-item"><div class="label">Email</div><div class="value">${escHtml(currentUser.email || 'N/A')}</div></div>
      <div class="match-info-item"><div class="label">Game ID</div><div class="value">${escHtml(currentUser.gameId || 'N/A')}</div></div>
    </div>
  `;
}

// ============ UTILS ============
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function escHtml(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
});

// Admin functions (placeholder - add as needed)
function showAdminLogin() {
  alert('Admin access coming soon');
}

function adminLogout() {
  alert('Admin logout');
}

// ============ INIT ============
(function init() {
  const savedUser = localStorage.getItem('ff_user');
  
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showApp();
  }
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
})();
