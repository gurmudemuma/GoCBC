import * as fs from 'fs';
import * as path from 'path';
import { Wallet, WalletStore } from 'fabric-network';

/** Filesystem wallet store that writes Fabric identities with private file modes. */
class SecureFabricWalletStore implements WalletStore {
  private readonly directory: string;

  constructor(walletPath: string) {
    this.directory = path.resolve(walletPath);
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const stat = fs.lstatSync(this.directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error('Fabric wallet path must be a real directory, not a symbolic link');
    }
    fs.chmodSync(this.directory, 0o700);
  }

  async get(label: string): Promise<Buffer | undefined> {
    const filePath = this.toPath(label);
    try {
      const stat = await fs.promises.lstat(filePath);
      if (stat.isSymbolicLink() || !stat.isFile()) {
        throw new Error(`Refusing to read a non-regular Fabric wallet entry: ${label}`);
      }
      await fs.promises.chmod(filePath, 0o600);
      return await fs.promises.readFile(filePath);
    } catch (error: any) {
      if (error?.code === 'ENOENT') return undefined;
      throw error;
    }
  }

  async list(): Promise<string[]> {
    const entries = await fs.promises.readdir(this.directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.id'))
      .map((entry) => entry.name.slice(0, -3));
  }

  async put(label: string, data: Buffer): Promise<void> {
    const filePath = this.toPath(label);
    const existing = await fs.promises.lstat(filePath).catch((error: any) => {
      if (error?.code === 'ENOENT') return null;
      throw error;
    });
    if (existing?.isSymbolicLink() || (existing && !existing.isFile())) {
      throw new Error(`Refusing to write a non-regular Fabric wallet entry: ${label}`);
    }
    await fs.promises.writeFile(filePath, data, { mode: 0o600 });
    await fs.promises.chmod(filePath, 0o600);
  }

  async remove(label: string): Promise<void> {
    const filePath = this.toPath(label);
    const existing = await fs.promises.lstat(filePath);
    if (existing.isSymbolicLink() || !existing.isFile()) {
      throw new Error(`Refusing to remove a non-regular Fabric wallet entry: ${label}`);
    }
    await fs.promises.unlink(filePath);
  }

  private toPath(label: string): string {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(label)) {
      throw new Error('Invalid Fabric wallet identity label');
    }
    return path.join(this.directory, `${label}.id`);
  }
}

export async function openSecureFabricWallet(walletPath: string): Promise<Wallet> {
  return new Wallet(new SecureFabricWalletStore(walletPath));
}
