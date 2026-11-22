# Belote Admin Bot Rule Manager

Open `/admin/bot-rules.html`, enter the server `ADMIN_PASSCODE`, and manage bidding rules.

The server evaluates published expert rules before the existing bot fallback. Duplicate rules are blocked using a normalized SHA-256 fingerprint. More specific or higher-priority matching rules win.

## Install

1. Back up the current project.
2. Copy this project over the existing project, keeping `node_modules`.
3. Set `ADMIN_PASSCODE` in the environment or edit `src/config.js`.
4. Run `node --check server.js` and `pm2 restart all`.

## Initial conventions

The package includes the 90-support conventions discussed: Jack +10, Nine +10, Jack+Nine +20 with competitive adjustment, two small trumps Tik-Tak then pass, and three small trumps Tik-Tak then +10.
