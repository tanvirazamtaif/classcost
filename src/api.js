const BASE = import.meta.env.VITE_API_URL || '';

// ── Auth token (set at login, sent on every request) ──────────────────────────
const TOKEN_KEY = 'ut_v3_token';
let authToken = null;
try { authToken = (typeof localStorage !== 'undefined' && localStorage.getItem(TOKEN_KEY)) || null; } catch { /* no storage */ }

export function setAuthToken(token) {
  authToken = token || null;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
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
  const result = await request('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  if (result?.token) setAuthToken(result.token);
  return result;
}

export async function googleSignIn(credential) {
  const result = await request('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
  if (result?.token) setAuthToken(result.token);
  return result;
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

// ── ClassCost v2 — whole-tree document sync ───────────────────────────────────

export async function getV2Data(userId) {
  return request(`/api/v2data/${userId}`);
}

export async function saveV2Data(userId, data) {
  return request(`/api/v2data/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}

// ── Student feed (Phase 4) ────────────────────────────────────────────────────

export async function getMyFeedProfile() {
  return request('/api/feed/profile/me');
}

export async function claimHandle(handle, displayName) {
  return request('/api/feed/profile', {
    method: 'POST',
    body: JSON.stringify({ handle, displayName }),
  });
}

export async function listFeedPosts(cursor) {
  return request(`/api/feed/posts${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);
}

export async function createFeedPost(text, imageUrl) {
  return request('/api/feed/posts', {
    method: 'POST',
    body: JSON.stringify({ text, imageUrl }),
  });
}

export async function likePost(id) { return request(`/api/feed/posts/${id}/like`, { method: 'POST', body: '{}' }); }
export async function unlikePost(id) { return request(`/api/feed/posts/${id}/like`, { method: 'DELETE' }); }
export async function getComments(id) { return request(`/api/feed/posts/${id}/comments`); }
export async function addComment(id, text) { return request(`/api/feed/posts/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }); }
export async function followUser(handle) { return request(`/api/feed/follow/${encodeURIComponent(handle)}`, { method: 'POST', body: '{}' }); }
export async function unfollowUser(handle) { return request(`/api/feed/follow/${encodeURIComponent(handle)}`, { method: 'DELETE' }); }
export async function searchUsers(q) { return request(`/api/feed/users?q=${encodeURIComponent(q)}`); }
export async function getFeedProfile(handle) { return request(`/api/feed/profile/u/${encodeURIComponent(handle)}`); }
export async function getUserPosts(handle) { return request(`/api/feed/profile/u/${encodeURIComponent(handle)}/posts`); }
export async function uploadFeedImage(file) { return request('/api/feed/upload', { method: 'POST', headers: { 'Content-Type': file.type || 'image/jpeg' }, body: file }); }
export async function reportContent(targetType, targetId, reason) { return request('/api/feed/report', { method: 'POST', body: JSON.stringify({ targetType, targetId, reason }) }); }

// Direct messages
export async function listConversations() { return request('/api/feed/dm'); }
export async function getThread(handle) { return request(`/api/feed/dm/${encodeURIComponent(String(handle).replace('@', ''))}`); }
export async function sendDm(handle, text, replyToId, imageUrl) { return request(`/api/feed/dm/${encodeURIComponent(String(handle).replace('@', ''))}`, { method: 'POST', body: JSON.stringify({ text, ...(replyToId ? { replyToId } : {}), ...(imageUrl ? { imageUrl } : {}) }) }); }

// Notes (24h, atop Messages)
export async function getNotes() { return request('/api/feed/notes'); }
export async function setNote(text) { return request('/api/feed/notes', { method: 'POST', body: JSON.stringify({ text }) }); }

// Stories (24h)
export async function listStories() { return request('/api/feed/stories'); }
export async function createStory(imageUrl) { return request('/api/feed/stories', { method: 'POST', body: JSON.stringify({ imageUrl }) }); }
export async function deleteStory(id) { return request(`/api/feed/stories/${encodeURIComponent(id)}`, { method: 'DELETE' }); }

// Notifications
export async function getFeedNotifications() { return request('/api/feed/notifications'); }
export async function markNotificationsRead(types, fromHandle) { return request('/api/feed/notifications/read', { method: 'POST', body: JSON.stringify({ ...(types && types.length ? { types } : {}), ...(fromHandle ? { fromHandle: String(fromHandle).replace('@', '') } : {}) }) }); }
export async function getSuggestions(limit) { return request(`/api/feed/suggestions${limit ? `?limit=${limit}` : ''}`); }
export async function getFollowers(handle) { return request(`/api/feed/profile/u/${encodeURIComponent(String(handle).replace('@', ''))}/followers`); }
export async function getFollowing(handle) { return request(`/api/feed/profile/u/${encodeURIComponent(String(handle).replace('@', ''))}/following`); }
export async function getFeedPost(id) { return request(`/api/feed/posts/${encodeURIComponent(id)}`); }

// Profile edit + content delete
export async function updateMyProfile(data) { return request('/api/feed/profile', { method: 'POST', body: JSON.stringify(data) }); }
export async function deletePost(id) { return request(`/api/feed/posts/${id}`, { method: 'DELETE' }); }
export async function pinPost(id, pinned) { return request(`/api/feed/posts/${encodeURIComponent(id)}/pin`, { method: 'POST', body: JSON.stringify({ pinned }) }); }
export async function deleteComment(postId, commentId) { return request(`/api/feed/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }); }

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

export async function deleteEntity(userId, id, hard = false) {
  return request(`/api/entities/${userId}/${id}${hard ? '?hard=true' : ''}`, { method: 'DELETE' });
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

// ── v3: Semester Engine ─────────────────────────────────────────────────────

export async function createSemesterV3(userId, data) {
  return request(`/api/semester-engine?userId=${userId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSemesterSummaryV3(trackerId) {
  return request(`/api/semester-engine/${trackerId}/summary`);
}

export async function getSemestersForEntity(entityId) {
  return request(`/api/semester-engine/entity/${entityId}`);
}

export async function addFeeItem(trackerId, userId, data) {
  return request(`/api/semester-engine/${trackerId}/fee-items?userId=${userId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function addAdjustment(trackerId, userId, data) {
  return request(`/api/semester-engine/${trackerId}/adjustments?userId=${userId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function addWaiver(trackerId, userId, data) {
  return request(`/api/semester-engine/${trackerId}/waivers?userId=${userId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Reports / Forecast (Phase 4) ─────────────────────────────────────────────

export async function getReportsSummary(userId) {
  return request(`/api/reports/${userId}/summary`);
}

export async function getWaiverSaved(userId) {
  return request(`/api/reports/${userId}/waiver-saved`);
}

export async function getForecast(userId, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  ).toString();
  return request(`/api/reports/${userId}/forecast${qs ? `?${qs}` : ''}`);
}

// ── Trusted Circles (Phase 6) ────────────────────────────────────────────────

export async function getCircles(userId) {
  return request(`/api/circles/${userId}`);
}

export async function createCircle(userId, data) {
  return request(`/api/circles/${userId}`, { method: 'POST', body: JSON.stringify(data) });
}

export async function setCircleStatus(userId, circleId, status) {
  return request(`/api/circles/${userId}/${circleId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function setCirclePermission(userId, circleId, section, visibility) {
  return request(`/api/circles/${userId}/${circleId}/permission`, { method: 'PATCH', body: JSON.stringify({ section, visibility }) });
}

// ── Recurring payments (Phase 3) ─────────────────────────────────────────────

export async function getSchedules(userId) {
  return request(`/api/recurring/${userId}`);
}

export async function createRecurringSchedule(userId, data) {
  return request(`/api/recurring/${userId}`, { method: 'POST', body: JSON.stringify(data) });
}

export async function getScheduleSlots(userId, scheduleId) {
  return request(`/api/recurring/${userId}/${scheduleId}/slots`);
}

export async function paySlot(userId, slotId) {
  return request(`/api/recurring/${userId}/slots/${slotId}/pay`, { method: 'POST', body: JSON.stringify({}) });
}

export async function unpaySlot(userId, slotId) {
  return request(`/api/recurring/${userId}/slots/${slotId}/unpay`, { method: 'POST', body: JSON.stringify({}) });
}

export async function applyAdvance(userId, scheduleId, data) {
  return request(`/api/recurring/${userId}/${scheduleId}/advance`, { method: 'POST', body: JSON.stringify(data) });
}

// ── Ask ClassCost — help assistant ───────────────────────────────────────────

export async function askAssistant(message, history = []) {
  return request('/api/assistant', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
}

// Agent mode: returns { type:'text', text } or { type:'action', action:{name,input}, text }.
export async function askAssistantAgent(message, history = [], snapshot = null) {
  return request('/api/assistant/agent', {
    method: 'POST',
    body: JSON.stringify({ message, history, snapshot }),
  });
}

// ── Closure & Story Cards (Phase 5) ──────────────────────────────────────────

export async function getClosures(userId) {
  return request(`/api/closure/${userId}/closures`);
}

export async function closeSemester(userId, trackerId, data) {
  return request(`/api/closure/${userId}/semester/${trackerId}/close`, { method: 'POST', body: JSON.stringify(data) });
}

export async function settleClosure(userId, closureId) {
  return request(`/api/closure/${userId}/closures/${closureId}/settle`, { method: 'POST', body: JSON.stringify({}) });
}
