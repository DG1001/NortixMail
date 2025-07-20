# Nortix Mail
Please star this repo if you find it useful, thank you!
![image](https://github.com/user-attachments/assets/625d9d45-75e9-43f5-8264-57d2ed7ee7d8)

# Purpose 🎯
Whenever you sign up with your email on a website, your email address is stored and sometimes sold to advertisers. This is where you get your bulk of spam emails. Whenever a data breach happens, you also risk having your primary email address leaked and informations stolen.

Using Nortix Mail, you can create disposable email addresses that can be used to sign up to website that requires email verification. This is very useful when you just want to try out new website / services without giving away your real email address. It significantly enhances privacy, security and reduces spam. It's like running your own Gmail server.

## ✨ Features
- **📥 Receive emails** to disposable addresses
- **📤 Send emails** from disposable addresses  
- **🔄 Auto-forwarding** - automatically forward incoming emails to your real address
- **↩️ Manual forwarding** - forward individual emails on demand
- **⚙️ Forwarding rules** - manage multiple forwarding destinations per address
- **📱 Web interface** - clean, mobile-friendly UI for email management

# Why it's better than other similar services ⚡
Email servers are notoriously difficult to set up, Nortix Mail aims to make it as simple as possible by making TLS optional and it can automatically detect your domain if you choose to use TLS. If you change your domain, it can automatically detect it and requires no additional configuration. If you want to move the data to another server, just copy the `data` folder.

# Run without docker 🖥️
1. make sure that nodejs & npm is installed
2. run `npm install`
4. run `cd front`
5. run `npm install`
6. run `npm run build`
7. run `cd ..`
8. run `node main.js`

or use the combined command: `npm install && cd front && npm install && npm run build && cd .. && node main.js`  
The http server will be listening on port 80. Make sure that your port 25 is accessible to receive mails

# Run with docker 🐋
1. git clone / download this repo
2. run `docker compose up -d`

In the `docker-compose.yaml` file, port `25:25` is mapped by default. It is recommended to not change this setting if you are using a reverse proxy as some of them cannot forward smtp packets

# Configuration 📝

## Basic Settings
You can edit `config.json` inside `data/config.json` to change the mail refresh interval and number of emails shown per page:

```json
{
  "MailCountPerPage": 10,
  "MailRefreshInterval": 3,
  "ForwardingEnabled": true
}
```

## Outbound SMTP Configuration 📤
To enable email sending and forwarding, configure the outbound SMTP server in `data/config.json`:

### Gmail SMTP (Recommended)
```json
{
  "SMTPOutbound": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "your-email@gmail.com",
      "pass": "your-app-password"
    },
    "maxRetries": 3
  }
}
```

**Gmail Setup:**
1. Enable 2-factor authentication on your Gmail account
2. Generate an "App Password" in Google Account settings
3. Replace `your-email@gmail.com` with your Gmail address
4. Replace `your-app-password` with the generated app password

### Outlook/Hotmail SMTP
```json
{
  "SMTPOutbound": {
    "host": "smtp-mail.outlook.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "your-email@outlook.com",
      "pass": "your-password"
    }
  }
}
```

### Custom SMTP Server
```json
{
  "SMTPOutbound": {
    "host": "mail.yourdomain.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "username",
      "pass": "password"
    }
  }
}
```

### Secure SMTP (SSL/TLS)
```json
{
  "SMTPOutbound": {
    "host": "smtp.example.com",
    "port": 465,
    "secure": true,
    "auth": {
      "user": "username",
      "pass": "password"
    }
  }
}
```

### Configuration Parameters:
- **`host`**: SMTP server hostname
- **`port`**: SMTP server port (587 for STARTTLS, 465 for SSL, 25 for unencrypted)
- **`secure`**: `true` for SSL (port 465), `false` for STARTTLS (port 587)
- **`auth`**: Authentication object with `user` and `pass`
- **`maxRetries`**: Number of retry attempts for failed sends

⚠️ **Important**: Restart the server after modifying the configuration file.

# Using Email Features 🚀

## Composing & Sending Emails 📝
1. Open the web interface (default: http://localhost)
2. Select a disposable address from the dropdown
3. Click the **"Compose"** button (blue button)
4. Fill in recipient, subject, and message
5. Click **"Send"** to deliver the email

## Managing Email Forwarding 🔄
1. Click **"Manage addresses"** in the main interface
2. Scroll down to the **"Email Forwarding"** section
3. Enter a target email address where you want emails forwarded
4. Check **"Auto-forward"** for automatic forwarding of all incoming emails
5. Click **"Add forwarding rule"**

## Manual Email Forwarding ↩️
1. In the inbox, click the **"Forward"** button next to any email
2. Enter the destination email address
3. The email will be forwarded with "Fwd:" prefix and original content

## Viewing Sent Emails 📤
1. In the main interface, click the **"Sent"** tab
2. View all emails sent from the selected disposable address
3. Use pagination to browse through sent emails

# Adding TLS / Encryption (optional) 🔒
copy your certificate and private key files into the `data` folder (usually, the file extensions are `.crt` and `.key`). The file name and extension don't actually matter as Nortix Mail can automatically detect which one is which

# Is it safe if I don't use TLS? 🔍
The current mail transfer protocol is very old and by default it doesn't require TLS to function. This means that when another server sends an email to your server, anyone in between can theoretically read the mail if they actively try to intercept. However, this is unlikely to happen as the people who have this capability are mostly ISPs and hosting providers. For better security, setting up TLS is still recommended.

# Contributing 🤝
This repository currently doesn't accept any pull request. However, you can open an issue if you want to request a feature, report bugs or ask me a question.
