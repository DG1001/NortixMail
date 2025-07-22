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
	let viewType = "overview"; // "mails", "sent", "mailData", "overview"
	let showCompose = false;
	let addressOverview = [];

	let mailDataSender;
	let mailDataSubject;

	function refreshMails(){

		if (viewType === "sent") {
			f.fetchPost('/sentMails', {addr: selectedAddress, page: page}, (data) => {
				sentMails = data;
			});
		} else {
			f.fetchPost('/mails', {addr: selectedAddress, page: page}, (data) => {
				mails = data;
			});
		}

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

				viewType = 'mailData';

				waitForElement("#mailData").then((element)=>{

					const shadowRoot = element.attachShadow({ mode: 'open' });
					shadowRoot.innerHTML = data.content;

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
		viewType = "mails"

	}

	function nextPage(){

		let currentList = viewType === "sent" ? sentMails : mails;
		if(currentList.length > 0){
			page += 1;
			refreshMails();
		}
	}

	function prevPage(){
		
		if(page > 1){

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

				{#each mails as mail}

					<div data-id={mail.id} on:keypress={mailClicked} on:click={mailClicked} role="button" tabindex="0" class="clickable" style="display: flex; align-items: center; justify-content: space-between">

						<div> 

							<span>{mail.sender}</span>
							<div></div>
							<span>{mail.subject}</span>

						</div>

						<div style="display: flex; gap: 10px; align-items: center;">
							<button on:click={(e) => {e.stopPropagation(); forwardEmail(mail.id);}} style="padding: 5px 10px; font-size: 0.8rem;">Forward</button>
							<input data-id={mail.id} on:keypress={deleteClicked} on:click={deleteClicked} type="image" src="trashIcon.svg" alt="X" style="width: 2rem; height: 2rem; padding: 1rem">
						</div>

					</div>
					
					<!--hr size inside flex is 0, gotta wrap with div, not sure why-->
					<div>
						<hr>
					</div>

				{/each}

			{/if}

			{#if viewType == 'sent'}

				{#each sentMails as mail}

					<div style="display: flex; align-items: center; justify-content: space-between; padding: 10px;">

						<div> 

							<span><strong>To:</strong> {mail.to_addr}</span>
							<div></div>
							<span>{mail.subject}</span>
							<div></div>
							<small style="color: #666;">{new Date(mail.sent_at).toLocaleString()}</small>

						</div>

					</div>
					
					<!--hr size inside flex is 0, gotta wrap with div, not sure why-->
					<div>
						<hr>
					</div>

				{/each}

			{/if}

			{#if viewType == 'mailData'}

				<span>{mailDataSender}</span>
				<div></div>
				<span>{mailDataSubject}</span>

				<!--hr size inside flex is 0, gotta wrap with div, not sure why-->
				<div>
					<hr>
				</div>

				<div id="mailData" style="all: initial; background-color: white; overflow: auto; flex: 1">
				</div>

				<div style="height: 10px;"></div>
				<div style="display: flex; gap: 10px;">
					<button on:click={backClicked}>Back</button>
					<button on:click={() => forwardEmail(mails.find(m => m.sender === mailDataSender && m.subject === mailDataSubject)?.id)}>Forward</button>
				</div>

			{/if}

		</div>

		<div>
			<button class="counter" on:click={prevPage}>❮</button>
			<span>{page}</span>
			<button class="counter" on:click={nextPage}>❯</button>
		</div>

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
	}
</style>
