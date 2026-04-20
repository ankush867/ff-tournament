const API = '';
let currentUser = null;
let currentAdmin = null;
let allMatches = [];

// ============ AUTH ============
function showAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  if (tab === 'login') {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.querySelectorAll('.auth-tab')[0].classList.add('active');
  } else {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.querySelectorAll('.auth-tab')[1].classList.add('active');
  }
}

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
    setTimeout(() => showAuthTab('login'), 1500);
  } catch (e) {
    errEl.textContent = 'Network error. Please try again.'; errEl.style.display = 'block';
  }
}

function showAdminLogin() {
  const login = prompt('Admin Username:');
  if (!login) return;
  const password = prompt('Admin Password:');
  if (!password) return;
  
  fetch(API + '/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: login, password })
  }).then(r => r.json()).then(data => {
    if (data.success) {
      currentAdmin = data.admin;
      localStorage.setItem('ff_admin', JSON.stringify(data.admin));
      showAdminPanel();
    } else {
      alert('Invalid admin credentials!');
    }
  }).catch(() => alert('Network error'));
}

function logout() {
  currentUser = null;
  localStorage.removeItem('ff_user');
  document.getElementById('app-page').style.display = 'none';
  document.getElementById('auth-page').style.display = 'flex';
}

function adminLogout() {
  currentAdmin = null;
  localStorage.removeItem('ff_admin');
  document.getElementById('admin-page').style.display = 'none';
  document.getElementById('auth-page').style.display = 'flex';
}

// ============ APP ============
function showApp() {
  document.getElementById('auth-page').style.display = 'none';
  document.getElementById('admin-page').style.display = 'none';
  document.getElementById('app-page').style.display = 'block';
  loadMatches();
  showPage('home');
}

function showPage(page) {
  ['home', 'matches', 'my-matches', 'profile'].forEach(p => {
    document.getElementById('page-' + p).style.display = p === page ? 'block' : 'none';
  });
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  event && event.target && event.target.classList && event.target.classList.add('active');
  
  if (page === 'home') loadMatches();
  if (page === 'matches') loadMatches();
  if (page === 'my-matches') loadMyMatches();
  if (page === 'profile') loadProfile();
}

async function loadMatches() {
  try {
    const res = await fetch(API + '/api/matches');
    allMatches = await res.json();
    
    const upcoming = allMatches.filter(m => m.status === 'upcoming' || m.status === 'live');
    document.getElementById('home-matches').innerHTML = upcoming.slice(0, 6).map(m => matchCardHTML(m)).join('');
    document.getElementById('all-matches').innerHTML = allMatches.map(m => matchCardHTML(m)).join('');
    
    document.getElementById('stat-matches').textContent = upcoming.length;
    const totalPrize = allMatches.reduce((s, m) => s + (m.prize_pool || 0), 0);
    document.getElementById('stat-prize').textContent = '₹' + totalPrize;
  } catch (e) {
    console.error('Error loading matches:', e);
  }
}

function filterMatches(status) {
  const filtered = status === 'all' ? allMatches : allMatches.filter(m => m.status === status);
  document.getElementById('all-matches').innerHTML = filtered.map(m => matchCardHTML(m)).join('');
}

