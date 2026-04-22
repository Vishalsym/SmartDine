# SmartDine 🍽️

> An intelligent dining concierge and restaurant booking platform for Delhi NCR — built entirely on AWS serverless.

SmartDine replaces filter-and-browse restaurant discovery with a conversational chat surface. Users type what they want in plain English — *"Book a table for four in Khan Market tomorrow at 8 pm, North Indian please"* — and the system interprets the intent, recommends real Delhi-NCR restaurants, and confirms the booking end-to-end with email notifications to both the customer and the restaurant.

---

## ✨ Features

- **Conversational search** — natural-language restaurant discovery powered by Amazon Lex V2
- **One-tap booking** — compact modal that captures date, time, party size, and special requests
- **Email confirmations** — HTML emails dispatched to both customer and restaurant via Amazon SES
- **Recurring bookings** — mark a restaurant as a weekly favourite, get auto-booked every chosen weekday
- **1,631 real restaurants** — curated Zomato Delhi-NCR catalogue covering 47 areas and 28 cuisines
- **Fully serverless** — zero idle cost, scales elastically with traffic
- **Graceful degradation** — local keyword-based fallback bot when the cloud backend is unreachable
- **Mobile-first UI** — sidebar on desktop, bottom tab bar on phones, Tailwind-styled throughout

---

## 🏗️ Architecture

```
┌──────────────┐       ┌─────────────────┐       ┌──────────────┐
│   Browser    │ HTTPS │  API Gateway    │       │  Amazon Lex  │
│  React SPA   │──────▶│  /chat  /booking│──┐    │      V2      │
└──────────────┘       └─────────────────┘  │    │  (us-east-1) │
                                             │    └──────▲───────┘
                             ┌───────────────┘           │
                             ▼                           │ code hook
                      ┌──────────────┐  invoke    ┌──────┴───────┐
                      │   lf0_chat   │───────────▶│lf1_lex_handler│
                      └──────────────┘            └──────────────┘
                             │
                             │   ┌─────────────────────────────┐
                             ▼   ▼                             │
                      ┌──────────────┐ async   ┌──────────────┐│
                      │ lf3_booking  │────────▶│ lf4_notify   ││
                      └──────┬───────┘         └──────┬───────┘│
                             │                        │        │
                             ▼                        ▼        │
                      ┌──────────────┐         ┌──────────────┐│
                      │  DynamoDB    │         │ Amazon SES   ││
                      │  bookings    │         │   emails     ││
                      │  favourites  │         └──────────────┘│
                      └──────┬───────┘                         │
                             │                                 │
                      ┌──────▼───────┐                         │
                      │ lf5_recurring│◀── EventBridge ─────────┘
                      │  (weekly)    │    (Mon 08:00 IST)
                      └──────────────┘
```

**Two planes:**
- **Synchronous** — chat → Lex → code hook → recommendation cards → booking → DynamoDB → async notify
- **Asynchronous** — scheduled weekly job that scans favourites and creates recurring bookings

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend framework | React 19 (functional components + hooks) |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 (with persist middleware) |
| Routing | React Router v7 |
| Icons | lucide-react |
| NLU | Amazon Lex V2 (en_US) |
| API | Amazon API Gateway (REST) |
| Compute | AWS Lambda (Python 3.12) |
| Database | Amazon DynamoDB (on-demand) |
| Email | Amazon SES |
| Scheduler | Amazon EventBridge |
| IaC | AWS SAM (CloudFormation) |
| Data prep | Python 3 + pandas |

---

## 📁 Repository Layout

```
SmartDine/
├── backend/
│   ├── lambdas/
│   │   ├── lf0_chat.py           # API Gateway → Lex relay
│   │   ├── lf1_lex_handler.py    # Lex V2 code hook (dialog + fulfilment)
│   │   ├── lf3_booking.py        # POST /booking — validate, persist, notify
│   │   ├── lf4_notify.py         # SES email fan-out
│   │   └── lf5_recurring.py      # Weekly scheduled job
│   ├── deploy/                   # Build artefacts
│   ├── deploy.sh                 # One-command deploy helper
│   └── template.yaml             # AWS SAM template
├── data/
│   ├── DelhiNCR Restaurants.csv  # Source Zomato dataset
│   └── restaurants.json          # Preprocessed catalogue (1,631 records)
├── scripts/
│   └── convert_zomato.py         # CSV → JSON preprocessing pipeline
├── smartdine-app/
│   ├── src/
│   │   ├── components/           # Chat, Booking, Restaurant, Layout
│   │   ├── pages/                # ChatPage, BookingsPage, FavouritesPage
│   │   ├── services/             # lexService, bookingService, notificationService
│   │   ├── store/                # useChatStore, useBookingStore
│   │   └── data/                 # Bundled restaurant catalogue
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ and npm
- Python 3.12+
- AWS CLI v2 (run `aws configure` with an IAM user that has permissions for Lambda, API Gateway, DynamoDB, SES, EventBridge)
- AWS SAM CLI
- An SES-verified sender email address (in your AWS account)

### 1. Clone and install

```bash
git clone https://github.com/Vishalsym/SmartDine.git
cd SmartDine/smartdine-app
npm install
```

### 2. Deploy the backend

```bash
cd ../backend
sam build
sam deploy --guided
# When prompted, provide your SES-verified sender email
```

Note the `ApiEndpoint` value from the CloudFormation stack outputs.

### 3. Create the Lex V2 bot (one-time, manual)

SAM doesn't yet fully support Lex V2 provisioning, so create the bot in the AWS Console:

- Locale: `en_US`
- Intent: `DiningSuggestionsIntent` with slots `Location`, `Cuisine`, `DiningDate`, `DiningTime`, `NumberOfPeople`, `Email`
- Attach `lf1_lex_handler` as the code hook for both DialogCodeHook and FulfillmentCodeHook
- Deploy Lex in `us-east-1`

Set `LEX_BOT_ID` and `LEX_BOT_ALIAS_ID` on the `lf0_chat` Lambda:

```bash
aws lambda update-function-configuration \
  --function-name smartdine-lf0-chat \
  --environment "Variables={LEX_BOT_ID=...,LEX_BOT_ALIAS_ID=...}"
