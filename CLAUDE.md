# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
NortixMail is a disposable email server that allows users to create temporary email addresses for enhanced privacy and spam reduction. It consists of a Node.js backend with SMTP and HTTP servers, and a Svelte frontend for email management.

## Development Commands

### Main Development
- `npm run dev` - Start development server (runs both backend with nodemon and frontend with Vite watch)
- `node main.js` - Start production server

### Frontend Development (in `/front` directory)
- `npm run dev` - Build frontend with Vite in watch mode
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build

### Setup Commands
- `npm install` - Install backend dependencies
- `cd front && npm install` - Install frontend dependencies
- `npm install && cd front && npm install && npm run build && cd .. && node main.js` - Full setup and start

## Architecture

### Backend Services
- **main.js** - Entry point that initializes all services
- **smtpSrv.js** - SMTP server (port 25) for receiving emails with auto-forwarding capability
- **smtpClient.js** - SMTP client using nodemailer for sending and forwarding emails
- **httpSrv.js** - Express HTTP server (port 80) serving API endpoints and static files
- **database.js** - SQLite database management using better-sqlite3
- **config.js** - Configuration management from data/config.json
- **domain.js** - Domain name detection from TLS certificates
- **helper.js** - Utility functions

### Frontend (Svelte + Vite)
- Built with Svelte and Vite
- Two main pages: index.html (main interface) and manage.html (management interface)
- **Compose.svelte** - Modal component for email composition
- Inbox/Sent email tabs with forward functionality
- Forwarding rules management interface
- Uses Vite for bundling with multi-page setup
- Static files served from front/html/dist

### Database Schema
- **address** table: stores disposable email addresses (addr TEXT)
- **mail** table: stores received emails (id, recipient, sender, subject, content)
- **sent_mails** table: stores sent emails (id, from_addr, to_addr, subject, content, sent_at)
- **forwarding_rules** table: stores email forwarding rules (id, source_addr, target_addr, auto_forward, created_at)

### Key Features
- **Email Sending**: Compose and send emails from disposable addresses
- **Auto-forwarding**: Automatically forward incoming emails to specified addresses
- **Manual forwarding**: Forward individual emails on demand
- **Forwarding rules management**: Create, view, and delete forwarding rules per address
- Automatic TLS certificate detection from data/ folder
- Configurable mail refresh interval and pagination
- Email parsing with mailparser for HTML/text content
- Compression and static file serving via Express

### Configuration
- Main config: `data/config.json` (MailCountPerPage, MailRefreshInterval, SMTPOutbound, ForwardingEnabled)
- SMTP outbound settings: Configure host, port, security settings for sending emails
- TLS certificates: Place .crt and .key files in `data/` folder for automatic detection
- Database: SQLite file stored at `data/data.db`

### Docker Support
- Uses Alpine Linux base image
- Dockerfile handles both backend and frontend builds
- docker-compose.yaml available for easy deployment
- Port 25 (SMTP) and 80 (HTTP) exposed

## API Endpoints

### Existing Endpoints
- POST /addresses - Get all email addresses
- POST /domain - Get domain name
- POST /addAddress - Create new disposable address
- POST /deleteAddress - Delete address and associated emails
- POST /deleteEmails - Delete emails for specific address
- POST /mails - Get paginated emails for address
- POST /mailData - Get specific email content
- POST /deleteMail - Delete specific email

### New Email Sending & Forwarding Endpoints
- POST /sendEmail - Send new email from disposable address
- POST /sentMails - Get paginated sent emails for address
- POST /forwardEmail - Manual email forwarding
- POST /addForwardingRule - Create new forwarding rule
- POST /getForwardingRules - Get forwarding rules for address
- POST /deleteForwardingRule - Delete forwarding rule