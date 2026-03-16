# Mosport V1 Deployment Flow

This document outlines the deployment strategy for Mosport.
The application is designed to be deployed instantly without requiring local environment configuration.

## 1. Source Control (GitHub)
- Initialize a git repository in `mosport`: `git init`
- Add files: `git add .`
- Commit: `git commit -m "Initial Mosport commit"`
- Push to a new GitHub repository.

## 2. Database Hosting (Railway)
1. Go to [Railway.app](https://railway.app/).
2. Provision a new **PostgreSQL** database.
3. Retrieve the `DATABASE_URL` from the Railway dashboard (connection string).

## 3. Application Deployment (Vercel)
1. Go to [Vercel](https://vercel.com/) and create a new project.
2. Import the Mosport repository from GitHub.
3. In the Environment Variables section, add:
   - `DATABASE_URL`: (Paste the connection string from Railway)
   - `NEXT_PUBLIC_API_URL`: (The default generated Vercel URL, or leave empty if using relative API paths)
4. Set the Build Command (Vercel will usually detect Next.js):
   - Overwrite if necessary: `npm run build` (This automatically runs `prisma generate && next build`)
5. Deploy.

## 4. Vercel Cron Setup
The `vercel.json` file controls the cron jobs.
Once deployed, Vercel will automatically detect the cron schedules:
- `10min`: Match crawler runs.
- `30min`: Stats crawler runs.
- `60min`: Odds crawler runs.
- Engine cascade runs automatically after the crawlers.

## 5. Post-Deployment Database Push
Once deployed, the Prisma schema needs to be pushed to the Railway database:
`npx prisma db push`

You can also run this locally connected to the remote DB if you have node installed, or use a setup script.

With these steps, your quantitative sports engine will be fully operational in the cloud.