```

### 4. Configure and run the frontend

```bash
cd ../smartdine-app
cp .env.example .env.local
# Edit .env.local and set VITE_API_ENDPOINT to the ApiEndpoint from step 2
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and start chatting.

### Mock mode (no backend)

If `VITE_API_ENDPOINT` is not set, the app falls back to a keyword-based local bot that filters the bundled restaurant catalogue. Perfect for demos without cloud deployment.

---

## 🔑 Environment Variables

### Backend Lambdas

| Variable | Used by | Purpose |
|----------|---------|---------|
| `AWS_REGION_NAME` | lf3, lf4, lf5 | DynamoDB region |
| `BOOKINGS_TABLE` | lf3, lf5 | Bookings table name |
| `FAVOURITES_TABLE` | lf3, lf5 | Favourites table name |
| `NOTIFY_LAMBDA_NAME` | lf3, lf5 | Name of lf4 for async invoke |
| `SENDER_EMAIL` | lf4 | SES-verified sender address |
| `LEX_BOT_ID` | lf0 | Lex V2 bot ID |
| `LEX_BOT_ALIAS_ID` | lf0 | Lex V2 alias ID |
| `FAST2SMS_KEY` | lf4 | *(optional)* SMS channel key |

### Frontend

| Variable | Purpose |
|----------|---------|
| `VITE_API_ENDPOINT` | API Gateway base URL. Omit for mock mode. |

---

## 📊 Data Preprocessing

The `restaurants.json` catalogue is derived from a public Zomato Delhi-NCR dataset. The pipeline in `scripts/convert_zomato.py` performs five stages:

1. **Ingestion** — read CSV, normalise headers to snake_case, coerce types, fix encoding
2. **Deduplication** — group by `(name, locality)`, keep highest-rated entry
3. **Quality gating** — drop records with rating < 3.0, missing address, or unrecognised locality
4. **Area-alias enrichment** — map aliases (CP, HKV, GK) to canonical area names
5. **Export** — round ratings, re-order, write to `data/restaurants.json`

Final output: **1,631 records · 47 areas · 28 cuisines · ~884 KB**

Re-run the pipeline any time:

```bash
cd scripts
python3 convert_zomato.py
```

---

## ⚡ Performance

Measured from a residential broadband connection in Delhi NCR (Lambda + DynamoDB in `ap-south-1`, Lex in `us-east-1`):

| Operation | Median | p95 |
|-----------|--------|-----|
| Chat turn (warm Lambda) | ~850 ms | ~1.6 s |
| Chat turn (cold Lambda) | ~2.2 s | ~3.1 s |
| Booking write → confirmation | ~420 ms | ~860 ms |
| Email delivery (customer) | ~2.1 s | ~4.8 s |
| Recurring job (20 favourites) | ~12 s | ~18 s |

---

## 🗺️ Roadmap

- [ ] Dynamic restaurant catalogue (DynamoDB/OpenSearch + scheduled refresh)
- [ ] Real-time table availability integration
- [ ] Authentication via Amazon Cognito (Google / Apple sign-in)
- [ ] Hindi + Hinglish NLU
- [ ] Personalised ranking (blend rating + distance + history)
- [ ] Payment gateway (Razorpay / Stripe deposits)
- [ ] Native mobile apps (React Native)
- [ ] Voice interface via Lex voice
- [ ] Analytics pipeline (Kinesis → S3 → Athena → QuickSight)
- [ ] CI/CD + CDK-based full IaC coverage for Lex V2

---

## ⚠️ Known Limitations

- Static restaurant catalogue — new restaurants require a redeploy
- No real-time table availability — all requested slots assumed available
- No user authentication — anyone with an email can create bookings under it
- English-only NLU (Hindi / Hinglish not supported yet)
- Lex V2 bot must be created manually in the console (CloudFormation support is limited)
- SMS via Fast2SMS is coded but disabled by default (requires DLT template registration for Indian numbers)

---

## 🔒 Security & Privacy

- All browser traffic is HTTPS (TLS via API Gateway)
- Each Lambda runs under a least-privilege IAM role
- Every handler validates input shape before any side effect
- Personal data (name, email, phone) is stored only in DynamoDB and shared only with the booking restaurant via email
- Default API Gateway throttling is in place; a public deployment would need per-IP / per-email rate limits

---

## 📄 License

This project is released for educational and demonstration purposes. See the repository for details.

---

## 🙏 Acknowledgements

- **Amazon Web Services** — for the serverless platform and free-tier quotas that made this project possible
- **The Zomato Delhi-NCR dataset** (publicly distributed on Kaggle) — source of the restaurant catalogue
- **The open-source community** — React, Vite, Tailwind, Zustand, and the many libraries this project stands on

---

## 👤 Author

**Vishal Sharma** — [@Vishalsym](https://github.com/Vishalsym)

Built as an MCA project at CHRIST (Deemed to be University), Delhi NCR Campus, 2026.
