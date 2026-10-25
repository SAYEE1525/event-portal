import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Users, Eye, X, CalendarRange, CalendarClock, ClipboardList, CheckCheck } from 'lucide-react';
import { api, CATEGORIES, STATUSES, fmtDate, fmtTime } from '../api.js';
import { Field } from './EventDetails.jsx';

const BLANK = { title: '', category: 'Technology', description: '', date: '', time: '', venue: '', image: '', capacity: 30, status: 'Upcoming' };

function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}

export default function Admin() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);     // event object or BLANK
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);     // {event, rows}

  const load = useCallback(() =>
    Promise.all([api.events({ sort: 'asc' }), api.stats()])
      .then(([e, s]) => { setEvents(e); setStats(s); setError(''); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);

  const notify = (type, text) => { setToast({ type, text }); setTimeout(() => setToast(null), 3500); };

  async function changeStatus(ev, status) {
    try { await api.setStatus(ev.id, status); notify('success', `Status changed to ${status}.`); load(); }
    catch (e) { notify('error', e.message); }
  }
  async function confirmDelete() {
    try { await api.remove(deleting.id); notify('success', `"${deleting.title}" was deleted.`); setDeleting(null); load(); }
    catch (e) { notify('error', e.message); setDeleting(null); }
  }
  async function showRegistrations(ev) {
    try { setViewing({ event: ev, rows: await api.registrations(ev.id) }); }
    catch (e) { notify('error', e.message); }
  }

  const cards = stats && [
    { label: 'Total events', value: stats.totalEvents, icon: <CalendarRange size={22} /> },
    { label: 'Upcoming events', value: stats.upcomingEvents, icon: <CalendarClock size={22} /> },
    { label: 'Total registrations', value: stats.totalRegistrations, icon: <ClipboardList size={22} /> },
    { label: 'Completed events', value: stats.completedEvents, icon: <CheckCheck size={22} /> },
  ];

  return (
    <>
      <div className="page-head">
        <h1>Admin dashboard</h1>
        <button className="btn primary" onClick={() => setEditing({ ...BLANK })}><Plus size={18} /> Create event</button>
      </div>

      {toast && <div className={`alert ${toast.type} toast`} role="status">{toast.text}</div>}
      {error && <div className="alert error">{error}</div>}
      {loading && <div className="state">Loading dashboard…</div>}

      {cards && <div className="stats">{cards.map((c) => (
        <div className="stat" key={c.label}>{c.icon}<div><strong>{c.value}</strong><span>{c.label}</span></div></div>
      ))}</div>}

      {!loading && !error && events.length === 0 && (
        <div className="empty"><h3>No events yet</h3><p>Create your first event to start collecting registrations.</p>
          <button className="btn primary" onClick={() => setEditing({ ...BLANK })}>Create event</button></div>
      )}

      {events.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Event</th><th>Date</th><th>Registrations</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td data-label="Event"><strong>{ev.title}</strong><br /><small>{ev.category} · {ev.venue}</small></td>
                  <td data-label="Date">{fmtDate(ev.date)}<br /><small>{fmtTime(ev.time)}</small></td>
                  <td data-label="Registrations">{ev.registered} / {ev.capacity}</td>
                  <td data-label="Status">
                    <select value={ev.status} onChange={(e) => changeStatus(ev, e.target.value)} aria-label={`Status of ${ev.title}`}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td data-label="Actions" className="actions">
                    <Link className="icon-btn" to={`/events/${ev.id}`} title="View public page"><Eye size={18} /></Link>
                    <button className="icon-btn" onClick={() => showRegistrations(ev)} title="View registrations"><Users size={18} /></button>
                    <button className="icon-btn" onClick={() => setEditing(ev)} title="Edit"><Pencil size={18} /></button>
                    <button className="icon-btn danger" onClick={() => setDeleting(ev)} title="Delete"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <EventForm initial={editing} onClose={() => setEditing(null)}
        onSaved={(msg) => { setEditing(null); notify('success', msg); load(); }} />}

      {deleting && (
        <Modal title="Delete this event?" onClose={() => setDeleting(null)}>
          <p>"{deleting.title}" and its {deleting.registered} registration(s) will be permanently removed. This can't be undone.</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setDeleting(null)}>Keep event</button>
            <button className="btn danger-solid" onClick={confirmDelete}>Delete event</button>
          </div>
        </Modal>
      )}

      {viewing && (
        <Modal title={`Registrations: ${viewing.event.title}`} onClose={() => setViewing(null)}>
          {viewing.rows.length === 0 ? <p>No one has registered for this event yet.</p> : (
            <div className="table-wrap"><table className="plain"><thead><tr><th>Name</th><th>Email</th><th>Contact</th></tr></thead>
              <tbody>{viewing.rows.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.email}</td><td>{r.phone}</td></tr>)}</tbody></table></div>
          )}
        </Modal>
      )}
    </>
  );
}

function EventForm({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial.id);
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      isEdit ? await api.update(f.id, f) : await api.create(f);
      onSaved(isEdit ? 'Event updated.' : 'Event created.');
    } catch (err) { setErrors(err.errors || {}); setFormError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={isEdit ? 'Edit event' : 'Create event'} onClose={onClose}>
      {formError && <div className="alert error">{formError}</div>}
      <form onSubmit={save} noValidate className="form-grid">
        <Field label="Title" error={errors.title}><input value={f.title} onChange={set('title')} /></Field>
        <Field label="Category" error={errors.category}>
          <select value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Field label="Date" error={errors.date}><input type="date" value={f.date} onChange={set('date')} /></Field>
        <Field label="Time" error={errors.time}><input type="time" value={f.time} onChange={set('time')} /></Field>
        <Field label="Venue" error={errors.venue}><input value={f.venue} onChange={set('venue')} /></Field>
        <Field label="Total seats" error={errors.capacity}><input type="number" min="1" value={f.capacity} onChange={set('capacity')} /></Field>
        <Field label="Status" error={errors.status}>
          <select value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
        <Field label="Image URL (optional)" error={errors.image}><input value={f.image} onChange={set('image')} placeholder="https://…" /></Field>
        <div className="span-2"><Field label="Description"><textarea rows="3" value={f.description} onChange={set('description')} /></Field></div>
        <div className="modal-actions span-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}</button>
        </div>
      </form>
    </Modal>
  );
}
