/* eslint-disable @typescript-eslint/no-unused-vars */
import { Certificate, ECDSA, KeyChain, KeyStore, RSA } from '@ndn/keychain';
import { Data, Name } from '@ndn/packet';
import { Decoder, Encoder } from '@ndn/tlv';
import initSqlJs from 'sql.js';

let SQL: initSqlJs.SqlJsStatic;
initSqlJs().then((SQLVal) => (SQL = SQLVal));

/** Access ndn-cxx KeyChain. */
export class NdncxxKeyChain extends KeyChain {
	override readonly needJwk = true;

	constructor(
		public readonly readPib: () => Promise<Uint8Array>
		// public readonly writePib: (value: Uint8Array) => Promise<void>
	) {
		super();
	}

	override async listKeys(prefix?: Name | undefined): Promise<Name[]> {
		const sqliteFile = await this.readPib();
		const db = new SQL.Database(sqliteFile);
		const keyNames = db.exec('SELECT key_name FROM keys')[0];
		const ret = keyNames.values.map((values) => {
			const keyName = values[0]?.valueOf() as Uint8Array;
			return Decoder.decode(keyName, Name);
		});
		db.close();
		if (prefix) {
			return ret.filter((v) => prefix.isPrefixOf(v));
		} else {
			return ret;
		}
	}

	override async listCerts(prefix?: Name | undefined): Promise<Name[]> {
		const sqliteFile = await this.readPib();
		const db = new SQL.Database(sqliteFile);
		const certNames = db.exec('SELECT certificate_name FROM certificates')[0];
		const ret = certNames.values.map((values) => {
			const certName = values[0]?.valueOf() as Uint8Array;
			return Decoder.decode(certName, Name);
		});
		db.close();
		if (prefix) {
			return ret.filter((v) => prefix.isPrefixOf(v));
		} else {
			return ret;
		}
	}

	override async getCert(name: Name): Promise<Certificate> {
		const sqliteFile = await this.readPib();
		const db = new SQL.Database(sqliteFile);
		const certs = db.exec('SELECT certificate_data FROM certificates WHERE certificate_name=:name', {
			':name': Encoder.encode(name)
		})[0];
		db.close();
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
				console.log(e);
				continue;
			}
		}
		throw new Error('Unrecognized key algorthm');
	}

	override async getKeyPair(name: Name): Promise<KeyChain.KeyPair> {
		throw new Error('Method not implemented.');
	}

	override async insertKey(name: Name, stored: KeyStore.StoredKey): Promise<void> {
		throw new Error('Method not implemented.');
	}
	override async deleteKey(name: Name): Promise<void> {
		throw new Error('Method not implemented.');
	}

	override async insertCert(cert: Certificate): Promise<void> {
		throw new Error('Method not implemented.');
	}
	override async deleteCert(name: Name): Promise<void> {
		throw new Error('Method not implemented.');
	}
}
