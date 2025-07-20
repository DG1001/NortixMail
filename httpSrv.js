"use strict";
import express from 'express'
import compression from 'compression'
import config from './config.js'
import smtpClient from './smtpClient.js'
import h from './helper.js'

let mod = {

	start: function(db, domainName, port){

		const app = express();

		app.use(express.json());
		app.use(compression());
		app.use(express.static('./front/html/dist'));

		smtpClient.init();

		let refreshInterval = config.getConfig("MailRefreshInterval");
		app.post('/addresses', (_req, res) => {

			try {

				let rows = db.prepare("SELECT addr FROM address").all();
				res.json({addresses: rows, refreshInterval: refreshInterval});

			} catch(err) {

				console.log("DB get addresses fail")
				console.log(err)

			}

		})

		app.post('/domain', (req, res) => {

			if (domainName){

				return res.status(200).send(domainName);

			}else{

				return res.status(200).send(req.headers.host.split(':')[0]);

			}

		})

		app.post('/addAddress', (req, res) => {
		
			const json = req.body;
			
			try {

				let rows = db.prepare("SELECT addr FROM address WHERE addr = ?").all(json.address);
				if(rows.length > 0){
					
					return res.status(200).send("exist");

				}

				db.prepare("INSERT INTO address (addr) VALUES (?)").run(json.address);
				return res.status(200).send("done");

			} catch(err) {

				console.log("DB add addresses fail")
				console.log(err)

			}

		})

		app.post('/deleteAddress', (req, res) => {

			const json = req.body;

			try {

				db.prepare("DELETE FROM address WHERE addr = ?").run(json.address);
				db.prepare("DELETE FROM mail WHERE recipient = ?").run(json.address);

				return res.status(200).send("done");

			} catch(err) {

				console.log("DB delete address fail")
				console.log(err)

			}

		})

		app.post('/deleteEmails', (req, res) => {

			const json = req.body;

			try {

				db.prepare("DELETE FROM mail WHERE recipient = ?").run(json.address);
				return res.status(200).send("done");

			} catch(err) {

				console.log("DB delete address fail")
				console.log(err)

			}

		})



		app.post('/mails', (req, res) => {

			const json = req.body;

			try {

				let rows = db.prepare("SELECT id, sender, subject FROM mail WHERE recipient = @recipient ORDER BY id DESC LIMIT @mailCount OFFSET (@page-1)*@mailCount").all({recipient: json.addr, page: json.page, mailCount: config.getConfig('MailCountPerPage')});
				res.json(rows);

			} catch(err) {

				console.log("DB get mails fail")
				console.log(err)

			}

		});

		app.post('/mailData', (req, res) => {

			const json = req.body;

			try {

				let rows = db.prepare("SELECT sender, subject, content FROM mail WHERE id = ?").all(json.id);
				res.json(rows[0])

			} catch(err) {

				console.log("DB get mail data fail")
				console.log(err)

			}

		});

		app.post('/deleteMail', (req, res) => {

			const json = req.body;

			try {

				db.prepare("DELETE FROM mail WHERE id = ?").run(json.id);
				res.status(200).send();

			} catch(err) {

				console.log("DB delete mail fail")
				console.log(err)

			}

		})

		app.post('/sendEmail', async (req, res) => {

			const json = req.body;

			try {

				let currentDomain = domainName || req.headers.host.split(':')[0];
				let result = await smtpClient.sendEmail(json.fromAddr, json.toAddr, json.subject, json.content, currentDomain);
				
				let id = h.randomID();
				db.prepare("INSERT INTO sent_mails (id, from_addr, to_addr, subject, content) VALUES (?, ?, ?, ?, ?)").run(id, json.fromAddr, json.toAddr, json.subject, json.content);
				
				res.json({ success: true, messageId: result.messageId });

			} catch(err) {

				console.log("Send email fail");
				console.log(err);
				res.status(500).json({ success: false, error: err.message });

			}

		})

		app.post('/sentMails', (req, res) => {

			const json = req.body;

			try {

				let rows = db.prepare("SELECT id, to_addr, subject, sent_at FROM sent_mails WHERE from_addr = @fromAddr ORDER BY sent_at DESC LIMIT @mailCount OFFSET (@page-1)*@mailCount").all({fromAddr: json.addr, page: json.page, mailCount: config.getConfig('MailCountPerPage')});
				res.json(rows);

			} catch(err) {

				console.log("DB get sent mails fail");
				console.log(err);
				res.status(500).json({ error: err.message });

			}

		});

		app.post('/addForwardingRule', (req, res) => {

			const json = req.body;

			try {

				let rows = db.prepare("SELECT id FROM forwarding_rules WHERE source_addr = ? AND target_addr = ?").all(json.sourceAddr, json.targetAddr);
				if(rows.length > 0){
					return res.status(200).send("exist");
				}

				let id = h.randomID();
				db.prepare("INSERT INTO forwarding_rules (id, source_addr, target_addr, auto_forward) VALUES (?, ?, ?, ?)").run(id, json.sourceAddr, json.targetAddr, json.autoForward ? 1 : 0);
				return res.status(200).send("done");

			} catch(err) {

				console.log("DB add forwarding rule fail");
				console.log(err);
				res.status(500).json({ error: err.message });

			}

		})

		app.post('/getForwardingRules', (req, res) => {

			const json = req.body;

			try {

				let rows = db.prepare("SELECT id, target_addr, auto_forward FROM forwarding_rules WHERE source_addr = ?").all(json.sourceAddr);
				res.json(rows);

			} catch(err) {

				console.log("DB get forwarding rules fail");
				console.log(err);
				res.status(500).json({ error: err.message });

			}

		})

		app.post('/deleteForwardingRule', (req, res) => {

			const json = req.body;

			try {

				db.prepare("DELETE FROM forwarding_rules WHERE id = ?").run(json.id);
				return res.status(200).send("done");

			} catch(err) {

				console.log("DB delete forwarding rule fail");
				console.log(err);
				res.status(500).json({ error: err.message });

			}

		})

		app.post('/forwardEmail', async (req, res) => {

			const json = req.body;

			try {

				let mailRows = db.prepare("SELECT sender, subject, content FROM mail WHERE id = ?").all(json.mailId);
				if(mailRows.length === 0){
					return res.status(404).json({ error: "Mail not found" });
				}

				let currentDomain = domainName || req.headers.host.split(':')[0];
				let result = await smtpClient.forwardEmail(mailRows[0], json.targetAddr, json.sourceAddr, currentDomain);
				
				res.json({ success: true, messageId: result.messageId });

			} catch(err) {

				console.log("Forward email fail");
				console.log(err);
				res.status(500).json({ success: false, error: err.message });

			}

		})

		app.use((err, req, res, next) => {
			console.error(err)
		});

		app.listen(port, () => {
			console.log('http server listening at port: ' + port);	
		})
		
	}

}


export default mod;