function matchCardHTML(m) {
  const dt = new Date(m.match_time);
  const timeStr = dt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const statusClass = 'status-' + m.status;
  return `
    <div class="card match-card">
      <div class="card-header">
        <span class="card-title">${escHtml(m.title)}</span>
        <span class="status-badge ${statusClass}">${m.status.toUpperCase()}</span>
      </div>
      <div class="match-info">
        <div class="match-info-item"><div class="label">Mode</div><div class="value">${escHtml(m.game_mode)}</div></div>
        <div class="match-info-item"><div class="label">Map</div><div class="value">${escHtml(m.map_name)}</div></div>
        <div class="match-info-item"><div class="label">Entry Fee</div><div class="value">₹${m.entry_fee}</div></div>
        <div class="match-info-item"><div class="label">Prize Pool</div><div class="value" style="color:var(--success)">₹${m.prize_pool}</div></div>
        <div class="match-info-item"><div class="label">Players</div><div class="value">${m.current_players}/${m.max_players}</div></div>
        <div class="match-info-item"><div class="label">Time</div><div class="value">${timeStr}</div></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${m.status !== 'completed' ? `<button class="btn btn-primary btn-sm" onclick="joinMatch('${m.id}')">Join Match</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="viewMatchDetail('${m.id}')">View Details</button>
      </div>
    </div>
  `;
}

async function joinMatch(matchId) {
  if (!currentUser) return alert('Please login first');
  try {
    const res = await fetch(API + '/api/matches/' + matchId + '/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id })
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.registration_id) {
        // Already registered, show payment
        const match = allMatches.find(m => m.id === matchId);
        if (match && match.entry_fee > 0) openPaymentModal(matchId, data.registration_id, match.entry_fee);
        else alert('You are already registered for this match!');
        return;
      }
      alert(data.error); return;
    }
    
    alert('Successfully registered!');
    const match = allMatches.find(m => m.id === matchId);
    if (match && match.entry_fee > 0) {
      openPaymentModal(matchId, data.registration_id, data.entry_fee);
    }
    loadMatches();
  } catch (e) {
    alert('Network error');
  }
}

async function viewMatchDetail(matchId) {
  try {
    const match = allMatches.find(m => m.id === matchId) || await (await fetch(API + '/api/matches/' + matchId)).json();
    const dt = new Date(match.match_time);
    const timeStr = dt.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' });
    
    let roomHTML = '';
    if (currentUser) {
      try {
        const roomRes = await fetch(API + '/api/matches/' + matchId + '/room?user_id=' + currentUser.id);
        const roomData = await roomRes.json();
        if (roomRes.ok && roomData.room_id) {
          roomHTML = `
            <div class="room-credentials">
              <h3>🔑 Room Credentials</h3>
              <div class="cred">Room ID: ${escHtml(roomData.room_id)}</div>
              <div class="cred">Password: ${escHtml(roomData.room_password)}</div>
            </div>`;
        } else if (!roomRes.ok) {
          roomHTML = `<div class="alert alert-info">${roomData.error || 'Room details not available yet.'}</div>`;
        }
      } catch (e) {}
    }
    
    // Load results if completed
    let resultsHTML = '';
    if (match.status === 'completed') {
      try {
        const resRes = await fetch(API + '/api/matches/' + matchId + '/results');
        const results = await resRes.json();
        if (results.length > 0) {
          resultsHTML = `<h3 style="color:var(--primary);margin:15px 0 10px">🏆 Results</h3>
            <div class="table-responsive"><table>
              <thead><tr><th>Rank</th><th>Player</th><th>Kills</th><th>Prize</th></tr></thead>
              <tbody>${results.map(r => `<tr><td>#${r.rank}</td><td>${escHtml(r.username)}</td><td>${r.kills}</td><td>₹${r.prize}</td></tr>`).join('')}</tbody>
            </table></div>`;
        }
      } catch (e) {}
    }
    
    document.getElementById('match-detail-content').innerHTML = `
      <h2 style="color:var(--primary)">${escHtml(match.title)}</h2>
      <div class="match-info">
        <div class="match-info-item"><div class="label">Mode</div><div class="value">${escHtml(match.game_mode)}</div></div>
        <div class="match-info-item"><div class="label">Map</div><div class="value">${escHtml(match.map_name)}</div></div>
        <div class="match-info-item"><div class="label">Entry Fee</div><div class="value">₹${match.entry_fee}</div></div>
        <div class="match-info-item"><div class="label">Prize Pool</div><div class="value" style="color:var(--success)">₹${match.prize_pool}</div></div>
        <div class="match-info-item"><div class="label">Players</div><div class="value">${match.current_players}/${match.max_players}</div></div>
        <div class="match-info-item"><div class="label">Time</div><div class="value">${timeStr}</div></div>
      </div>
      <div><span class="status-badge status-${match.status}">${match.status.toUpperCase()}</span></div>
      ${roomHTML}
      ${resultsHTML}
    `;
    openModal('match-detail-modal');
  } catch (e) {
    alert('Error loading match details');
  }
}

// ============ MY MATCHES ============
async function loadMyMatches() {
  if (!currentUser) return;
  try {
    const res = await fetch(API + '/api/user/' + currentUser.id + '/registrations');
    const regs = await res.json();
    
    if (regs.length === 0) {
      document.getElementById('my-matches-list').innerHTML = '<div class="card"><p style="text-align:center;color:var(--text-muted)">No matches joined yet. Go to Matches to join!</p></div>';
      return;
    }
    
    document.getElementById('my-matches-list').innerHTML = regs.map(r => {
      const dt = new Date(r.match_time);
      const timeStr = dt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      const payStatus = r.payment_status || 'pending';
      let payBadge = '';
      if (payStatus === 'approved') payBadge = '<span class="status-badge status-completed">PAID ✓</span>';
      else if (payStatus === 'submitted') payBadge = '<span class="status-badge status-upcoming">VERIFYING</span>';
      else if (payStatus === 'rejected') payBadge = '<span class="status-badge status-live">REJECTED</span>';
      else payBadge = '<span class="status-badge" style="background:rgba(255,193,7,0.2);color:var(--warning)">PENDING</span>';
      
      return `<div class="card">
        <div class="card-header">
          <span class="card-title">${escHtml(r.title)}</span>
          ${payBadge}
        </div>
        <p style="color:var(--text-muted)">${timeStr} | Status: ${r.match_status}</p>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" onclick="viewMatchDetail('${r.match_id}')">View Details</button>
          ${r.entry_fee > 0 && (!r.payment_status || r.payment_status === 'pending' || r.payment_status === 'rejected') ? 
            `<button class="btn btn-primary btn-sm" onclick="openPaymentModal('${r.match_id}','${r.id}',${r.entry_fee})">Pay ₹${r.entry_fee}</button>` : ''}
        </div>
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
      <div class="match-info-item"><div class="label">Phone</div><div class="value">${escHtml(currentUser.phone || 'N/A')}</div></div>
      <div class="match-info-item"><div class="label">FF UID</div><div class="value">${escHtml(currentUser.ff_uid || 'N/A')}</div></div>
    </div>
    <div style="margin-top:15px">
      <p style="color:var(--text-muted)">Support: <a href="mailto:vt158376@gmail.com" style="color:var(--primary)">vt158376@gmail.com</a></p>
    </div>
  `;
}

// ============ PAYMENT ============
let paymentMatchId = '', paymentRegId = '';

async function openPaymentModal(matchId, regId, amount) {
  paymentMatchId = matchId;
  paymentRegId = regId;
  document.getElementById('modal-amount').textContent = amount;
  document.getElementById('payment-utr').value = '';
  document.getElementById('payment-screenshot').value = '';
  document.getElementById('payment-error').style.display = 'none';
  
  try {
    const res = await fetch(API + '/api/upi-qr?amount=' + amount);
    const data = await res.json();
    document.getElementById('qr-code-img').src = data.qr;
    document.getElementById('modal-upi-id').textContent = data.upi_id;
  } catch (e) {}
  
  openModal('payment-modal');
}

async function submitPayment() {
  const utr = document.getElementById('payment-utr').value.trim();
  const screenshot = document.getElementById('payment-screenshot').files[0];
  const errEl = document.getElementById('payment-error');
  errEl.style.display = 'none';
  
  if (!utr) { errEl.textContent = 'UTR number is required'; errEl.style.display = 'block'; return; }
  if (!screenshot) { errEl.textContent = 'Payment screenshot is required'; errEl.style.display = 'block'; return; }
  
  const formData = new FormData();
  formData.append('user_id', currentUser.id);
  formData.append('match_id', paymentMatchId);
  formData.append('registration_id', paymentRegId);
  formData.append('amount', document.getElementById('modal-amount').textContent);
  formData.append('utr_number', utr);
  formData.append('screenshot', screenshot);
  
  try {
    const res = await fetch(API + '/api/payments', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error; errEl.style.display = 'block'; return; }
    
    alert('Payment submitted successfully! Admin will verify it soon.');
    closeModal('payment-modal');
    loadMyMatches();
  } catch (e) {
    errEl.textContent = 'Network error'; errEl.style.display = 'block';
  }
}

// ============ ADMIN ============
function showAdminPanel() {
  document.getElementById('auth-page').style.display = 'none';
  document.getElementById('app-page').style.display = 'none';
  document.getElementById('admin-page').style.display = 'block';
  loadAdminMatches();
  showAdminTab('admin-matches');
}

function showAdminTab(tab) {
  ['admin-matches', 'admin-payments', 'admin-users', 'admin-results'].forEach(t => {
    document.getElementById(t).style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  event && event.target && event.target.classList.add('active');
  
  if (tab === 'admin-matches') loadAdminMatches();
  if (tab === 'admin-payments') loadAdminPayments();
  if (tab === 'admin-users') loadAdminUsers();
  if (tab === 'admin-results') loadResultMatches();
}

async function loadAdminMatches() {
  try {
    const res = await fetch(API + '/api/matches');
    const matches = await res.json();
    document.getElementById('admin-matches-list').innerHTML = matches.map(m => {
      const dt = new Date(m.match_time);
      const timeStr = dt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      return `<div class="card">
        <div class="card-header">
          <span class="card-title">${escHtml(m.title)}</span>
          <span class="status-badge status-${m.status}">${m.status.toUpperCase()}</span>
        </div>
        <div class="match-info">
          <div class="match-info-item"><div class="label">Mode</div><div class="value">${escHtml(m.game_mode)}</div></div>
          <div class="match-info-item"><div class="label">Map</div><div class="value">${escHtml(m.map_name)}</div></div>
          <div class="match-info-item"><div class="label">Fee</div><div class="value">₹${m.entry_fee}</div></div>
          <div class="match-info-item"><div class="label">Prize</div><div class="value">₹${m.prize_pool}</div></div>
          <div class="match-info-item"><div class="label">Players</div><div class="value">${m.current_players}/${m.max_players}</div></div>
          <div class="match-info-item"><div class="label">Time</div><div class="value">${timeStr}</div></div>
        </div>
        <p style="color:var(--text-muted);font-size:0.85rem">Room: ${escHtml(m.room_id || 'Not set')} | Pass: ${escHtml(m.room_password || 'Not set')}</p>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-warning btn-sm" onclick="editMatch('${m.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteMatch('${m.id}')">Delete</button>
        </div>
      </div>`;
    }).join('') || '<p style="color:var(--text-muted);text-align:center">No matches yet. Create one!</p>';
  } catch (e) {
    console.error('Error loading admin matches:', e);
  }
}

function showCreateMatch() {
  document.getElementById('match-modal-title').textContent = 'Create New Match';
  document.getElementById('edit-match-id').value = '';
  document.getElementById('match-title').value = '';
  document.getElementById('match-mode').value = 'Battle Royale';
  document.getElementById('match-map').value = 'Bermuda';
  document.getElementById('match-fee').value = '0';
  document.getElementById('match-prize').value = '0';
  document.getElementById('match-maxplayers').value = '48';
  document.getElementById('match-time').value = '';
  document.getElementById('match-roomid').value = '';
  document.getElementById('match-roompw').value = '';
  document.getElementById('match-status').value = 'upcoming';
  openModal('match-modal');
}

async function editMatch(id) {
  try {
    const res = await fetch(API + '/api/matches/' + id);
    const m = await res.json();
    document.getElementById('match-modal-title').textContent = 'Edit Match';
    document.getElementById('edit-match-id').value = m.id;
    document.getElementById('match-title').value = m.title;
    document.getElementById('match-mode').value = m.game_mode;
    document.getElementById('match-map').value = m.map_name;
    document.getElementById('match-fee').value = m.entry_fee;
    document.getElementById('match-prize').value = m.prize_pool;
    document.getElementById('match-maxplayers').value = m.max_players;
    document.getElementById('match-time').value = m.match_time ? m.match_time.slice(0, 16) : '';
    document.getElementById('match-roomid').value = m.room_id || '';
    document.getElementById('match-roompw').value = m.room_password || '';
    document.getElementById('match-status').value = m.status;
    openModal('match-modal');
  } catch (e) {
    alert('Error loading match');
  }
}

async function saveMatch() {
  const id = document.getElementById('edit-match-id').value;
  const body = {
    title: document.getElementById('match-title').value,
    game_mode: document.getElementById('match-mode').value,
    map_name: document.getElementById('match-map').value,
    entry_fee: document.getElementById('match-fee').value,
    prize_pool: document.getElementById('match-prize').value,
    max_players: document.getElementById('match-maxplayers').value,
    match_time: document.getElementById('match-time').value,
    room_id: document.getElementById('match-roomid').value,
    room_password: document.getElementById('match-roompw').value,
    status: document.getElementById('match-status').value
  };
  
  if (!body.title || !body.match_time) { alert('Title and match time are required'); return; }
  
  try {
    const url = id ? API + '/api/admin/matches/' + id : API + '/api/admin/matches';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.success) {
      closeModal('match-modal');
      loadAdminMatches();
      alert(id ? 'Match updated!' : 'Match created!');
    } else {
      alert(data.error || 'Error saving match');
    }
  } catch (e) {
    alert('Network error');
  }
}

async function deleteMatch(id) {
  if (!confirm('Are you sure you want to delete this match?')) return;
  try {
    await fetch(API + '/api/admin/matches/' + id, { method: 'DELETE' });
    loadAdminMatches();
  } catch (e) {
    alert('Error deleting match');
  }
}

// Admin Payments
async function loadAdminPayments() {
  try {
    const res = await fetch(API + '/api/admin/payments');
    const payments = await res.json();
    document.getElementById('admin-payments-tbody').innerHTML = payments.map(p => `
      <tr>
        <td>${escHtml(p.username)}</td>
        <td>${escHtml(p.match_title)}</td>
        <td>₹${p.amount}</td>
        <td>${escHtml(p.utr_number)}</td>
        <td>${p.screenshot ? `<img src="${p.screenshot}" class="screenshot-preview" onclick="window.open('${p.screenshot}','_blank')">` : 'N/A'}</td>
        <td><span class="status-badge ${p.status === 'approved' ? 'status-completed' : p.status === 'rejected' ? 'status-live' : 'status-upcoming'}">${p.status.toUpperCase()}</span></td>
        <td>
          ${p.status === 'pending' || p.status === 'submitted' ? `
            <button class="btn btn-success btn-sm" onclick="updatePayment('${p.id}','approved')">Approve</button>
            <button class="btn btn-danger btn-sm" onclick="updatePayment('${p.id}','rejected')">Reject</button>
          ` : p.status}
        </td>
      </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No payments yet</td></tr>';
  } catch (e) {
    console.error('Error loading payments:', e);
  }
}

