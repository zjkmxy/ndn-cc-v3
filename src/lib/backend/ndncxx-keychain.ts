/* eslint-disable @typescript-eslint/no-unused-vars */
import { Certificate, ECDSA, KeyChain, KeyStore, RSA, generateSigningKey } from '@ndn/keychain';
import { Component, Data, Name } from '@ndn/packet';
import { Decoder, Encoder } from '@ndn/tlv';
import initSqlJs, { type Database } from 'sql.js';
import { bytesToBase64 } from './base64';

let SQL: initSqlJs.SqlJsStatic;
initSqlJs().then((SQLVal) => (SQL = SQLVal));

/** Access ndn-cxx KeyChain. */
export class NdncxxKeyChain extends KeyChain {
	// NDNts forces this to be true. Or it will not give you a valid persistable key.
	// https://github.com/yoursunny/NDNts/blob/41f4db68260baf4601b81fd52b34e5e3f8c6cbfa/packages/keychain/src/key/impl-generate.ts#L25
	override readonly needJwk = true;
	protected readonly db: Database;

	constructor(
		sqliteFile: Uint8Array,
		public readonly readFsTpm?: (filename: string) => Promise<Uint8Array>,
		public readonly writePibFile?: (content: Uint8Array) => Promise<void>,
		public readonly writeFsTpm?: (filename: string, pkcs8: Uint8Array) => Promise<void>
	) {
		super();
		this.db = new SQL.Database(sqliteFile);
	}

	destroy() {
		this.db.close();
	}

	async listIdentities(): Promise<Name[]> {
		const idNames = this.db.exec('SELECT identity FROM identities')[0];
		return idNames.values.map((values) => {
			const keyName = values[0]?.valueOf() as Uint8Array;
			return Decoder.decode(keyName, Name);
		});
	}

	override async listKeys(prefix?: Name | undefined): Promise<Name[]> {
		const keyNames = this.db.exec('SELECT key_name FROM keys')[0];
		const ret = keyNames.values.map((values) => {
			const keyName = values[0]?.valueOf() as Uint8Array;
			return Decoder.decode(keyName, Name);
		});
		if (prefix) {
			return ret.filter((v) => prefix.isPrefixOf(v));
		} else {
			return ret;
		}
	}

	override async listCerts(prefix?: Name | undefined): Promise<Name[]> {
		const certNames = this.db.exec('SELECT certificate_name FROM certificates')[0];
		const ret = certNames.values.map((values) => {
			const certName = values[0]?.valueOf() as Uint8Array;
			return Decoder.decode(certName, Name);
		});
		if (prefix) {
			return ret.filter((v) => prefix.isPrefixOf(v));
		} else {
			return ret;
		}
	}

	override async getCert(name: Name): Promise<Certificate> {
		const certs = this.db.exec('SELECT certificate_data FROM certificates WHERE certificate_name=:name', {
			':name': Encoder.encode(name)
		})[0];
		if (!certs || certs.values.length <= 0) {
			throw new Error(`Certificate not existing: ${name.toString()}`);
		}
		const certBytes = certs.values[0][0]?.valueOf() as Uint8Array;
		const certData = Decoder.decode(certBytes, Data);
		return Certificate.fromData(certData);
	}

