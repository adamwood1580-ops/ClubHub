# BookIt Architecture

**Version:** 0.1  
**Status:** Draft  
**Last Updated:** 28 July 2026

---

# Purpose

This document describes the overall software architecture of BookIt.

It explains how the application is structured, how components communicate, and the principles used when making architectural decisions.

---

# System Overview

BookIt is a Progressive Web Application (PWA) backed by a cloud database.

```
                User

                  │

          Safari / Chrome

                  │

        Progressive Web App

                  │

         JavaScript Frontend

                  │

        Supabase REST API

                  │

          PostgreSQL Database
```

---

# Frontend

Current technologies:

- HTML5
- CSS3
- Vanilla JavaScript

Reasons:

- Fast
- Lightweight
- Easy to maintain
- No framework dependency
- Excellent browser compatibility

---

# Backend

Current backend:

Supabase

Services used:

- PostgreSQL
- Authentication
- Storage
- Row Level Security
- Edge Functions (future)

---

# Database

Current database structure:

```
Club
└── Course
```

Future structure:

```
Club
│
├── Courses
│      ├── Tee Sets
│      ├── Holes
│      ├── Tee Sheets
│      └── Competitions
│
├── Members
├── Visitors
├── Bookings
├── Payments
├── Scorecards
└── Settings
```

---

# Hosting

Development

- GitHub Repository
- GitHub Pages

Production

- GitHub Pages (initially)
- Custom domain
- Future CDN if required

---

# Branch Strategy

main

Production-ready code.

backend-pilot

Current backend development.

Future features should use feature branches before merging into main.

---

# Folder Structure

```
assets/
css/
docs/
html/
js/
supabase/
```

---

# Supabase Structure

```
supabase/

    migrations/

    seed/

    policies/
```

---

# Development Workflow

Every feature follows:

1. Design
2. Documentation
3. Migration
4. Seed Data
5. Test
6. Commit
7. Update CHANGELOG

---

# Security Principles

- UUID primary keys
- Row Level Security enabled
- Principle of least privilege
- No secrets stored in the frontend
- All user permissions enforced by the backend

---

# Long Term Vision

BookIt is intended to become a complete golf club management platform supporting:

- Tee bookings
- Competitions
- Member management
- Visitors
- Payments
- Live scoring
- AI assistance
- Club websites
- Reporting