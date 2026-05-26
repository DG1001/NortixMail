"use strict";
import sqlite3 from 'better-sqlite3';

let database = {

	init: function(){

		try {

			const db = new sqlite3('./data/data.db');
			db.exec("CREATE TABLE IF NOT EXISTS address (addr TEXT NOT NULL)");
			let res = db.prepare("SELECT COUNT(*) as count FROM address").get();

			if (res.count == 0){

				//generate random username
				const letters = 'abcdefghijklmnopqrstuvwxyz';
				let uname = '';
				for (let i = 0; i < 3; i++) {
					const randomIndex = Math.floor(Math.random() * letters.length);
					uname += letters[randomIndex];
				}
				uname += Math.floor(Math.random() * 10).toString();
				uname += Math.floor(Math.random() * 10).toString();

				db.prepare("INSERT INTO address (addr) VALUES (?)").run(uname);

			}

			db.exec("CREATE TABLE IF NOT EXISTS mail (id TEXT NOT NULL, recipient TEXT NOT NULL, sender TEXT NOT NULL, subject TEXT NOT NULL, content TEXT NOT NULL)");

			// Migrations on the mail table
			try {
				const cols = db.prepare("PRAGMA table_info(mail)").all();
				const hasRcptList = cols.some(c => c.name === 'rcpt_list');
				if (!hasRcptList) {
					db.exec("ALTER TABLE mail ADD COLUMN rcpt_list TEXT");
				}
				const hasReceivedAt = cols.some(c => c.name === 'received_at');
				if (!hasReceivedAt) {
					// SQLite refuses CURRENT_TIMESTAMP as ALTER TABLE default
					// (non-constant). Add nullable and set explicitly on INSERT.
					db.exec("ALTER TABLE mail ADD COLUMN received_at DATETIME");
				}
			} catch (_e) {
				// ignore; DB may be readonly or migration not needed
			}

			db.exec(`CREATE TABLE IF NOT EXISTS sent_mails (
				id TEXT PRIMARY KEY,
				from_addr TEXT NOT NULL,
				to_addr TEXT NOT NULL,
				subject TEXT NOT NULL,
				content TEXT NOT NULL,
				sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)`);

			db.exec(`CREATE TABLE IF NOT EXISTS forwarding_rules (
				id TEXT PRIMARY KEY,
				source_addr TEXT NOT NULL,
				target_addr TEXT NOT NULL,
				auto_forward BOOLEAN DEFAULT 0,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)`);

			return db;

		} catch(err) {

			console.log("DB init fail")
			console.log(err);
			process.exit();

		}

	}

}

export default database;
