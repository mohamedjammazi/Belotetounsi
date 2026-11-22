# Tunisian Belote Updated

Updates: Capot Arbi 250, Capot Arbi Mballat 270, private hands in real-person games, smarter legal bots, split maintainable frontend.

Deploy the folder contents to `/www/wwwroot/10.110.14.250/nodeproject`, keep `npm start`, port 8000.

## Offline dependency note
This ZIP contains the complete application source. Keep the existing `node_modules` folder already installed on the server. Do not delete it when copying the update. Express and ws versions remain unchanged.


## Security and administration

- There is no default administrator password. For deployment, set `ADMIN_PASSCODE` to a unique secret of at least 12 characters in the process environment. Never commit the secret to this ZIP or print it to logs.
- If no password is configured, the first startup creates a one-time bootstrap token in `src/data/.admin-bootstrap-token` with mode `0600`. Read it locally from the server and set a 12+ character password from `/admin/panel.html` within 10 minutes. The token is not served publicly and is deleted after use.
- The main admin dashboard links to domain/site identity, bot learning, and bot rules. Domain changes update canonical links and redirects in this application only; DNS, domain ownership, hosting aliases, TLS certificates, and OAuth redirect registrations must still be configured with their providers.
- Script/HTML injection fields are restricted: only recognized verification `<meta>` tags are emitted, while arbitrary body HTML is disabled.
- Game actions require a valid server-signed identity token; client-supplied player IDs are ignored. A player may occupy one room at a time. Disconnected active seats are taken over by the existing timeout-to-bot behavior; Tunisian card rules and bot decision modules are unchanged.
- Admin backups redact authentication/signing, Google OAuth, and database secrets. Import keeps the current server's secret values when a backup omits them.

Set the environment variable before starting, for example:

```sh
export ADMIN_PASSCODE='use-a-unique-secret-with-at-least-12-characters'
npm start
```

- The distributable `src/data/appdb.json` retains the game/account records but has signing, Google OAuth, and MySQL secrets removed. Existing sessions will need to sign in again; re-enter OAuth/MySQL secrets in the secure admin panel if those integrations are enabled.


## Domain and H5 publishing checklist

- The shipped canonical domain is `https://belotetounsi.online`; the application redirects `www` to the apex. Configure Nginx/hosting to redirect HTTP to HTTPS and use valid certificates for both apex and `www`.
- `robots.txt` allows the public game page, and the sitemap includes `/play`. API and admin paths remain disallowed from crawling. `/ads.txt` returns a valid plain-text response; it stays empty until the real AdSense publisher ID is configured.
- Google H5 Games Ads are not active in this distributable. Once Google approves the publisher/site, set the actual `ca-pub-...` ID in the admin settings, turn off test mode, then enable ads. Do not insert a made-up ID. The game page includes the documented Ad Placement API loader and bootstrap, and the rewarded flow calls `adBreak()` only at its optional reward prompt.
- The site's current cookie banner is a basic consent gate, not a Google-certified TCF CMP. Before serving personalized ads to users in the EEA, UK, or Switzerland, integrate a Google-certified CMP (Google Privacy & messaging is one option) and verify consent behavior for those regions. Merely clicking the existing banner does not satisfy that CMP requirement.
- Google makes the final H5 participation and publisher approval decision after its own review. This package cannot guarantee acceptance or replace the publisher's application, payment/tax, domain-ownership, privacy-law, and traffic-quality obligations.
- If Google sign-in is enabled, add `https://belotetounsi.online/api/auth/google/callback` to the OAuth client allowed redirect URIs and enter the client credentials in the secure admin settings.
- The source package cannot change DNS or hosting-level TLS settings. The live domain has working HTTPS certificates on apex and `www`; HTTP-to-HTTPS redirection is handled by Nginx/hosting.
