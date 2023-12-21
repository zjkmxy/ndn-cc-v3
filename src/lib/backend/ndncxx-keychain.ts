/* eslint-disable @typescript-eslint/no-unused-vars */
import { Certificate, ECDSA, KeyChain, KeyStore, RSA } from '@ndn/keychain';
import { Data, Name } from '@ndn/packet';
import { Decoder, Encoder } from '@ndn/tlv';
import initSqlJs, { type Database } from 'sql.js';

let SQL: initSqlJs.SqlJsStatic;
initSqlJs().then((SQLVal) => (SQL = SQLVal));

/** Access ndn-cxx KeyChain. */
export class NdncxxKeyChain extends KeyChain {
	override readonly needJwk = false;
	protected readonly db: Database;

	constructor(
		sqliteFile: Uint8Array,
		public readonly readFsTpm?: (filename: string) => Promise<Uint8Array>,
		public readonly writePibFile?: (content: Uint8Array) => Promise<void>
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
		if (!this.writePibFile) {
			throw new Error('PIB is readonly.');
		}
		// TODO
	}

	override async insertKey(name: Name, stored: KeyStore.StoredKey): Promise<void> {
		throw new Error('Method not implemented.');
	}
}
