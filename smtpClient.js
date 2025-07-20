"use strict";
import nodemailer from 'nodemailer';
import config from './config.js';
import fs from 'fs';
import path from 'path';

let mod = {

	transporter: null,

	init: function() {

		try {

			let smtpConfig = config.getConfig("SMTPOutbound");
			if (!smtpConfig) {
				smtpConfig = {
					host: "localhost",
					port: 587,
					secure: false
				};
			}

			let transporterOptions = {
				host: smtpConfig.host,
				port: smtpConfig.port,
				secure: smtpConfig.secure,
				ignoreTLS: !smtpConfig.secure,
				requireTLS: false
			};

			if (smtpConfig.auth) {
				transporterOptions.auth = smtpConfig.auth;
			}

			try {
				const files = fs.readdirSync("./data");
				for(let fileName of files){
					let ext = path.extname(fileName);
					if(ext != ".db" && ext != ".json"){
						let content = fs.readFileSync("./data/" + fileName, 'utf8');
						if(content.includes("PRIVATE KEY")){
							transporterOptions.key = content;
						}
						if(content.includes("BEGIN CERTIFICATE")){
							transporterOptions.cert = content;
						}
					}
				}
			} catch (err) {
				console.log("TLS cert detection failed, using non-secure connection");
			}

			this.transporter = nodemailer.createTransport(transporterOptions);

		} catch (err) {
			console.log("SMTP client init failed");
			console.log(err);
		}

	},

	sendEmail: async function(fromAddr, toAddr, subject, content, domainName) {

		if (!this.transporter) {
			throw new Error("SMTP client not initialized");
		}

		try {

			let fromAddress = fromAddr + '@' + (domainName || 'localhost');
			
			let mailOptions = {
				from: fromAddress,
				to: toAddr,
				subject: subject,
				html: content
			};

			let result = await this.transporter.sendMail(mailOptions);
			return { success: true, messageId: result.messageId };

		} catch (err) {

			console.log("Email send failed");
			console.log(err);
			throw err;

		}

	},

	forwardEmail: async function(originalMail, targetAddr, sourceAddr, domainName) {

		if (!this.transporter) {
			throw new Error("SMTP client not initialized");
		}

		try {

			let fromAddress = sourceAddr + '@' + (domainName || 'localhost');
			let forwardSubject = `Fwd: ${originalMail.subject}`;
			let forwardContent = `
				<div style="border-left: 2px solid #ccc; padding-left: 10px; margin: 10px 0;">
					<p><strong>Forwarded message:</strong></p>
					<p><strong>From:</strong> ${originalMail.sender}</p>
					<p><strong>Subject:</strong> ${originalMail.subject}</p>
					<hr>
					${originalMail.content}
				</div>
			`;

			let mailOptions = {
				from: fromAddress,
				to: targetAddr,
				subject: forwardSubject,
				html: forwardContent
			};

			let result = await this.transporter.sendMail(mailOptions);
			return { success: true, messageId: result.messageId };

		} catch (err) {

			console.log("Email forward failed");
			console.log(err);
			throw err;

		}

	}

}

export default mod;