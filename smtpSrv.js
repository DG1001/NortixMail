"use strict";
import { SMTPServer as ssrv } from 'smtp-server'
import { simpleParser } from 'mailparser'
import fs from 'fs'
import path from 'path'
import h from './helper.js'
import config from './config.js'
import smtpClient from './smtpClient.js'
import domain from './domain.js'

let mod = {

	start: function(db , port){

		smtpClient.init();
		let domainName = domain.getDomainName();
		// Configurable allow-list of domains we accept incoming mail for.
		// Falls back to the TLS-cert-derived domain when nothing is configured.
		let configured = config.getConfig('LocalDomains');
		let localDomains = Array.isArray(configured) && configured.length
			? configured.map(d => String(d).toLowerCase())
			: (domainName ? [domainName.toLowerCase()] : []);
		if (localDomains.length === 0) {
			console.log("WARNING: no LocalDomains configured and no cert-derived domain — refusing all inbound mail");
		} else {
			console.log("Accepting mail for local domains: " + localDomains.join(", "));
		}

		let opt = {

			async onData(stream, _session, callback) {

				try {

					const mail = await simpleParser(stream);

					let sender = mail.from.value[0].address || mail.from.value[0].name;
					let subject = mail.subject;
					let content;

					if(mail.html){
						content = mail.html;
					}else{
						content = mail.textAsHtml;
					}

					try {

						// Build full recipient list (To, Cc, Bcc) for storage/forwarding
						let allRecipients = [];
						try {
							if (mail.to && mail.to.value) {
								allRecipients = allRecipients.concat(mail.to.value.map(v => v.address || v.name));
							}
							if (mail.cc && mail.cc.value) {
								allRecipients = allRecipients.concat(mail.cc.value.map(v => v.address || v.name));
							}
							if (mail.bcc && mail.bcc.value) {
								allRecipients = allRecipients.concat(mail.bcc.value.map(v => v.address || v.name));
							}
						} catch(_e) {}

						for (let recipient of mail.to.value){

							let atIdx = recipient.address.lastIndexOf("@");
							if (atIdx < 0) { continue; }
							// Only accept mail for our own domain(s) — prevents relay/spoofing
							// where an attacker sends to "<localpart>@anywhere" and we'd
							// store it (and possibly auto-forward) just because the local
							// part exists in our address table.
							let recipientDomain = recipient.address.substring(atIdx + 1).toLowerCase();
							if (!localDomains.includes(recipientDomain)) { continue; }

							var recipientName = recipient.address.substring(0, atIdx);
							let res = db.prepare("SELECT COUNT(*) as count FROM address WHERE addr = ?").all(recipientName);

							if (res[0].count > 0) {

								let id = h.randomID();
								let rcptListStr = allRecipients.join(',');
								db.prepare("INSERT INTO mail (id, recipient, sender, subject, content, rcpt_list, received_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))").run(id, recipientName, sender, subject, content, rcptListStr);
								
								if (config.getConfig('ForwardingEnabled')) {
									try {
										let forwardingRules = db
											.prepare('SELECT target_addr FROM forwarding_rules WHERE source_addr = ? AND auto_forward = 1')
											.all(recipientName);
										
										for (let rule of forwardingRules) {
											try {
												let originalMail = { sender, subject, content, recipients: allRecipients };
												// Prefer the actual recipient domain from the inbound address
												let inboundDomain = '';
												try {
													if (recipient && recipient.address && recipient.address.includes('@')) {
														inboundDomain = recipient.address.split('@')[1];
													}
												} catch(_e) {}
												await smtpClient.forwardEmail(originalMail, rule.target_addr, recipientName, inboundDomain || domainName);
												console.log(`Auto-forwarded email from ${recipientName} to ${rule.target_addr}`);
											} catch (forwardErr) {
												console.log(`Auto-forward failed for ${recipientName} -> ${rule.target_addr}:`, forwardErr.message);
											}
										}
									} catch (forwardingErr) {
										console.log('Auto-forwarding check failed:', forwardingErr);
									}
								}
								
								break;

							}

						}

					} catch (err) {

						console.log("Inbound email error");
						console.log(err);
					
					}

				} catch (err) {

					console.log("Processing email error");
					console.log(err);

				}

				callback(null);

			},

			authOptional: true,

			onConnect(_session, callback) {

				return callback();	

			},

		}

		try {

			//automatically detect public / private key
			const files = fs.readdirSync("./data");
			for(let fileName of files){

				let ext = path.extname(fileName);
				if(ext != ".db" && ext != ".json"){

					let content = fs.readFileSync("./data/" + fileName, 'utf8');
					if(content.includes("PRIVATE KEY")){
						opt.key = content;
					}

					if(content.includes("BEGIN CERTIFICATE")){
						opt.cert = content;
					}

				}

			}

		} catch (err) {

			console.log("read directory fail");
			console.log(err);

		}
			
		const server = new ssrv(opt);
		server.on('error', (err) => {

			console.log("SMTP server error");
			console.log(err);

		});

		server.listen(port, () => {

			console.log('smtp server running at port: ' + port);

		});

	}

}

export default mod;
