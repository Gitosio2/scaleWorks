# ScaleWorks

A web app to manage scale-modelling work: track finished and in-progress models, quotes, the parts and consumables they need, and the hours spent on each build.

> Status: planning. No application code yet.

## Goals

- Create, browse and edit every model I build, for clients or for myself.
- Keep quotes alongside finished work, and turn an accepted quote into a model with one action.
- Know what I need to buy, what is already ordered, and what I already have.
- Log time per model, adding a little each day.
- Work well on both desktop and mobile. On mobile, browsing and logging hours come first, but everything must be available.

## Features

- **Models**: client, parts, consumables used, price, phase, dates and total hours.
- **Quotes**: client, price, optional part list with store links, and optional links to past models marked as "same" or "similar".
- **Quote to model**: an accepted quote becomes a model, carrying over its data.
- **Parts**: model-specific components (the kit, a light bar, etc.) with purchase status.
- **Consumables**: general supplies shared across models (thinner, primer, some paints) with purchase status.
- **Clients**: name, contact and optional company.
- **Time tracking**: add hours per day to a model (1h today, +2h tomorrow); the total is the sum of all entries.
- **Multi-user**: each user has their own account and only sees their own data.

## Data model

### Client
| Field | Notes |
|---|---|
| name | required |
| contact | required |
| company | optional |

### Part (specific to one model or quote)
| Field | Notes |
|---|---|
| brand | |
| reference | |
| description | short |
| price | |
| store / link | store name or online shop URL |
| status | `To order`, `Ordered`, `In hand` |

### Consumable (general, reusable)
| Field | Notes |
|---|---|
| store | |
| description | |
| price | |
| reference | optional |
| status | `To order`, `Ordered`, `In hand` |

### Model
| Field | Notes |
|---|---|
| client | |
| parts | list of parts |
| consumables | list of consumables used |
| price | |
| phase | see below |
| requested date | date given by the client |
| estimated date | my own estimate |
| time entries | list of `date` + `hours`; total hours is derived |

Phases: `Not started` → `Pending decal design` → `Pending painting` → `Pending decals` → `Pending varnish` → `Pending assembly` → `Finished`.

### Quote
| Field | Notes |
|---|---|
| client | |
| parts | optional list, with store links |
| price | |
| related models | optional links to past models, marked `same` or `similar` |

Converting a quote creates a model that reuses its client, parts and price.

## Tech stack (proposed)

- **App**: Next.js (TypeScript), responsive UI, installable as a PWA on mobile.
- **Database**: PostgreSQL on Neon (free tier).
- **Hosting**: Vercel (free tier). Note that the free Hobby plan is for non-commercial use.
- **Auth**: email-based accounts, with every record scoped to its owner.

## Getting started

Planned once the project is scaffolded: prerequisites, install, environment variables and run instructions.

## Roadmap

1. MVP: clients, models, parts, consumables, time entries.
2. Quotes and quote-to-model conversion, with links to similar past models.
3. Purchase overview: everything still `To order` across models.
4. Polish for mobile (PWA install, quick hour logging).

## Account recovery and sign-up

- **Lost password**: run `npx tsx scripts/reset-password.ts <email>` from the project root. It reads `DATABASE_URL` from `.env.local`, asks for the new password (hidden) and signs the user out everywhere.
- **Close public sign-up**: set `DISABLE_SIGNUP=true` in the environment. The sign-up endpoint is rejected and the login page hides the "Create one" link. It is off by default.
- **Login rate limit**: at most 5 sign-in attempts per minute per client. Counters are kept in memory, so on serverless hosting each instance counts separately.

## Public gallery: sharing and contact

Environment variables for `/portfolio` (all optional):

- `SITE_URL`: public origin of the site (for example `https://works.example.com`). Link previews (Open Graph / Twitter cards) need absolute image URLs. When unset, the origin is taken from the request host, which works on most hosts.
- `PORTFOLIO_CONTACT`: shows a "Contact me" button on the gallery pages. Use an email (`me@example.com` → `mailto:`), a phone number with country code (`+34 600 123 456` → WhatsApp link) or any `https://` URL. Unset or invalid values hide the button.

Previews use the model's first photo (thumbnail), served by `/img/[id]/thumb` under the same rules as the gallery: only published, finished models of the `PORTFOLIO_EMAIL` account. The site icon is generated from `SITE_NAME` and the brand colour (`src/app/icon.tsx`, `src/app/apple-icon.tsx`).
