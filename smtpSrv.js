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

						for (let recipient of mail.to.value){

							var recipientName = recipient.address.substring(0, recipient.address.lastIndexOf("@"));
							let res = db.prepare("SELECT COUNT(*) as count FROM address WHERE addr = ?").all(recipientName);

							if (res[0].count > 0) {

								let id = h.randomID();
								db.prepare("INSERT INTO mail (id, recipient, sender, subject, content) VALUES (?, ?, ?, ?, ?)").run(id, recipientName, sender, subject, content);
								
								if (config.getConfig("ForwardingEnabled")) {
									try {
										let forwardingRules = db.prepare("SELECT target_addr FROM forwarding_rules WHERE source_addr = ? AND auto_forward = 1").all(recipientName);
										
										for (let rule of forwardingRules) {
											try {
												let originalMail = { sender, subject, content };
												await smtpClient.forwardEmail(originalMail, rule.target_addr, recipientName, domainName);
												console.log(`Auto-forwarded email from ${recipientName} to ${rule.target_addr}`);
											} catch (forwardErr) {
												console.log(`Auto-forward failed for ${recipientName} -> ${rule.target_addr}:`, forwardErr.message);
											}
										}
									} catch (forwardingErr) {
										console.log("Auto-forwarding check failed:", forwardingErr);
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
