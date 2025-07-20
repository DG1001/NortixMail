<script>

	import { onMount } from 'svelte';
	import f from './helper.js'
	import dialog from './lib/dialog.js'
	dialog.init();

	let hostName = '@' + window.location.host;
	let addresses = [];

	let selectedAddress = null;
	let newAddressText = "";
	
	let forwardingRules = [];
	let newForwardingTarget = "";
	let autoForward = false;

	function refreshAddress(){

		f.fetchPost('/addresses', {}, (data) => {

			addresses = data.addresses;
			if (data.addresses.length > 0){
			
				selectedAddress = data.addresses[data.addresses.length-1].addr;
				refreshForwardingRules();

			}

		});

	}

	function refreshForwardingRules(){

		if (!selectedAddress) return;

		f.fetchPost('/getForwardingRules', {sourceAddr: selectedAddress}, (data) => {

			forwardingRules = data;

		});

	}

	function selectedAddressChanged(){

		refreshForwardingRules();

	}

	function addAddress(){

		const regex = /^(?!\.)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]{1,64}$/;
		if(regex.test(newAddressText)){

			f.fetchPost('/addAddress', {address: newAddressText}, (data) => {

				if(data == "exist"){
					
					dialog.alrt("address already exist");

				}

				if(data == "done"){
				
					newAddressText = "";
					refreshAddress();

				}

			});

		}else{

			dialog.alrt("Invalid email address");

		}

	}

	function deleteAddress(){

		dialog.conf("Delete this address ?", (res) => {

			if(res){

				f.fetchPost('./deleteAddress', {address: selectedAddress}, (data) => {

					if(data == "done"){

						refreshAddress();

					}	

				});

			}

		})

	}

	function deleteEmails(){

		dialog.conf("Delete all emails from this address ?", (res) => {

			if(res){

				f.fetchPost('./deleteEmails', {address: selectedAddress}, (data) => {

					if(data == "done"){

						dialog.alrt("Done")

					}	

				});

			}

		})

	}

	function addForwardingRule(){

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if(!emailRegex.test(newForwardingTarget)){
			dialog.alrt("Invalid email address");
			return;
		}

		f.fetchPost('/addForwardingRule', {
			sourceAddr: selectedAddress,
			targetAddr: newForwardingTarget,
			autoForward: autoForward
		}, (data) => {

			if(data == "exist"){
				dialog.alrt("Forwarding rule already exists");
			}

			if(data == "done"){
				newForwardingTarget = "";
				autoForward = false;
				refreshForwardingRules();
			}

		});

	}

	function deleteForwardingRule(ruleId){

		dialog.conf("Delete this forwarding rule?", (res) => {

			if(res){

				f.fetchPost('/deleteForwardingRule', {id: ruleId}, (data) => {

					if(data == "done"){
						refreshForwardingRules();
					}

				});

			}

		});

	}

	onMount(() => {

		refreshAddress();

	});


</script>

<main>

	<div class="adaptWidth flexCenterCol fillHeight gap">

		<div></div>

		<!--New mails-->
		<span>New address</span>
		<div class="adaptWidthSmall" style="display: flex; flex-wrap: wrap">

			<input bind:value={newAddressText} placeholder="New address" style="flex: 1">
			<span>{hostName}</span>

		</div>
		<button on:click={addAddress} class="adaptWidthSmall">Add this address</button>
		
		<div style="height: 30px;"></div>

		<!--List of existing addresses-->
		<span>Manage addresses</span>
		<div class="adaptWidthSmall" style="display: flex; flex-wrap: wrap">

			<select bind:value={selectedAddress} on:change={selectedAddressChanged} style="flex: 1">

				{#each addresses as address}

					<option value={address.addr}>{address.addr}</option>

				{/each}

			</select>

			<span>{hostName}</span>

		</div>

		<!--Delete selected address-->
		<button disabled={addresses.length == 0} on:click={deleteAddress} class="adaptWidthSmall">Delete this address</button>
		<button disabled={addresses.length == 0} on:click={deleteEmails} class="adaptWidthSmall">Delete all emails from this address</button>
		
		<div style="height: 30px;"></div>

		<!--Forwarding Rules-->
		{#if selectedAddress}
			<span>Email Forwarding</span>
			
			<!--Add new forwarding rule-->
			<div class="adaptWidthSmall" style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
				<input bind:value={newForwardingTarget} placeholder="Forward to email" style="flex: 1" type="email">
				<label style="display: flex; align-items: center; gap: 5px;">
					<input type="checkbox" bind:checked={autoForward}>
					Auto-forward
				</label>
			</div>
			<button on:click={addForwardingRule} class="adaptWidthSmall">Add forwarding rule</button>

			<!--List existing forwarding rules-->
			{#if forwardingRules.length > 0}
				<div class="adaptWidthSmall forwarding-rules">
					<strong>Active forwarding rules:</strong>
					{#each forwardingRules as rule}
						<div class="rule-item">
							<span>{rule.target_addr}</span>
							<span class="auto-forward-status">{rule.auto_forward ? "Auto" : "Manual"}</span>
							<button on:click={() => deleteForwardingRule(rule.id)} class="delete-rule-btn">Delete</button>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
		
		<div style="flex: 1"></div>
			<button on:click={()=>{window.location.replace('/')}} class="adaptWidthSmall" style="justify-content: flex-end">Back</button>
		<div></div>

	</div>

</main>

<style>
	.forwarding-rules {
		margin-top: 15px;
		padding: 10px;
		border: 1px solid #ddd;
		border-radius: 5px;
		background-color: #f9f9f9;
	}

	.rule-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 0;
		border-bottom: 1px solid #eee;
	}

	.rule-item:last-child {
		border-bottom: none;
	}

	.auto-forward-status {
		background-color: #e7f3ff;
		color: #0066cc;
		padding: 2px 8px;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: bold;
	}

	.delete-rule-btn {
		background-color: #dc3545;
		color: white;
		border: none;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
	}

	@media (prefers-color-scheme: dark) {
		.forwarding-rules {
			background-color: #333;
			border-color: #555;
		}

		.rule-item {
			border-bottom-color: #555;
		}

		.auto-forward-status {
			background-color: #1a4d7a;
			color: #87ceeb;
		}
	}
</style>
