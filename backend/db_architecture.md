### 🧠 Project Architecture Context

This is a **Django backend** following a **clean, domain-based architecture** with a **service layer**.

Each feature is its own Django app (e.g. `users`, `auth`, `payments`).

We use **Supabase as the ONLY database layer**.

**Django ORM is NOT used at all.**

---

### 🚫 Absolute Rules (Non-Negotiable)

1. **DO NOT create Django models**

   * No `models.py` usage
   * No ORM queries
   * No migrations
   * No `ModelSerializer`

2. **DO NOT map Django models to Supabase tables**

   * Supabase owns schema
   * Supabase owns migrations
   * Supabase owns constraints and RLS

3. **Views MUST be thin controllers**

   * Handle HTTP request/response only
   * Validate input via serializers
   * Call service-layer functions
   * Must NOT contain business logic
   * Must NOT access Supabase directly

4. **Services contain ALL business logic**

   * Services orchestrate workflows
   * Services call repositories
   * Services do NOT return HTTP responses
   * Services do NOT depend on request objects

5. **Supabase access happens ONLY in repositories**

   * Repositories are feature-owned
   * Repositories contain raw Supabase queries
   * No business logic in repositories

---

### 🗂️ Required Folder Structure

Each feature MUST follow this structure:

```
feature_name/
  ├── views.py          # Controllers only
  ├── services.py       # Business logic
  ├── serializers.py    # Validation & formatting
  ├── repositories/
  │    └── supabase.py  # Supabase data access
  ├── urls.py
  └── tests/
```

Shared infrastructure:

```
core/
  └── infrastructure/
       └── supabase/
            └── client.py  # Supabase client initialization ONLY
```

---

### 🔌 Supabase Usage Rules

* Supabase is accessed via the official Supabase Python client
* The Supabase client is initialized **once** in:

```
core/infrastructure/supabase/client.py
```

* Repositories import the client, never re-initialize it
* Repositories:

  * May reference Supabase tables
  * May perform `select`, `insert`, `update`, `delete`
  * Must return raw data (dicts / lists)
  * Must NOT raise HTTP exceptions

---

### 🔄 Data Flow (MANDATORY)

```
HTTP Request
   ↓
DRF View (Controller)
   ↓
Serializer (validation)
   ↓
Service Layer (business rules)
   ↓
Repository (Supabase access)
   ↓
Supabase Database
```

**This direction is ONE-WAY. No shortcuts.**

---

### ✅ What IS Allowed

* DTOs or typed dictionaries
* Supabase views, RPCs, and RLS
* Feature-specific Supabase repositories
* Unit tests mocking repositories

---

### ❌ What Is NOT Allowed

* Django ORM
* `models.py`
* Migrations
* Fat views
* Business logic in serializers
* Supabase calls inside views
* Shared “god” Supabase repositories

---

### 🧩 Mental Model to Follow

* **Supabase = external database**
* **Repositories = persistence adapters**
* **Services = domain logic**
* **Views = HTTP glue**

If unsure where logic belongs → **put it in the service layer**.

---

### 🎯 Goal

Produce **production-grade Django backend code** that:

* Treats Supabase as the sole persistence layer
* Enforces clean separation of concerns
* Is testable, scalable, and maintainable
* Never introduces ORM or schema duplication
