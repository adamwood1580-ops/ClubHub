# BookIt Database Design

**Version:** 0.1  
**Status:** Draft  
**Last Updated:** 28 July 2026

---

# Purpose

This document describes the philosophy and architecture of the BookIt database.

It is intended to explain **why** the database has been designed in a particular way, rather than simply documenting the SQL schema.

Every major architectural decision should be recorded here before implementation.

---

# Vision

BookIt is designed as a complete golf club management platform.

Although the first release targets UK golf clubs and focuses on tee bookings, the database is designed so additional modules can be added without redesigning the core structure.

Examples include:

- Competitions
- Member management
- Visitor bookings
- Payments
- Live scoring
- Handicap calculations
- Club administration
- AI assistant
- Website integration

---

# Design Principles

## 1. Model the Real World

The database should represent how a golf club actually operates.

```
Club
    ↓
Course
    ↓
Tee Set
    ↓
Hole
```

The software should adapt to the club.

The club should never have to adapt to the software.

---

## 2. Store Facts, Not Calculations

Only permanent information should be stored.

Examples of stored data:

- Course Rating
- Slope Rating
- Hole Par
- Hole Yardage
- Stroke Index

Examples of calculated data:

- Course Handicap
- Playing Handicap
- Nett Score
- Stableford Points

Calculated values should be generated when required rather than stored permanently.

---

## 3. One Source of Truth

Every piece of information should exist only once.

Example:

If Hole 7 changes from a Par 5 to a Par 4, that change should be made in one place only.

All scorecards, competitions and handicap calculations automatically use the updated information.

---

## 4. Nothing is Hard Coded

The database must never assume:

- 18 holes
- One course
- Three tee colours
- One competition format

Everything should be data-driven.

---

## 5. UUID Primary Keys

Every table uses UUID primary keys.

Reasons:

- Better for cloud deployments
- Better for synchronisation
- Better for future offline capability
- Better for data migration
- Avoids exposing record counts

---

## 6. Every Record Belongs Somewhere

Every table should have a clear parent.

Example:

```
Club
└── Course
    └── Tee Set
        └── Hole
```

This simplifies:

- Permissions
- Security
- Reporting
- Multi-club deployments

---

## 7. Build for Growth

Version 1 focuses on UK golf clubs.

However, the architecture should support:

- 9-hole courses
- 18-hole courses
- 27-hole clubs
- 36-hole clubs
- Multiple courses
- Unlimited tee sets
- Future international expansion

without redesigning the database.

---

## 8. Audit Everything

Every important change should be traceable.

Examples include:

- Booking cancelled
- Booking moved
- Competition closed
- Member edited
- Tee sheet blocked

The system should always be able to answer:

- Who?
- When?
- What changed?
- Why?

---

# Current Database Structure

```
Club
└── Course
```

Current tables:

- clubs
- courses

---

# Planned Database Structure

```
Club
│
├── Courses
│      │
│      ├── Tee Sets
│      │      │
│      │      └── Holes
│      │
│      ├── Tee Sheets
│      │
│      └── Competitions
│
├── Members
│
├── Visitors
│
├── Bookings
│
├── Payments
│
├── Scorecards
│
└── Settings
```

This structure is expected to evolve as development continues.

---

# Current Decisions

## Clubs

- UUID primary key
- Slug used as unique public identifier
- One club can contain multiple courses

## Courses

- Belong to one club
- No handicap information stored
- No tee information stored
- No par stored
- Support 9 or 18 holes initially

Future support for additional layouts is planned.

---

# Future Considerations

The following features are planned but not yet implemented.

- Tee Sets
- Hole Definitions
- Tee Sheets
- Booking Engine
- Members
- Competitions
- Payments
- Visitor Bookings
- AI Assistant
- Website Integration

---

# Development Rule

Every database change must follow this process:

1. Design
2. Document
3. Migration
4. Seed Data
5. Test
6. Commit

Documentation should always be updated before the next feature is started.