<script lang="ts">
	import { base64ToBytes, bytesToBase64 } from '$lib/backend/base64';
	import { DerKeyConverter } from '$lib/backend/derkey-converter';
	import { signatureTypeRepr } from '$lib/backend/enums';
	import { NdncxxKeyChain } from '$lib/backend/ndncxx-keychain';
	import { ECDSA } from '@ndn/keychain';
	import { AltUri } from '@ndn/naming-convention2';
	import { onDestroy } from 'svelte';

	type CertData = {
		notBefore: string;
		notAfter: string;
		issuer: string;
		signatureType: string | number;
	};

	type KeyData = {
		keyType: string;
		certs: Record<string, CertData>;
	};

	type IdentityData = {
		keys: Record<string, KeyData>;
	};

	const converter = new DerKeyConverter('openssl.wasm');

	let fileSystemSupported = typeof window.showDirectoryPicker === 'function';
	let rootHandle: FileSystemDirectoryHandle;
	let keyChain: NdncxxKeyChain | undefined = undefined;
	let certList: Record<string, IdentityData> = {};
	let newIdName = '';

	onDestroy(() => {
		keyChain?.destroy();
	});

	const onMapFolder = async () => {
		if (!fileSystemSupported) {
			window.alert('Browser does not support File System Access API. Please use Chrome or Edge 119+.');
			return;
		}
		try {
			rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
		} catch (err) {
			window.alert(`Failed to open target folder: ${err}`);
			return;
		}

		await createKeychain();
	};

	const createKeychain = async () => {
		// const writable = (await rootHandle.queryPermission({ mode: 'readwrite' })) === 'granted';

		keyChain?.destroy();

		const pibFile = await (async () => {
			const handle = await rootHandle.getFileHandle('pib.db', {});
			const file = await handle.getFile();
			return new Uint8Array(await file.arrayBuffer());
		})();

		keyChain = new NdncxxKeyChain(
			pibFile,
			async (filename) => {
				const dirHandle = await rootHandle.getDirectoryHandle('ndnsec-key-file', {});
				const fileHandle = await dirHandle.getFileHandle(filename, {});
				const file = await fileHandle.getFile();
				const b64 = await file.text();
				const pkcs8B64 = await converter.convertBlind(b64);
				return base64ToBytes(pkcs8B64);
			},
			async (pibContent) => {
				const handle = await rootHandle.getFileHandle('pib.db', {});
				const writable = await handle.createWritable({ keepExistingData: false });
				await writable.write(pibContent);
				await writable.close();
			},
			async (filename, pkcs8) => {
				const dirHandle = await rootHandle.getDirectoryHandle('ndnsec-key-file', {});
				const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
				const writable = await fileHandle.createWritable({ keepExistingData: false });
				const b64 = bytesToBase64(pkcs8);
				let b64Breaks = b64.replace(/(.{64})/g, '$1\n');
				if (b64Breaks[b64Breaks.length - 1] !== '\n') {
					b64Breaks += '\n';
				}
				const pemB64 = await converter.toEcPem(b64Breaks);
				await writable.write(pemB64);
				await writable.close();
			}
		);

		await obtainList();
	};

	const obtainList = async () => {
		if (!keyChain) {
			return;
		}
		const idNames = await keyChain.listIdentities();
		const keyNames = await keyChain.listKeys();
		const certNames = await keyChain.listCerts();
		const ret: Record<string, IdentityData> = {};

		for (const identityName of idNames) {
			const identityNameStr = AltUri.ofName(identityName);
			ret[identityNameStr] = { keys: {} };
		}
		for (const keyName of keyNames) {
			if (keyName.length <= 2) {
				continue;
			}
			let keyPair;
			try {
				keyPair = await keyChain.getKeyPair(keyName);
			} catch (e) {
				console.error(`Unable to obtain key: ${keyName.toString()}: ${e}`);
				continue;
			}
			const keyNameStr = AltUri.ofName(keyName);
			const identityName = AltUri.ofName(keyName.getPrefix(keyName.length - 2));
			const keyType = keyPair.algo === ECDSA ? 'ECDSA' : 'RSA';
			if (!ret[identityName]) {
				continue;
			}
			ret[identityName].keys[keyNameStr] = {
				keyType: keyType,
				certs: {}
			};
		}
		for (const certName of certNames) {
			if (certName.length <= 4) {
				continue;
			}
			let cert;
			try {
				cert = await keyChain.getCert(certName);
			} catch (e) {
				console.error(`Unable to obtain cert: ${certName.toString()}: ${e}`);
				continue;
			}
			const keyName = AltUri.ofName(certName.getPrefix(certName.length - 2));
			const identityName = AltUri.ofName(certName.getPrefix(certName.length - 4));
			const certNameStr = AltUri.ofName(certName);
			if (!ret[identityName] || !ret[identityName].keys[keyName]) {
				continue;
			}
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

	const deleteCert = async (name: string) => {
		await keyChain?.deleteCert(AltUri.parseName(name));
		await createKeychain();
	};

	const deleteKey = async (name: string) => {
		await keyChain?.deleteKey(AltUri.parseName(name));
		await createKeychain();
	};

	const deleteIdentity = async (name: string) => {
		await keyChain?.deleteIdentity(AltUri.parseName(name));
		await createKeychain();
	};

	const newKey = async (name: string) => {
		await keyChain?.newKey(AltUri.parseName(name));
		await createKeychain();
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
					<button on:click={() => deleteIdentity(idName)}>Delete Identity</button><br />
					<b>Keys:</b>
					<button on:click={() => newKey(idName)}>Add Key</button>
				</p>
				{#each Object.entries(idObj.keys) as [keyName, keyObj]}
					<details class="lv1">
						<summary>{keyName}</summary>
						<p class="lv2">
							<button on:click={() => deleteKey(keyName)}>Delete Key</button><br />
							<b>KeyType:</b>
							{keyObj.keyType}<br />
							<b>Certificates:</b>
						</p>
						{#each Object.entries(keyObj.certs) as [certName, certObj]}
							<details class="lv2">
								<summary>{certName}</summary>
								<p class="lv3">
									<button on:click={() => deleteCert(certName)}>Delete Cert</button><br />
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
		<div class="pure-form">
			<p>
				<label for="name">Name</label>
				<input type="text" name="name" id="name" bind:value={newIdName} />
			</p>
			<p>
				<button on:click={() => newKey(newIdName)}>Create Identity</button>
			</p>
		</div>
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
