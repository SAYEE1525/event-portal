import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, CalendarDays, Clock, MapPin, Users, SearchX } from 'lucide-react';
import { api, CATEGORIES, fmtDate, fmtTime } from '../api.js';

export function EventImage({ src, title }) {
  const [broken, setBroken] = useState(false);
  return src && !broken
    ? <img src={src} alt={title} loading="lazy" onError={() => setBroken(true)} />
    : <div className="img-fallback">{title.slice(0, 1)}</div>;
}

export default function Events() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('asc');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      api.events({ search, category, sort })
        .then((d) => { setEvents(d); setError(''); })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250); // debounce typing
    return () => clearTimeout(t);
  }, [search, category, sort]);

  const clear = () => { setSearch(''); setCategory(''); };

  return (
    <>
      <section className="hero">
        <h1>Find a workshop worth your evening.</h1>
        <p>Browse upcoming talks, workshops and meetups, then reserve your seat in under a minute.</p>
      </section>

      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events by name" aria-label="Search events" />
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by date">
          <option value="asc">Date: earliest first</option>
          <option value="desc">Date: latest first</option>
        </select>
      </div>

      <div className="chips" role="group" aria-label="Filter by category">
        {['', ...CATEGORIES].map((c) => (
          <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
            {c || 'All'}
          </button>
        ))}
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading && <div className="state">Loading events…</div>}

      {!loading && !error && events.length === 0 && (
        <div className="empty">
          <SearchX size={40} />
          <h3>No events match your search</h3>
          <p>Try a different name or clear the filters to see everything.</p>
          <button className="btn" onClick={clear}>Clear search and filters</button>
        </div>
      )}

      {!loading && (
        <div className="grid">
          {events.map((ev) => (
            <article className="card" key={ev.id}>
              <div className="card-img">
                <EventImage src={ev.image} title={ev.title} />
                <span className={`badge ${ev.status.toLowerCase()}`}>{ev.status}</span>
              </div>
              <div className="card-body">
                <span className="tag">{ev.category}</span>
                <h3>{ev.title}</h3>
                <ul className="meta">
                  <li><CalendarDays size={16} /> {fmtDate(ev.date)}</li>
                  <li><Clock size={16} /> {fmtTime(ev.time)}</li>
                  <li><MapPin size={16} /> {ev.venue}</li>
                  <li className={ev.availableSeats <= 0 ? 'full' : ev.availableSeats <= 5 ? 'low' : ''}>
                    <Users size={16} /> {ev.availableSeats <= 0 ? 'Full' : `${ev.availableSeats} of ${ev.capacity} seats left`}
                  </li>
                </ul>
                <Link className="btn" to={`/events/${ev.id}`}>View details</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