async function updatePayment(id, status) {
  try {
    await fetch(API + '/api/admin/payments/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadAdminPayments();
    alert('Payment ' + status + '!');
  } catch (e) {
    alert('Error updating payment');
  }
}

// Admin Users
async function loadAdminUsers() {
  try {
    const res = await fetch(API + '/api/admin/users');
    const users = await res.json();
    document.getElementById('stat-players').textContent = users.length;
    document.getElementById('admin-users-tbody').innerHTML = users.map(u => `
      <tr>
        <td>${escHtml(u.username)}</td>
        <td>${escHtml(u.email || 'N/A')}</td>
        <td>${escHtml(u.phone || 'N/A')}</td>
        <td>${escHtml(u.ff_uid || 'N/A')}</td>
        <td><span class="status-badge ${u.is_suspended ? 'status-live' : 'status-completed'}">${u.is_suspended ? 'SUSPENDED' : 'ACTIVE'}</span></td>
        <td>
          <button class="btn ${u.is_suspended ? 'btn-success' : 'btn-danger'} btn-sm" onclick="toggleSuspend('${u.id}', ${!u.is_suspended})">
            ${u.is_suspended ? 'Unsuspend' : 'Suspend'}
          </button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No users yet</td></tr>';
  } catch (e) {
    console.error('Error loading users:', e);
  }
}

async function toggleSuspend(userId, suspend) {
  if (!confirm(suspend ? 'Suspend this user?' : 'Unsuspend this user?')) return;
  try {
    await fetch(API + '/api/admin/users/' + userId + '/suspend', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspend })
    });
    loadAdminUsers();
  } catch (e) {
    alert('Error updating user');
  }
}

// Admin Results
async function loadResultMatches() {
  try {
    const res = await fetch(API + '/api/matches');
    const matches = await res.json();
    const sel = document.getElementById('result-match-select');
    sel.innerHTML = '<option value="">-- Select Match --</option>' + matches.map(m => `<option value="${m.id}">${escHtml(m.title)} (${m.status})</option>`).join('');
  } catch (e) {}
}

async function loadMatchPlayers() {
  const matchId = document.getElementById('result-match-select').value;
  if (!matchId) { document.getElementById('result-players-list').innerHTML = ''; return; }
  
  try {
    const res = await fetch(API + '/api/matches/' + matchId + '/registrations');
    const regs = await res.json();
    
    if (regs.length === 0) {
      document.getElementById('result-players-list').innerHTML = '<p style="color:var(--text-muted)">No players registered</p>';
      return;
    }
    
    document.getElementById('result-players-list').innerHTML = `
      <div class="table-responsive"><table>
        <thead><tr><th>Player</th><th>FF UID</th><th>Rank</th><th>Kills</th><th>Prize (₹)</th></tr></thead>
        <tbody>
          ${regs.map(r => `<tr>
            <td>${escHtml(r.username)}</td>
            <td>${escHtml(r.ff_uid || 'N/A')}</td>
            <td><input type="number" class="form-control" style="width:70px" data-userid="${r.user_id}" data-field="rank" min="1"></td>
            <td><input type="number" class="form-control" style="width:70px" data-userid="${r.user_id}" data-field="kills" min="0" value="0"></td>
            <td><input type="number" class="form-control" style="width:90px" data-userid="${r.user_id}" data-field="prize" min="0" value="0"></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      <button class="btn btn-primary" style="margin-top:15px" onclick="submitResults()">Declare Results</button>
    `;
  } catch (e) {
    console.error('Error loading players:', e);
  }
}

async function submitResults() {
  const matchId = document.getElementById('result-match-select').value;
  if (!matchId) return;
  
  const rows = document.querySelectorAll('#result-players-list tbody tr');
  const results = [];
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const userId = inputs[0].dataset.userid;
    const rank = parseInt(inputs[0].value);
    const kills = parseInt(inputs[1].value) || 0;
    const prize = parseFloat(inputs[2].value) || 0;
    if (rank) results.push({ user_id: userId, rank, kills, prize });
  });
  
  if (results.length === 0) { alert('Please enter at least one rank'); return; }
  
  try {
    const res = await fetch(API + '/api/admin/results', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, results })
    });
    const data = await res.json();
    if (data.success) {
      alert('Results declared! Match marked as completed.');
      loadResultMatches();
      document.getElementById('result-players-list').innerHTML = '';
    }
  } catch (e) {
    alert('Error submitting results');
  }
}

// ============ UTILS ============
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function escHtml(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
});

// ============ INIT ============
(function init() {
  const savedUser = localStorage.getItem('ff_user');
  const savedAdmin = localStorage.getItem('ff_admin');
  
  if (savedAdmin) {
    currentAdmin = JSON.parse(savedAdmin);
    showAdminPanel();
  } else if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showApp();
  }
  
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
})();
