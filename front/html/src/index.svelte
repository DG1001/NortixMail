<script>

	import { onMount } from 'svelte';
	import f from './helper.js'
	import dialog from './lib/dialog.js'
	import Compose from './Compose.svelte'
	dialog.init();

	let domainName = "";
	let addresses = [];
	let selectedAddress = null;

	let mails = [];
	let sentMails = [];
	let page = 1;
	let totalMails = 0;
	let pageSize = 10;
	$: totalPages = Math.max(1, Math.ceil(totalMails / pageSize));
	let viewType = "overview"; // "mails", "sent", "mailData", "overview"
	let showCompose = false;
	let addressOverview = [];

	let mailDataSender;
	let mailDataSubject;
	let mailDataRecipients = [];

	function refreshMails(){

		if (viewType === "sent") {
			f.fetchPost('/sentMails', {addr: selectedAddress, page: page}, (data) => {
				sentMails = data.mails || [];
				totalMails = data.total || 0;
				pageSize = data.pageSize || pageSize;
			});
		} else {
			f.fetchPost('/mails', {addr: selectedAddress, page: page}, (data) => {
				mails = data.mails || [];
				totalMails = data.total || 0;
				pageSize = data.pageSize || pageSize;
			});
		}

	}

	// Pretty-print a SQLite-stored UTC timestamp ("YYYY-MM-DD HH:MM:SS") in
	// local time, using a relative form for recent items and a short
	// absolute form (with date+time) for older ones.
	function fmtTime(ts){
		if (!ts) return "";
		// SQLite CURRENT_TIMESTAMP gives UTC without "Z"; force it.
		let d = new Date(ts.replace(' ', 'T') + 'Z');
		if (isNaN(d.getTime())) return "";
		let diff = (Date.now() - d.getTime()) / 1000;
		if (diff < 60) return "just now";
		if (diff < 3600) return Math.floor(diff/60) + " min ago";
		if (diff < 86400) return Math.floor(diff/3600) + "h ago";
		if (diff < 86400*7) return Math.floor(diff/86400) + "d ago";
		return d.toLocaleDateString() + " " + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
	}

	function showSentEmails(){
		viewType = "sent";
		page = 1;
		refreshMails();
	}

	function showInboxEmails(){
		viewType = "mails";
		page = 1;
		refreshMails();
	}

	function showOverview(){
		viewType = "overview";
		refreshOverview();
	}

	function refreshOverview(){
		f.fetchPost('/addressOverview', {}, (data) => {
			addressOverview = data;
		});
	}

	function openCompose(){
		showCompose = true;
	}

	function closeCompose(){
		showCompose = false;
	}

	function forwardEmail(mailId){
		let targetAddr = prompt("Enter email address to forward to:");
		if (targetAddr && targetAddr.trim()) {
			f.fetchPost('/forwardEmail', {
				mailId: mailId,
				targetAddr: targetAddr.trim(),
				sourceAddr: selectedAddress
			}, (response) => {
				if (response.success) {
					dialog.alrt("Email forwarded successfully!");
				} else {
					dialog.alrt("Failed to forward email: " + (response.error || "Unknown error"));
				}
			});
		}
	}

	function clearInbox(){
		dialog.conf("Alle E-Mails in der Inbox löschen?", (res) => {
			if(res){
				f.fetchPost('/clearInbox', {address: selectedAddress}, (response) => {
					if (response === "done") {
						dialog.alrt("Inbox erfolgreich geleert!");
						refreshMails();
						refreshOverview();
					} else {
						dialog.alrt("Fehler beim Leeren der Inbox: " + (response.error || "Unbekannter Fehler"));
					}
				});
			}
		});
	}

	function selectedAddressChange(){
		
		page = 1;
		refreshMails();
		localStorage.setItem("address", selectedAddress);

	}

	function copyClicked(){
		
		f.copyToClipboard(selectedAddress + domainName);

	}

	function waitForElement(selector) {

		return new Promise((resolve) => {
			
			const observer = new MutationObserver((mutationsList, observer) => {

				for (let mutation of mutationsList) {
					
					if (mutation.type === 'childList' && document.querySelector(selector)) {

						observer.disconnect();
						resolve(document.querySelector(selector));
						return;

					}

				}

			});

			observer.observe(document.body, { childList: true, subtree: true });

		});

	}

	function mailClicked(event){

		if((event.type == 'keypress' && event.key == 'Enter') || (event.type == 'click' && event.button == 0)){

			let closest = event.target.closest(".clickable");
			f.fetchPost('/mailData', {id: closest.dataset.id}, (data) => {

				mailDataSender = data.sender;
				mailDataSubject = data.subject;
				mailDataRecipients = [];
				if (data.rcpt_list) {
					mailDataRecipients = Array.from(new Set(data.rcpt_list.split(',').map(s => s.trim()).filter(Boolean)));
				}

				viewType = 'mailData';

				waitForElement("#mailData").then((element)=>{

					// Render in a sandboxed iframe: no script execution, no form
					// submit, no popups, treated as a unique origin. Prevents
					// stored-XSS via attacker-controlled mail HTML
					// (<img onerror="...">, etc.).
					element.srcdoc = data.content || "";

				})

			});
			
		}

	}

	function deleteClicked(event){
		
		if((event.type == 'keydown' && event.key == 'Enter') || (event.type == 'click' && event.button == 0)){

			dialog.conf("delete?", (res) => {
				
				if(res){

					f.fetchPost('/deleteMail', {id: event.target.dataset.id}, () => {

						refreshMails();
				
					});

				}

			})

		}

		event.stopPropagation();

	}

	function backClicked(){
		
		//cleanup
		mailDataSender = null;
		mailDataSubject = null;
		mailDataRecipients = [];
		viewType = "mails"

	}

	function nextPage(){
		if (page < totalPages) {
			page += 1;
			refreshMails();
		}
	}

	function prevPage(){
		if (page > 1) {
			page -= 1;
			refreshMails();
		}
	}

	onMount(() => {

		f.fetchPost('/addresses', {}, (data) => {

			addresses = data.addresses;
			if (data.addresses.length > 0){

				selectedAddress = addresses[data.addresses.length-1].addr;
				let lastSelectedAddress = localStorage.getItem("address");
				if (lastSelectedAddress !== null && addresses.some(address => address.addr == lastSelectedAddress)) {

					selectedAddress = lastSelectedAddress;

				}

				refreshMails();
				refreshOverview();
				setInterval(() => {
					
					if (viewType === "overview") {
						refreshOverview();
					} else {
						refreshMails();
					}
				
				}, data.refreshInterval*1000);

			}

		});

		f.fetchPost('/domain', {}, (data) => {

			domainName = '@' + data;

		})

	});

