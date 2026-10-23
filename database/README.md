# Database

The app uses MongoDB. `compose.yaml` starts a local MongoDB 7 instance and keeps data in the named `finance-tracker-data` volume.

From this folder, start it with:

```sh
docker compose up -d
```

The backend connects to `mongodb://127.0.0.1:27017/finance_tracker` by default. For MongoDB Atlas, set `MONGODB_URI` in `backend/.env` to your Atlas connection string. Mongoose creates the `transactions` and `budgets` collections on first use.
