const BASE = import.meta.env.VITE_API_URL || '';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || res.statusText);
  }
  return res.json();
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function sendOTP(email) {
  return request('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyOTP(email, code) {
  return request('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export async function googleSignIn(credential) {
  return request('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
}

export async function registerUser(email) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function loginUser(email) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function getUser(id) {
  return request(`/api/auth/user/${id}`);
}

export async function updateProfile(id, data) {
  return request(`/api/auth/profile/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── Expenses ────────────────────────────────────────────────────────────────

export async function getExpenses(userId) {
  return request(`/api/expenses/${userId}`);
}

export async function createExpense(data) {
  return request('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateExpense(id, data) {
  return request(`/api/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteExpense(id) {
  return request(`/api/expenses/${id}`, {
    method: 'DELETE',
  });
}

// ── Semesters ───────────────────────────────────────────────────────────────

export async function getSemesters(userId) {
  return request(`/api/semesters/${userId}`);
}

export async function createSemester(data) {
  return request('/api/semesters', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSemester(id, data) {
  return request(`/api/semesters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSemester(id) {
  return request(`/api/semesters/${id}`, {
    method: 'DELETE',
  });
}

// ── Loans ───────────────────────────────────────────────────────────────────

export async function getLoans(userId) {
  return request(`/api/loans/${userId}`);
}

export async function createLoan(data) {
  return request('/api/loans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateLoan(id, data) {
  return request(`/api/loans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function addLoanPayment(id, payment) {
  return request(`/api/loans/${id}/payment`, {
    method: 'PUT',
    body: JSON.stringify({ payment }),
  });
}

export async function deleteLoan(id) {
  return request(`/api/loans/${id}`, {
    method: 'DELETE',
  });
}

// ── Settings ────────────────────────────────────────────────────────────────

export async function getSettings(userId) {
  return request(`/api/settings/${userId}`);
}

export async function updateSettings(userId, data) {
  return request(`/api/settings/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── Admin ──────────────────────────────────────────────────────────────────

function adminHeaders(password) {
  return { 'Content-Type': 'application/json', 'x-admin-password': password };
}

export async function getAdminStats(password) {
  return request('/api/admin/stats', { headers: adminHeaders(password) });
}

export async function getAdminUsers(password) {
  return request('/api/admin/users', { headers: adminHeaders(password) });
}

export async function getAdminPromos(password) {
  return request('/api/admin/promos', { headers: adminHeaders(password) });
}

export async function createAdminPromo(password, data) {
  return request('/api/admin/promos', {
    method: 'POST',
    headers: adminHeaders(password),
    body: JSON.stringify(data),
  });
}

export async function deleteAdminPromo(password, id) {
  return request(`/api/admin/promos/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(password),
  });
}

export async function toggleAdminPromo(password, id) {
  return request(`/api/admin/promos/${id}/toggle`, {
    method: 'PUT',
    headers: adminHeaders(password),
  });
}

// ── Promo Redemption (public) ──────────────────────────────────────────────

export async function redeemPromoCode(userId, code) {
  return request('/api/admin/redeem', {
    method: 'POST',
    body: JSON.stringify({ userId, code }),
  });
}
