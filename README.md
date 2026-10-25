# Event & Workshop Management Portal

A full-stack app where visitors browse and register for events, and an admin manages events and registrations.

**Stack:** React (Vite) + Node.js/Express REST API + SQLite database (single file, no database server needed).

## Run it locally

Prerequisite: Node.js 18 or newer (https://nodejs.org, choose the LTS version).

You need **two terminals**, one for the backend and one for the frontend.

**Terminal 1: backend**
```bash
cd backend
npm install
npm start
```
Runs at http://localhost:5000. The database file (`events.db`) and sample events are created automatically on first run.

**Terminal 2: frontend**
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 in your browser.

## Pages
- `/` Public events: cards, search, category filters, sort by date, empty state
- `/events/:id` Event details and registration form
- `/admin` Dashboard: summary cards, create/edit/delete (with confirmation), status change, registration counts and list

## REST API
| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/events?search=&category=&sort=asc\|desc | List events |
| GET | /api/events/:id | One event |
| POST | /api/events | Create event |
| PUT | /api/events/:id | Edit event |
| PATCH | /api/events/:id/status | Set Upcoming / Ongoing / Completed |
| DELETE | /api/events/:id | Delete event and its registrations |
| POST | /api/events/:id/register | Register (validates, blocks duplicates and full events) |
| GET | /api/events/:id/registrations | List registrations |
| GET | /api/stats | Dashboard totals |

## Design decisions
- Validation runs on both client and server; the server is the source of truth.
- A unique constraint on (event, email) prevents duplicate registrations at the database level.
- Seats left = capacity minus registrations, computed on every read, so it never drifts.
- Admin pages have no login (not in the assignment scope). Add auth before real use.

## Reset the data
Stop the backend, delete `backend/events.db`, and start it again.