	static async prvKeyFileName(name: Name): Promise<string> {
		const digest = await crypto.subtle.digest('SHA-256', Encoder.encode(name));
		const hexDigest = [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, '0')).join('');
		return `${hexDigest}.privkey`;
	}

	static async importSpki(pkcs8: Uint8Array, spki: Uint8Array) {
		// This works for PKCS8 only, not the DER format used in the file TPM.
		for (const algo of [ECDSA, RSA]) {
			try {
				return {
					algo: algo,
					keyPair: await algo.cryptoGenerate(
						{
							importPkcs8: [pkcs8, spki]
						},
						true
					)
				};
			} catch (e) {
				continue;
			}
		}
		throw new Error('Unrecognized key algorthm');
	}

	override async getKeyPair(name: Name): Promise<KeyChain.KeyPair> {
		if (!this.readFsTpm) {
			throw new Error('You must provde FileTPM reader function to use this.');
		}
		const keys = this.db.exec('SELECT key_bits FROM keys WHERE key_name=:name', {
			':name': Encoder.encode(name)
		})[0];

		if (!keys || keys.values.length <= 0) {
			throw new Error(`Key not existing: ${name.toString()}`);
		}
		const pubKeyBits = keys.values[0][0]?.valueOf() as Uint8Array;
		const tpmFileName = await NdncxxKeyChain.prvKeyFileName(name);
		const priKeyBits = await this.readFsTpm(tpmFileName);
		const { algo, keyPair } = await NdncxxKeyChain.importSpki(priKeyBits, pubKeyBits);
		return new KeyStore.KeyPair(name, algo, keyPair, keyPair);
	}

	override async deleteCert(name: Name): Promise<void> {
		if (!this.writePibFile) {
			throw new Error('PIB is readonly.');
		}
		this.db.run('DELETE FROM certificates WHERE certificate_name=:name', {
			':name': Encoder.encode(name)
		});
		await this.writePibFile(this.db.export());
	}

	override async deleteKey(name: Name): Promise<void> {
		if (!this.writePibFile) {
			throw new Error('PIB is readonly.');
		}
		this.db.run('DELETE FROM keys WHERE key_name=:name', {
			':name': Encoder.encode(name)
		});
		// TODO: This does not delete TPM
		await this.writePibFile(this.db.export());
	}

	async deleteIdentity(name: Name): Promise<void> {
		if (!this.writePibFile) {
			throw new Error('PIB is readonly.');
		}
		this.db.run('DELETE FROM identities WHERE identity=:name', {
			':name': Encoder.encode(name)
		});
		await this.writePibFile(this.db.export());
	}

	override async insertCert(cert: Certificate): Promise<void> {
		if (!this.writePibFile) {
			throw new Error('PIB is readonly.');
		}
		const certNameWire = Encoder.encode(cert.name);
		const keyNameWire = Encoder.encode(cert.name.getPrefix(cert.name.length - 2));
		const certWire = Encoder.encode(cert.data);
		this.db.run(
			'INSERT INTO certificates (key_id, certificate_name, certificate_data)' +
				'VALUES ((SELECT id FROM keys WHERE key_name=:keyname), :certname, :certwire)',
			{
				':keyname': keyNameWire,
				':certname': certNameWire,
				':certwire': certWire
			}
		);
		await this.writePibFile(this.db.export());
	}

	async newKey(identityName: Name): Promise<void> {
		if (!this.writePibFile || !this.writeFsTpm) {
			throw new Error('PIB or TPM is readonly.');
		}
		// const randomKeyId = new Uint8Array(8)
		// crypto.getRandomValues(randomKeyId);
		// const keyName = identityName.append('KEY', new Component(8, randomKeyId));
		const [privateKey, publicKey] = await generateSigningKey(this, identityName, ECDSA);
		const certificate = await Certificate.selfSign({ privateKey, publicKey });
		await this.insertCert(certificate);
	}

	override async insertKey(name: Name, stored: KeyStore.StoredKey): Promise<void> {
		if (!this.writeFsTpm || !this.writePibFile) {
			throw new Error('PIB or TPM is readonly.');
		}
		const tpmFileName = await NdncxxKeyChain.prvKeyFileName(name);
		const prvKeyJwk = stored.privateKey as JsonWebKey;
		const spki = stored.publicKeySpki as Uint8Array;

		// Write private key
		const prvKey = await crypto.subtle.importKey(
			'jwk',
			prvKeyJwk,
			{
				name: 'ECDSA',
				namedCurve: 'P-256'
			},
			true,
			['sign']
		);
		const pkcs8 = await crypto.subtle.exportKey('pkcs8', prvKey);
		await this.writeFsTpm(tpmFileName, new Uint8Array(pkcs8));

		// Touch identity
		let ids = this.db.exec('SELECT id FROM identities WHERE identity=:name', {
			':name': Encoder.encode(name.getPrefix(name.length - 2))
		})[0];
		if (!ids || ids.values.length <= 0) {
			// Identity not existing
			this.db.run('INSERT INTO identities (identity) VALUES (:name)', {
				':name': Encoder.encode(name.getPrefix(name.length - 2))
			});
			ids = this.db.exec('SELECT id FROM identities WHERE identity=:name', {
				':name': Encoder.encode(name.getPrefix(name.length - 2))
			})[0];
		}
		const rowId = ids.values[0][0]?.valueOf() as number;

		// Insert public key
		this.db.run('INSERT INTO keys (identity_id, key_name, key_bits) VALUES (:rowid, :keyname, :keywire)', {
			':rowid': rowId,
			':keyname': Encoder.encode(name),
			// TODO: Due to unknown reason, spki cannot be parsed by this app only.
			':keywire': spki
		});
		await this.writePibFile(this.db.export());
	}
}
