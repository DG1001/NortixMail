<script>
	import f from './helper.js'
	import dialog from './lib/dialog.js'

	export let selectedAddress;
	export let domainName;
	export let onClose;

	let toAddr = "";
	let subject = "";
	let content = "";
	let sending = false;

	function sendEmail() {

		if (!toAddr || !subject || !content) {
			dialog.alrt("Please fill in all fields");
			return;
		}

		sending = true;

		f.fetchPost('/sendEmail', {
			fromAddr: selectedAddress,
			toAddr: toAddr,
			subject: subject,
			content: content
		}, (response) => {

			sending = false;

			if (response.success) {
				dialog.alrt("Email sent successfully!", () => {
					onClose();
				});
			} else {
				dialog.alrt("Failed to send email: " + (response.error || "Unknown error"));
			}

		});

	}

	function cancel() {
		onClose();
	}

</script>

<div class="compose-modal">
	<div class="compose-container">
		
		<div class="compose-header">
			<h3>Compose Email</h3>
			<button on:click={cancel} class="close-btn">×</button>
		</div>

		<div class="compose-form">
			
			<div class="form-row">
				<label>From:</label>
				<span class="from-address">{selectedAddress}{domainName}</span>
			</div>

			<div class="warning-notice">
				⚠️ <strong>Note:</strong> This email will be sent via your configured SMTP server. The recipient will see your SMTP server's email address as the sender, not the disposable address above.
			</div>

			<div class="form-row">
				<label for="to">To:</label>
				<input id="to" bind:value={toAddr} placeholder="recipient@example.com" type="email" required>
			</div>

			<div class="form-row">
				<label for="subject">Subject:</label>
				<input id="subject" bind:value={subject} placeholder="Email subject" required>
			</div>

			<div class="form-row">
				<label for="content">Message:</label>
				<textarea id="content" bind:value={content} placeholder="Type your message here..." rows="10" required></textarea>
			</div>

			<div class="form-actions">
				<button on:click={sendEmail} disabled={sending} class="send-btn">
					{sending ? "Sending..." : "Send"}
				</button>
				<button on:click={cancel} class="cancel-btn">Cancel</button>
			</div>

		</div>

	</div>
</div>

<style>
	.compose-modal {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.compose-container {
		background-color: white;
		border-radius: 7px;
		width: min(600px, calc(100% - 40px));
		max-height: calc(100% - 40px);
		overflow: auto;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.compose-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 15px 20px;
		border-bottom: 1px solid #e0e0e0;
	}

	.compose-header h3 {
		margin: 0;
		font-size: 1.25rem;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.compose-form {
		padding: 20px;
	}

	.form-row {
		margin-bottom: 15px;
		display: flex;
		flex-direction: column;
	}

	.warning-notice {
		background-color: #fff3cd;
		border: 1px solid #ffeaa7;
		border-radius: 4px;
		padding: 10px;
		margin-bottom: 15px;
		font-size: 0.9rem;
		color: #856404;
	}

	.form-row label {
		font-weight: bold;
		margin-bottom: 5px;
	}

	.from-address {
		background-color: #f5f5f5;
		padding: 8px;
		border-radius: 4px;
		color: #666;
	}

	input, textarea {
		padding: 8px;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 1rem;
		font-family: inherit;
	}

	textarea {
		resize: vertical;
		min-height: 120px;
	}

	.form-actions {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
		margin-top: 20px;
	}

	.send-btn {
		background-color: #007bff;
		color: white;
		border: none;
		padding: 10px 20px;
		border-radius: 4px;
		cursor: pointer;
	}

	.send-btn:disabled {
		background-color: #6c757d;
		cursor: not-allowed;
	}

	.cancel-btn {
		background-color: #6c757d;
		color: white;
		border: none;
		padding: 10px 20px;
		border-radius: 4px;
		cursor: pointer;
	}

	@media (prefers-color-scheme: dark) {
		.compose-container {
			background-color: rgb(15,15,15);
			color: white;
		}

		.compose-header {
			border-bottom: 1px solid #555;
		}

		.from-address {
			background-color: #333;
			color: #ccc;
		}

		input, textarea {
			background-color: rgb(15,15,15);
			color: white;
			border: 1px solid #555;
		}

		.warning-notice {
			background-color: #3d3d00;
			border-color: #666600;
			color: #ffff99;
		}
	}
</style>