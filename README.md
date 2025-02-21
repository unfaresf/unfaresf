# UnfareSF

This app intakes reports about police from various sources and posts reports to other platforms.

It is a Nuxt app with a SQLite database. Anyone can use the form to report a sighting but only those who are invited can view the reports and make cross-platform posts.

Look at [Nuxt docs](https://nuxt.com/docs/getting-started/introduction) and [Nuxt UI docs](https://ui.nuxt.com) to learn more.

## Dev Setup

Make sure to install the dependencies:

```bash
# npm
npm ci # like `npm install` but respects `package-lock.json`.
```

Then copy the example `.env` file in the base project directory:

```bash
# Create .env file.
cp ./.env.example ./.env
```
<!-- Any line that starts with # should be filled in with your variable and uncommented -->

### Certs
This app is designed to be a progressive web app (PWA) with push notifications. service works, push notifications, location awareness (for reporting) all require https, even during local dev. The devX story for https isn't great, I know, but we need it. I suggest using [mkcert](https://github.com/FiloSottile/mkcert) to greatly simply this. Follow the install guide for mkcert and use system. Note that Firefox and mobile device support have a few extra steps. Once it's installed use mkcert to generate your cert and key, add them to the `/certs` directory:

```bash
$ mkcert -install
Created a new local CA 💥
The local CA is now installed in the system trust store! ⚡️
Note: Firefox support is not available on [Windows]. ℹ️

$ mkcert -key-file ./certs/key.pem -cert-file ./certs/cert.pem localhost 127.0.0.1 ::1

Created a new certificate valid for the following names 📜
 - "localhost"
 - "127.0.0.1"
 - "::1"

The certificate is at "./certs/cert.pem" and the key at "./certs/key.pem" ✅

It will expire on 20 May 2027 🗓
```

### GTFS/database setup

This is the GTFS for the San Francisco Bay area from [API 511](https://511.org/open-data/transit). Replace `API_KEY` in the below cURL with your own API key from [here](https://511.org/open-data/token). If you aren't in the bay area use any other GTFS zip. just be sure to put the zip file at `./gtfs/gtfs.zip`.

```bash
curl -o gtfs/gtfs.zip "http://api.511.org/transit/datafeeds?api_key=API_KEY&operator_id=RG"
```

Setup the local DBs.

```bash
# Setup local SQLite DB
npm run db:migrate
# Import the gtfs data into the sqlite database
npm run gtfs:init
```

### Run the Dev Server

Start the development server on `https://localhost:3000`:
```bash
# npm
npm run dev
```

## Production

Build the application for production:
```bash
# npm
npm run build
```

Locally preview production build:
```bash
# npm
npm run preview
```
