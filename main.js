"use strict";
import smtpSrv from './smtpSrv.js'
import httpSrv from './httpSrv.js'
import config from './config.js'
import domain from './domain.js'
import database from './database.js'

config.init();
let db = database.init();
let domainName = domain.getDomainName();

// Ports can be overridden via config (useful when running behind a
// reverse proxy that listens on 80/443 itself). ENV wins over config
// wins over the default.
let smtpPort = parseInt(process.env.SMTP_PORT) || config.getConfig('SmtpPort') || 25;
let httpPort = parseInt(process.env.HTTP_PORT) || config.getConfig('HttpPort') || 80;

smtpSrv.start(db, smtpPort);
httpSrv.start(db, domainName, httpPort);
