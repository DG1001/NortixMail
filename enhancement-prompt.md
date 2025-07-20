# Nortix Mail Enhancement: Email Sending & Forwarding

## Project Overview
Enhance the existing Nortix Mail disposable email server with email sending capabilities and automatic/manual forwarding features. The base project is a Node.js/Express application with Svelte frontend that currently only receives emails.

## Current Architecture (from repo-mix.txt)
- **Backend**: Node.js + Express + SQLite + SMTP Server
- **Frontend**: Svelte + Vite
- **Database**: SQLite with tables: `address`, `mail`
- **Key Files**: `main.js`, `smtpSrv.js`, `httpSrv.js`, `database.js`

## Required Enhancements

### 1. Email Sending Functionality

#### Backend Changes:
- **Add nodemailer dependency** to `package.json`
- **Create new module** `smtpClient.js` for outbound email sending
- **Extend database schema**:
  ```sql
  CREATE TABLE IF NOT EXISTS sent_mails (
    id TEXT PRIMARY KEY,
    from_addr TEXT NOT NULL,
    to_addr TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS forwarding_rules (
    id TEXT PRIMARY KEY,
    source_addr TEXT NOT NULL,
    target_addr TEXT NOT NULL,
    auto_forward BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```

#### New API Endpoints in `httpSrv.js`:
- `POST /sendEmail` - Send new email
- `POST /sentMails` - Get sent emails list
- `POST /addForwardingRule` - Add forwarding rule
- `POST /getForwardingRules` - Get forwarding rules for address
- `POST /deleteForwardingRule` - Delete forwarding rule
- `POST /forwardEmail` - Manual email forwarding

### 2. Frontend Enhancements

#### New UI Components:
- **Compose Email Modal/Page**:
  - To, Subject, Body fields
  - Send button with loading state
  - Rich text editor (simple HTML)
  
- **Forwarding Management**:
  - Add/remove forwarding rules per address
  - Toggle auto-forwarding on/off
  - Manual forward button for individual emails

#### Extend existing Svelte components:
- **index.svelte**: Add "Compose" and "Sent" tabs/views
- **manage.svelte**: Add forwarding rules section
- **New component**: `Compose.svelte` for email composition

### 3. Auto-Forwarding Logic

#### Implementation in `smtpSrv.js`:
- After saving incoming email to database
- Check forwarding rules for recipient
- If auto-forward enabled, send email to target address
- Log forwarding action

### 4. Configuration Enhancements

#### Extend `data/config.json`:
```json
{
  "MailCountPerPage": 10,
  "MailRefreshInterval": 3,
  "SMTPOutbound": {
    "host": "localhost",
    "port": 587,
    "secure": false,
    "maxRetries": 3
  },
  "ForwardingEnabled": true
}
```

## Technical Implementation Details

### SMTP Client Module (`smtpClient.js`):
```javascript
import nodemailer from 'nodemailer';
import config from './config.js';

// Create transporter for sending emails
// Handle authentication and TLS configuration
// Implement retry logic for failed sends
```

### Security Considerations:
- **Rate limiting** for send operations
- **Input validation** for email addresses and content
- **Prevent email loops** in forwarding
- **SPF/DKIM setup** guidance in documentation

### Error Handling:
- **Bounce handling** for failed deliveries
- **User feedback** for send failures
- **Logging** of all send/forward operations

## File Structure Changes
```
New files:
- smtpClient.js (outbound SMTP client)
- front/html/src/Compose.svelte (compose UI)

Modified files:
- database.js (new tables)
- httpSrv.js (new endpoints)
- smtpSrv.js (auto-forwarding)
- index.svelte (compose/sent views)
- manage.svelte (forwarding rules)
- package.json (nodemailer dependency)
- config.js (new config options)
```

## UI/UX Requirements

### Compose Email Interface:
- Clean, Gmail-like compose window
- Auto-save drafts (future enhancement)
- Attachment support (future enhancement)
- Send confirmation dialog

### Forwarding Management:
- Simple toggle switches for auto-forward
- Clear indication of active forwarding rules
- Bulk forwarding operations

### Email List Enhancements:
- "Sent" folder tab
- Forward button on each received email
- Reply button (future enhancement)

## Testing Considerations
- Test email sending to external addresses
- Verify forwarding loops prevention
- Test with/without TLS configuration
- Mobile responsiveness for new UI components

## Implementation Priority
1. **SMTP Client setup** and basic sending
2. **Database schema** updates
3. **Compose UI** implementation
4. **Auto-forwarding logic**
5. **Manual forwarding** features
6. **Forwarding management** UI

## Success Criteria
- [ ] Can compose and send emails from any managed address
- [ ] Auto-forwarding works reliably
- [ ] Manual forwarding available for received emails
- [ ] Forwarding rules manageable via UI
- [ ] No email loops in forwarding chains
- [ ] Sent emails tracked and viewable
- [ ] Maintains existing functionality

Please implement these enhancements while preserving the existing codebase architecture and coding style. Focus on clean, maintainable code that follows the project's current patterns.