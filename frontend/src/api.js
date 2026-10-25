async function request(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error || 'Request failed. Is the backend running?'), { errors: data.errors || {} });
  }
  return data;
}
const body = (b) => JSON.stringify(b);

export const api = {
  events: (params = {}) => request('/api/events?' + new URLSearchParams(params)),
  event: (id) => request(`/api/events/${id}`),
  create: (b) => request('/api/events', { method: 'POST', body: body(b) }),
  update: (id, b) => request(`/api/events/${id}`, { method: 'PUT', body: body(b) }),
  remove: (id) => request(`/api/events/${id}`, { method: 'DELETE' }),
  setStatus: (id, status) => request(`/api/events/${id}/status`, { method: 'PATCH', body: body({ status }) }),
  register: (id, b) => request(`/api/events/${id}/register`, { method: 'POST', body: body(b) }),
  registrations: (id) => request(`/api/events/${id}/registrations`),
  stats: () => request('/api/stats'),
};

export const CATEGORIES = ['Technology', 'Business', 'Design', 'Workshop'];
export const STATUSES = ['Upcoming', 'Ongoing', 'Completed'];

export const fmtDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const fmtTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