</script>

<main>
	
	<div class="adaptWidth flexCenterCol fillHeight gap">

		<!--Put a div so that there will be a gap from the flex at the top of the page-->
		<div></div>
		
		<div class="adaptWidthSmall" style="display: flex; align-items: center; flex-wrap: wrap; gap: 10px;">

			<select bind:value={selectedAddress} on:change={selectedAddressChange} style="flex: 1">

					{#each addresses as address}

						<option value={address.addr}>{address.addr}</option>

					{/each}

			</select>

			<span>{domainName}</span>

			<button on:keypress={copyClicked} on:click={copyClicked} style="padding-top: 0px; padding-bottom: 0px">Copy</button>
			<button on:click={openCompose} style="padding-top: 0px; padding-bottom: 0px; background-color: #007bff; color: white;">Compose</button>

		</div>

		<div class="adaptWidthSmall" style="display: flex; gap: 10px; margin-bottom: 10px;">
			<button on:click={showOverview} class:active={viewType === "overview"} class="tab-btn">Overview</button>
			<button on:click={showInboxEmails} class:active={viewType === "mails"} class="tab-btn">Inbox</button>
			<button on:click={showSentEmails} class:active={viewType === "sent"} class="tab-btn">Sent</button>
			{#if viewType === "mails"}
				<button on:click={clearInbox} class="clear-inbox-btn">Inbox leeren</button>
			{/if}
		</div>

		<div id="mailList" class="fillWidth">
			
			{#if viewType == 'overview'}

				<div class="overview-table">
					<table>
						<thead>
							<tr>
								<th>Address</th>
								<th>Mails</th>
								<th>Latest Subject</th>
								<th>Forwarding</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each addressOverview as item}
								<tr>
									<td class="address-cell">
										<strong>{item.address}</strong>{domainName}
									</td>
									<td class="count-cell">
										{item.mailCount}
									</td>
									<td class="subject-cell">
										{#if item.latestMail}
											<div class="latest-mail">
												<div class="subject">{item.latestMail.subject}</div>
												<div class="sender">from {item.latestMail.sender}</div>
											</div>
										{:else}
											<em>No emails</em>
										{/if}
									</td>
									<td class="forwarding-cell">
										<span class="forwarding-badge forwarding-{item.forwardingStatus}">
											{#if item.forwardingStatus === 'auto'}
												🔄 Auto ({item.forwardingCount})
											{:else if item.forwardingStatus === 'manual'}
												↩️ Manual ({item.forwardingCount})
											{:else}
												➖ None
											{/if}
										</span>
									</td>
									<td class="actions-cell">
										<button on:click={() => {selectedAddress = item.address; showInboxEmails();}} class="view-btn">View</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

			{/if}
			
			{#if viewType == 'mails'}

				{#if mails.length === 0}
					<div class="empty-list">No emails for this address yet.</div>
				{/if}

				{#each mails as mail}

					<div data-id={mail.id} on:keypress={mailClicked} on:click={mailClicked} role="button" tabindex="0" class="clickable mail-row">

						<div class="mail-row-main">
							<span class="mail-sender">{mail.sender}</span>
							<span class="mail-subject">{mail.subject}</span>
						</div>

						<div class="mail-row-meta">
							{#if mail.received_at}
								<small class="mail-time" title={new Date(mail.received_at.replace(' ', 'T') + 'Z').toLocaleString()}>{fmtTime(mail.received_at)}</small>
							{/if}
							<input data-id={mail.id} on:keypress={deleteClicked} on:click={deleteClicked} type="image" src="trashIcon.svg" alt="Delete" title="Delete this email" class="trash-btn">
						</div>

					</div>

					<div>
						<hr>
					</div>

				{/each}

			{/if}

			{#if viewType == 'sent'}

				{#if sentMails.length === 0}
					<div class="empty-list">No sent emails from this address yet.</div>
				{/if}

				{#each sentMails as mail}

					<div class="mail-row">
						<div class="mail-row-main">
							<span class="mail-sender"><strong>To:</strong> {mail.to_addr}</span>
							<span class="mail-subject">{mail.subject}</span>
						</div>
						<div class="mail-row-meta">
							<small class="mail-time" title={new Date(mail.sent_at.replace(' ', 'T') + 'Z').toLocaleString()}>{fmtTime(mail.sent_at)}</small>
						</div>
					</div>

					<div>
						<hr>
					</div>

				{/each}

			{/if}

			{#if viewType == 'mailData'}

				<span>{mailDataSender}</span>
				<div></div>
				<span>{mailDataSubject}</span>
				{#if mailDataRecipients && mailDataRecipients.length > 1}
					<div style="font-size: 0.9rem; color: #555; margin-top: 6px;">
						<strong>Original recipients:</strong> {mailDataRecipients.join(', ')}
					</div>
				{/if}

				<!--hr size inside flex is 0, gotta wrap with div, not sure why-->
				<div>
					<hr>
				</div>

				<iframe id="mailData" sandbox title="Mail content" style="background-color: white; overflow: auto; flex: 1; border: 0; width: 100%;">
				</iframe>

				<div style="height: 10px;"></div>
				<div style="display: flex; gap: 10px;">
					<button on:click={backClicked}>Back</button>
					<button on:click={() => forwardEmail(mails.find(m => m.sender === mailDataSender && m.subject === mailDataSubject)?.id)}>Forward</button>
				</div>

			{/if}

		</div>

		{#if viewType === 'mails' || viewType === 'sent'}
			<div class="pager">
				<button class="counter" on:click={prevPage} disabled={page <= 1}>❮</button>
				<span class="page-info">Page {page} of {totalPages}</span>
				<button class="counter" on:click={nextPage} disabled={page >= totalPages}>❯</button>
			</div>
		{/if}

		<button on:click={()=>{window.location.replace('/manage.html')}} class="adaptWidthSmall">Manage addresses</button>

		<!--Put a div so that there will be a gap from the flex at the top of the page-->
		<div></div>

	</div>

	{#if showCompose}
		<Compose {selectedAddress} {domainName} onClose={closeCompose} />
	{/if}
	
</main>

<style>
	.tab-btn {
		padding: 8px 16px;
		border: 1px solid #ccc;
		background-color: #f8f9fa;
		cursor: pointer;
		border-radius: 4px 4px 0 0;
	}

	.tab-btn.active {
		background-color: #007bff;
		color: white;
		border-color: #007bff;
	}

	.clear-inbox-btn {
		padding: 8px 16px;
		border: 1px solid #dc3545;
		background-color: #dc3545;
		color: white;
		cursor: pointer;
		border-radius: 4px;
		margin-left: auto;
	}

	.clear-inbox-btn:hover {
		background-color: #c82333;
		border-color: #c82333;
	}

	.overview-table {
		overflow-x: auto;
		margin: 10px;
	}

	.overview-table table {
		width: 100%;
		border-collapse: collapse;
		background-color: white;
		border-radius: 7px;
		overflow: hidden;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.overview-table th,
	.overview-table td {
		padding: 12px;
		text-align: left;
		border-bottom: 1px solid #e0e0e0;
	}

	.overview-table th {
		background-color: #f8f9fa;
		font-weight: bold;
		color: #495057;
	}

	.address-cell strong {
		color: #007bff;
	}

	.count-cell {
		font-weight: bold;
		color: #28a745;
	}

	.latest-mail .subject {
		font-weight: 500;
		margin-bottom: 2px;
	}

	.latest-mail .sender {
		font-size: 0.85rem;
		color: #6c757d;
	}

	.forwarding-badge {
		padding: 4px 8px;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: bold;
	}

	.forwarding-auto {
		background-color: #d4edda;
		color: #155724;
	}

	.forwarding-manual {
		background-color: #d1ecf1;
		color: #0c5460;
	}

	.forwarding-none {
		background-color: #f8d7da;
		color: #721c24;
	}

	.view-btn {
		padding: 6px 12px;
		background-color: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.view-btn:hover {
		background-color: #0056b3;
	}

	.mail-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 8px 4px;
	}

	.mail-row-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.mail-sender {
		font-weight: 600;
		font-size: 0.95rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.mail-subject {
		font-size: 0.9rem;
		color: #444;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.mail-row-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.mail-time {
		color: #6c757d;
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.trash-btn {
		width: 1.4rem;
		height: 1.4rem;
		padding: 6px;
		box-sizing: content-box;
		opacity: 0.6;
	}

	.trash-btn:hover {
		opacity: 1;
	}

	.empty-list {
		padding: 30px 10px;
		text-align: center;
		color: #6c757d;
		font-style: italic;
	}

	.pager {
		display: flex;
		align-items: center;
		gap: 12px;
		justify-content: center;
	}

	.page-info {
		font-size: 0.9rem;
		color: #555;
		min-width: 6em;
		text-align: center;
	}

	.counter:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	@media (prefers-color-scheme: dark) {
		.tab-btn {
			background-color: #333;
			color: white;
			border-color: #555;
		}

		.tab-btn.active {
			background-color: #007bff;
			border-color: #007bff;
		}

		.clear-inbox-btn {
			background-color: #dc3545;
			border-color: #dc3545;
		}

		.clear-inbox-btn:hover {
			background-color: #c82333;
			border-color: #c82333;
		}

		.overview-table table {
			background-color: #333;
		}

		.overview-table th {
			background-color: #444;
			color: #fff;
		}

		.overview-table td {
			border-bottom-color: #555;
		}

		.latest-mail .sender {
			color: #aaa;
		}

		.forwarding-auto {
			background-color: #0f3f0f;
			color: #90ee90;
		}

		.forwarding-manual {
			background-color: #0f2f3f;
			color: #87ceeb;
		}

		.forwarding-none {
			background-color: #3f0f0f;
			color: #ffb3b3;
		}

		.mail-subject {
			color: #bbb;
		}

		.mail-time {
			color: #999;
		}

		.empty-list {
			color: #888;
		}

		.page-info {
			color: #bbb;
		}
	}
</style>
