// @ts-expect-error any
import { OpenSSL } from 'openssl.js';
import WasmFsDefault, { WasmFs } from '@wasmer/wasmfs';
import opensslCfg from './openssl.cnf.txt';

export class DerKeyConverter {
	public readonly openssl;
	public readonly wasmFs: WasmFsDefault['fs'];

	constructor(wasmBinPath: string) {
		this.wasmFs = new WasmFs().fs;
		if (!this.wasmFs.existsSync('/usr/local/ssl')) {
			this.wasmFs.mkdirSync('/usr/local/ssl', { recursive: true });
		}
		this.wasmFs.writeFileSync('/usr/local/ssl/openssl.cnf', opensslCfg);
		this.openssl = new OpenSSL({
			fs: this.wasmFs,
			rootDir: '/',
			wasmBinaryPath: wasmBinPath
		});
	}

	async convert(input: string, keyType: 'EC' | 'RSA') {
		const pem = `-----BEGIN ${keyType} PRIVATE KEY-----\n` + input + `-----END ${keyType} PRIVATE KEY-----\n`;
		this.wasmFs.writeFileSync('/private.key', pem);
		try {
			await this.openssl.runCommand('pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in /private.key -out /pkcs8.key');
		} catch {
			// Due to some issue WASI always throws "WASI Exit error: 0"
		}
		const pkcs8 = this.wasmFs.readFileSync('/pkcs8.key', { encoding: 'utf8' }) as string;
		// Remove begin key and end key
		return pkcs8.split('\n').slice(1, -2).join('\n');
	}

	async convertBlind(input: string) {
		const keyType = input.length < 640 ? 'EC' : 'RSA';
		return await this.convert(input, keyType);
	}

	async toEcPem(input: string) {
		const pem = `-----BEGIN PRIVATE KEY-----\n` + input + `-----END PRIVATE KEY-----\n`;
		this.wasmFs.writeFileSync('/pkcs8.key', pem);
		try {
			await this.openssl.runCommand('openssl ec -inform PEM -outform PEM -in /pkcs8.key -out /private.key');
		} catch {
			// Due to some issue WASI always throws "WASI Exit error: 0"
		}
		const rawPem = this.wasmFs.readFileSync('/private.key', { encoding: 'utf8' }) as string;
		// Remove begin key and end key
		return rawPem.split('\n').slice(1, -2).join('\n');
	}
}
