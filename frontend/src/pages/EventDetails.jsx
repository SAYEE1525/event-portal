import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, MapPin, Users, CheckCircle2 } from 'lucide-react';
import { api, fmtDate, fmtTime } from '../api.js';
import { EventImage } from './Events.jsx';

const EMPTY = { name: '', email: '', phone: '' };

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Enter a valid email address.';
  if (!/^\d{10,13}$/.test(f.phone.replace(/[\s()-]/g, '').replace(/^\+/, ''))) e.phone = 'Enter a valid contact number (10 to 13 digits).';
  return e;
}

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ev, setEv] = useState(null);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null); // {type, text}
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true); setBanner(null); setErrors({});
    Promise.all([api.event(id), api.events({ sort: 'asc' })])
      .then(([e, list]) => { setEv(e); setAll(list.filter((x) => x.status !== 'Completed' || x.id === e.id)); setLoadError(''); })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return setBanner({ type: 'error', text: 'Please fix the highlighted fields.' });
    setSubmitting(true);
    try {
      const res = await api.register(ev.id, form);
      setEv(res.event);
      setBanner({ type: 'success', text: res.message + ' We have saved your seat.' });
      setForm(EMPTY);
    } catch (err) {
      setErrors(err.errors || {});
      setBanner({ type: 'error', text: err.message });
      api.event(id).then(setEv).catch(() => {}); // refresh seats if event filled up meanwhile
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="state">Loading event…</div>;
  if (loadError || !ev) return <div className="empty"><h3>We couldn't load this event</h3><p>{loadError}</p><Link className="btn" to="/">Back to events</Link></div>;

  const closed = ev.status === 'Completed';
  const full = ev.availableSeats <= 0;
  const disabled = closed || full || submitting;

  return (
    <>
      <Link to="/" className="back"><ArrowLeft size={16} /> All events</Link>
      <div className="details">
        <section>
          <div className="detail-img"><EventImage src={ev.image} title={ev.title} /></div>
          <span className="tag">{ev.category}</span> <span className={`badge inline ${ev.status.toLowerCase()}`}>{ev.status}</span>
          <h1>{ev.title}</h1>
          <ul className="meta big">
            <li><CalendarDays size={18} /> {fmtDate(ev.date)}</li>
            <li><Clock size={18} /> {fmtTime(ev.time)}</li>
            <li><MapPin size={18} /> {ev.venue}</li>
            <li className={full ? 'full' : ev.availableSeats <= 5 ? 'low' : ''}>
              <Users size={18} /> {full ? 'Event is full' : `${ev.availableSeats} of ${ev.capacity} seats left`}
            </li>
          </ul>
          <p className="desc">{ev.description || 'No description has been added for this event yet.'}</p>
        </section>

        <aside className="panel">
          <h2>Reserve your seat</h2>
          {closed && <div className="alert error">This event has finished, so registration is closed.</div>}
          {!closed && full && <div className="alert error">Sorry, this event is full.</div>}
          {banner && (
            <div className={`alert ${banner.type}`} role="status">
              {banner.type === 'success' && <CheckCircle2 size={18} />} {banner.text}
            </div>
          )}
          <form onSubmit={submit} noValidate>
            <Field label="Full name" error={errors.name}>
              <input value={form.name} onChange={set('name')} placeholder="Asha Patil" autoComplete="name" disabled={disabled} />
            </Field>
            <Field label="Email address" error={errors.email}>
              <input type="email" value={form.email} onChange={set('email')} placeholder="asha@example.com" autoComplete="email" disabled={disabled} />
            </Field>
            <Field label="Contact number" error={errors.phone}>
              <input type="tel" value={form.phone} onChange={set('phone')} placeholder="9876543210" autoComplete="tel" disabled={disabled} />
            </Field>
            <Field label="Event">
              <select value={ev.id} onChange={(e) => navigate(`/events/${e.target.value}`)}>
                {all.map((x) => (
                  <option key={x.id} value={x.id}>{x.title} ({x.availableSeats <= 0 ? 'full' : `${x.availableSeats} seats`})</option>
                ))}
              </select>
            </Field>
            <button className="btn primary block" disabled={disabled}>{submitting ? 'Registering…' : 'Register now'}</button>
          </form>
        </aside>
      </div>
    </>
  );
}

export function Field({ label, error, children }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}
