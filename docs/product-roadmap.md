# BookIt Product Roadmap

**Version:** 0.1  
**Status:** Active  
**Author:** Adam Wood  
**Last Updated:** 31 July 2026

---

## Vision

BookIt is a mobile-first golf club management platform designed primarily for UK golf clubs.

The aim is to provide clubs with modern software that is simple to operate, inexpensive to maintain and capable of being owned rather than permanently rented.

---

## Product Principles

Every feature should:

- Solve a genuine golf club problem.
- Work well on phones and tablets.
- Fit clearly into the existing architecture.
- Avoid unnecessary complexity.
- Keep club data portable and exportable.
- Be understandable without extensive staff training.

---

## Version 0.1 — Foundation

**Status:** In progress

### Platform

- [x] GitHub repository and development branch
- [x] GitHub Pages deployment
- [x] Supabase project
- [x] Supabase browser connection
- [x] iOS diagnostics panel

### Database

- [x] Clubs table
- [x] Bells club seed data
- [x] Courses table
- [x] Bells course seed data
- [ ] Tees
- [ ] Tee-specific hole data
- [ ] Database access policies

### Documentation

- [x] Database design
- [x] Architecture
- [x] Product roadmap
- [ ] Coding standards
- [ ] Changelog

---

## Version 0.2 — Booking Engine

**Objective:** Replace the prototype booking data with a secure cloud-backed tee sheet.

### Features

- [ ] Tee-sheet configuration
- [ ] Daily tee-time generation
- [ ] Live availability
- [ ] Create a booking
- [ ] Private bookings
- [ ] Joinable bookings
- [ ] Two-, three- and four-player groups
- [ ] Join an existing booking
- [ ] Cancel a booking
- [ ] Booking capacity protection
- [ ] Blocked tee times
- [ ] Booking audit history

---

## Version 0.3 — Members and Authentication

### Features

- [ ] Member login
- [ ] Staff login
- [ ] Password reset
- [ ] Member profile
- [ ] Upcoming bookings
- [ ] Booking history
- [ ] Favourite playing partners
- [ ] Member and staff permissions

---

## Version 0.4 — Club Administration

### Features

- [ ] Administration dashboard
- [ ] Tee-sheet management
- [ ] Create bookings on behalf of members
- [ ] Edit and move bookings
- [ ] Member management
- [ ] Visitor management
- [ ] Course settings
- [ ] Usage reports
- [ ] Audit-log viewer

---

## Version 0.5 — Competitions and Scoring

### Features

- [ ] Competition setup
- [ ] Online competition entry
- [ ] Stableford
- [ ] Stroke play
- [ ] Match play
- [ ] Fourball Better Ball
- [ ] Greensomes
- [ ] Texas Scramble
- [ ] Digital scorecards
- [ ] Live leaderboards
- [ ] Results publishing

---

## Version 0.6 — Payments

### Features

- [ ] Visitor green-fee payments
- [ ] Competition entry fees
- [ ] Payment confirmation
- [ ] Refunds
- [ ] Payment history
- [ ] Reconciliation reports

---

## Version 0.7 — Communications

### Features

- [ ] Booking confirmation emails
- [ ] Booking reminders
- [ ] Cancellation notifications
- [ ] Club announcements
- [ ] Push notifications
- [ ] Optional SMS integration

---

## Version 0.8 — Reporting and Intelligence

### Features

- [ ] Tee-time utilisation
- [ ] No-show reporting
- [ ] Visitor revenue
- [ ] Competition participation
- [ ] Member activity
- [ ] Round-time tracking
- [ ] Demand forecasting
- [ ] AI-assisted reporting

---

## Version 0.9 — Data Migration

### Features

- [ ] Member CSV import
- [ ] Member CSV export
- [ ] Booking import and export
- [ ] Competition import and export
- [ ] Duplicate detection
- [ ] Import validation
- [ ] Failed-import rollback
- [ ] Import audit history
- [ ] Migration templates for existing club systems

---

## Version 1.0 — Commercial Release

### Requirements

- [ ] Multi-club data separation
- [ ] Production security review
- [ ] Automated backups
- [ ] Recovery testing
- [ ] Monitoring and error reporting
- [ ] Installation guide
- [ ] Club administrator guide
- [ ] Member guide
- [ ] Data-processing documentation
- [ ] Commercial licensing
- [ ] Support process
- [ ] Pilot club approval

---

## Future Ideas

These ideas are not yet committed to a version.

### Club Operations

- Digital starter interface
- Buggy booking
- Coaching diary
- Course-maintenance management
- Live course status
- Pace-of-play monitoring

### Commercial Features

- Dynamic visitor pricing
- White-labelled club applications
- Club website builder
- Restaurant booking
- Pro-shop integration
- Driving-range integration

### Artificial Intelligence

- Natural-language administration
- Automated competition summaries
- Member-retention insights
- Predictive tee utilisation
- Automated communications

### Deployment

- Managed cloud hosting
- Club-hosted installation
- Cloud and local hybrid deployment
- Offline clubhouse resilience