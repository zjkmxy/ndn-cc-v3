<script lang="ts">
	import { signatureTypeRepr } from '$lib/backend/enums';
	import { NdncxxKeyChain } from '$lib/backend/ndncxx-keychain';
	import { AltUri } from '@ndn/naming-convention2';

	type CertData = {
		notBefore: string;
		notAfter: string;
		issuer: string;
		signatureType: string | number;
	};

	type KeyData = {
		certs: Record<string, CertData>;
	};

	type IdentityData = {
		keys: Record<string, KeyData>;
	};

	let fileSystemSupported = typeof window.showDirectoryPicker === 'function';
	let rootHandle: FileSystemDirectoryHandle;
	let keyChain: NdncxxKeyChain | undefined = undefined;
	let certList: Record<string, IdentityData> = {};

	const onMapFolder = async () => {
		if (!fileSystemSupported) {
			console.error('Browser does not support File System Access API. Please use Chrome or Edge 119+.');
			return;
		}
		try {
			rootHandle = await window.showDirectoryPicker({ mode: 'read' });
		} catch (err) {
			window.alert(`Failed to open target folder: ${err}`);
			return;
		}

		keyChain = new NdncxxKeyChain(async () => {
			const handle = await rootHandle.getFileHandle('pib.db', {});
			const file = await handle.getFile();
			return new Uint8Array(await file.arrayBuffer());
		});

		await obtainList();
	};

	const obtainList = async () => {
		if (!keyChain) {
			return;
		}
		// Assume every key has at least a self-signed certificate
		const certNames = await keyChain.listCerts();
		const ret: Record<string, IdentityData> = {};
		for (const certName of certNames) {
			if (certName.length <= 4) {
				continue;
			}
			let cert;
			try {
				cert = await keyChain.getCert(certName);
			} catch {
				continue;
			}
			const keyName = AltUri.ofName(certName.getPrefix(certName.length - 2));
			const identityName = AltUri.ofName(certName.getPrefix(certName.length - 4));
			const certNameStr = AltUri.ofName(certName);
			if (!ret[identityName]) {
				ret[identityName] = { keys: {} };
			}
			if (!ret[identityName].keys[keyName]) {
				ret[identityName].keys[keyName] = { certs: {} };
			}
			const keyLocator = cert.data.sigInfo.keyLocator?.name;
			const sigType = signatureTypeRepr(cert.data.sigInfo.type);
			const issuer = cert.issuer;
			ret[identityName].keys[keyName].certs[certNameStr] = {
				notBefore: new Date(cert.validity.notBefore).toLocaleString(),
				notAfter: new Date(cert.validity.notAfter).toLocaleString(),
				issuer: issuer ? AltUri.ofName(issuer) : 'N/A',
				signatureType: sigType
			};
		}
		certList = ret;
	};
</script>

<svelte:head>
	<title>Key Management</title>
</svelte:head>

<section>
	<div class="header">
		<h1>Key Management (Chrome/Edge)</h1>
	</div>
	<div class="content">
		<button on:click={onMapFolder}>Pick .ndn Folder</button>
		<p />
		{#each Object.entries(certList) as [idName, idObj]}
			<details>
				<summary>{idName}</summary>
				<p class="lv1">
					<!-- <a href="ndnsec-delete?name={idName}">Delete Identity</a><br> -->
					<b>Keys:</b>
					<!-- <a href="ndnsec-keygen?name={idName}">Add Key</a> -->
				</p>
				{#each Object.entries(idObj.keys) as [keyName, keyObj]}
					<details class="lv1">
						<summary>{keyName}</summary>
						<p class="lv2">
							<!-- <a href="ndnsec-delete?name={keyName}&type=k">Delete Key</a><br> -->
							<!-- <b>KeyType:</b> { keyObj.keyType }<br> -->
							<b>Certificates:</b>
						</p>
						{#each Object.entries(keyObj.certs) as [certName, certObj]}
							<details class="lv2">
								<summary>{certName}</summary>
								<p class="lv3">
									<!-- <a href="ndnsec-delete?name={certName}&type=c">Delete Certificate</a><br /> -->
									<b>Validity NotBefore:</b>
									{certObj.notBefore}<br />
									<b>Validity NotAfter:</b>
									{certObj.notAfter}<br />
									<b>Issuer:</b>
									{certObj.issuer}<br />
									<b>SignatureType:</b>
									{certObj.signatureType}<br />
								</p>
							</details>
						{/each}
					</details>
				{/each}
			</details>
		{/each}
		<form class="pure-form" action="ndnsec-keygen" method="get">
			<p>
				<label for="name">Name</label>
				<input type="text" name="name" id="name" />
			</p>
			<p>
				<button type="submit">Create Identity</button>
			</p>
		</form>
	</div>
</section>

<style type="text/css">
	.lv1 {
		margin-left: 15px;
	}

	.lv2 {
		margin-left: 30px;
	}

	.lv3 {
		margin-left: 45px;
	}
</style>
