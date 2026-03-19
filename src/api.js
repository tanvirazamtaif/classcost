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

// ── Education Fees ─────────────────────────────────────────────────────────

export async function getEducationFees(userId) {
  return request(`/api/education-fees/${userId}`);
}

export async function syncEducationFees(userId, fees) {
  return request('/api/education-fees/sync', {
    method: 'POST',
    body: JSON.stringify({ userId, fees }),
  });
}

// ── Housing ──────────────────────────────────────────────────────────────

export async function getHousings(userId) {
  return request(`/api/housing/${userId}`);
}

export async function createHousing(userId, housing) {
  return request('/api/housing', {
    method: 'POST',
    body: JSON.stringify({ userId, housing }),
  });
}

export async function updateHousing(id, housing) {
  return request(`/api/housing/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ housing }),
  });
}

export async function deleteHousing(id) {
  return request(`/api/housing/${id}`, { method: 'DELETE' });
}

// ── Coaching Centers ──────────────────────────────────────────────────────

export async function getCoachingCenters(userId) {
  return request(`/api/coaching/${userId}`);
}

export async function createCoachingCenter(data) {
  return request('/api/coaching', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCoachingCenter(id, data) {
  return request(`/api/coaching/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteCoachingCenter(id) {
  return request(`/api/coaching/${id}`, { method: 'DELETE' });
}

export async function recordCoachingPayment(id) {
  return request(`/api/coaching/${id}/payment`, { method: 'PATCH' });
}

// ── Batches ───────────────────────────────────────────────────────────────

export async function getBatches(userId) {
  return request(`/api/batches/${userId}`);
}

export async function createBatch(data) {
  return request('/api/batches', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateBatch(id, data) {
  return request(`/api/batches/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteBatch(id) {
  return request(`/api/batches/${id}`, { method: 'DELETE' });
}

// ── Private Tutors ────────────────────────────────────────────────────────

export async function getTutors(userId) {
  return request(`/api/tutors/${userId}`);
}

export async function createTutor(data) {
  return request('/api/tutors', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateTutor(id, data) {
  return request(`/api/tutors/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteTutor(id) {
  return request(`/api/tutors/${id}`, { method: 'DELETE' });
}

// ── Clubs ─────────────────────────────────────────────────────────────────

export async function getClubs(userId) {
  return request(`/api/clubs/${userId}`);
}

export async function createClub(userId, club) {
  return request('/api/clubs', { method: 'POST', body: JSON.stringify({ userId, club }) });
}

export async function updateClubApi(id, club) {
  return request(`/api/clubs/${id}`, { method: 'PUT', body: JSON.stringify({ club }) });
}

export async function deleteClub(id) {
  return request(`/api/clubs/${id}`, { method: 'DELETE' });
}

// ── Events ────────────────────────────────────────────────────────────────

export async function getEvents(userId) {
  return request(`/api/events/${userId}`);
}

export async function createEvent(data) {
  return request('/api/events', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateEvent(id, data) {
  return request(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteEvent(id) {
  return request(`/api/events/${id}`, { method: 'DELETE' });
}

// ── Uniforms ──────────────────────────────────────────────────────────────

export async function getUniforms(userId) {
  return request(`/api/uniforms/${userId}`);
}

export async function createUniform(data) {
  return request('/api/uniforms', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateUniform(id, data) {
  return request(`/api/uniforms/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteUniform(id) {
  return request(`/api/uniforms/${id}`, { method: 'DELETE' });
}

// ── Promo Redemption (public) ──────────────────────────────────────────────

export async function redeemPromoCode(userId, code) {
  return request('/api/admin/redeem', {
    method: 'POST',
    body: JSON.stringify({ userId, code }),
  });
}

// ── v3: Entities ────────────────────────────────────────────────────────────

export async function getEntities(userId) {
  return request(`/api/entities/${userId}`);
}

export async function createEntity(userId, data) {
  return request(`/api/entities/${userId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEntity(userId, id, data) {
  return request(`/api/entities/${userId}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteEntity(userId, id) {
  return request(`/api/entities/${userId}/${id}`, { method: 'DELETE' });
}

// ── v3: Trackers ────────────────────────────────────────────────────────────

export async function getTrackers(userId) {
  return request(`/api/trackers/${userId}`);
}

export async function getTrackersForEntity(userId, entityId) {
  return request(`/api/trackers/${userId}/entity/${entityId}`);
}

export async function createTracker(userId, data) {
  return request(`/api/trackers/${userId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTracker(userId, id, data) {
  return request(`/api/trackers/${userId}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── v3: Obligations ─────────────────────────────────────────────────────────

export async function getObligations(userId) {
  return request(`/api/obligations/${userId}`);
}

export async function getUpcomingObligations(userId) {
  return request(`/api/obligations/${userId}/upcoming`);
}

export async function createObligation(userId, data) {
  return request(`/api/obligations/${userId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateObligation(userId, id, data) {
  return request(`/api/obligations/${userId}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function applyWaiver(userId, id, data) {
  return request(`/api/obligations/${userId}/${id}/waiver`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function skipObligation(userId, id) {
  return request(`/api/obligations/${userId}/${id}/skip`, { method: 'PATCH' });
}

// ── v3: Ledger ──────────────────────────────────────────────────────────────

export async function getLedgerEntries(userId, params = {}) {
  const query = new URLSearchParams();
  if (params.cursor) query.set('cursor', params.cursor);
  const base = params.entityId
    ? `/api/ledger/${userId}/entity/${params.entityId}`
    : params.trackerId
      ? `/api/ledger/${userId}/tracker/${params.trackerId}`
      : `/api/ledger/${userId}`;
  const qs = query.toString();
  return request(qs ? `${base}?${qs}` : base);
}

export async function getLedgerSummary(userId) {
  return request(`/api/ledger/${userId}/summary`);
}

export async function createLedgerEntry(userId, data) {
  return request(`/api/ledger/${userId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function voidLedgerEntry(userId, id, reason) {
  return request(`/api/ledger/${userId}/${id}/void`, {
    method: 'PATCH',
    body: JSON.stringify({ voidReason: reason }),
  });
}

// ── v3: Allocations ─────────────────────────────────────────────────────────

export async function getAllocationsForEntry(userId, entryId) {
  return request(`/api/allocations/${userId}/entry/${entryId}`);
}

export async function createAllocation(userId, data) {
  return request(`/api/allocations/${userId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
