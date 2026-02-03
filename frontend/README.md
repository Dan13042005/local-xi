# Local XI – Sunday League Team Manager

Local XI is a full-stack web application for managing a Sunday league football team.  
It allows managers to create and manage players, assign shirt numbers and positions, and perform bulk actions, with validation handled on both the frontend and backend.

---

## Features

- Add players with:
  - Name
  - Shirt number (1–99)
  - Multiple positions
- Prevent duplicate shirt numbers
- Bulk delete players
- Frontend form validation
- Backend validation with meaningful error responses
- REST API–backed persistence
- Ready for future deployment and environment configuration

---

## Tech Stack

### Frontend
- React
- TypeScript
- Vite

### Backend
- Spring Boot (Java 17)
- REST API
- H2 in-memory database (development)

---

## Project Structure

```text
local-xi/
├── backend/
│   └── local-xi-backend/
│       ├── src/main/java/com/localxi/local_xi_backend
│       ├── src/main/resources
│       └── pom.xml
└── frontend/
    ├── src/
    ├── .env.local
    └── package.json

