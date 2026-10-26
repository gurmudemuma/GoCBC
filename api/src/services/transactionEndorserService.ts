/**
 * Reads transaction proof fields from the committed Fabric envelope through QSCC.
 * Endorser identities, signatures, validation codes, and block numbers are never inferred.
 */
import FabricService from './fabricService';

export interface TransactionEndorser {
  mspId: string;
  identity: string;
  signatureValid: boolean | null;
}

export interface TransactionDetails {
  txId: string;
  creator: {
    mspId: string;
    identity: string;
    signatureValid: boolean | null;
    certificateTrustStatus: string;
  };
  endorsers: TransactionEndorser[];
  timestamp: string | null;
  validationCode: number;
  validationStatus: string;
  blockNumber: number | null;
  blockHash: string | null;
  chaincodeFunction: string | null;
  args: string[];
}

class TransactionEndorserService {
  private static instance: TransactionEndorserService;
  private fabric = FabricService.getInstance();

  private constructor() {}

  public static getInstance(): TransactionEndorserService {
    if (!TransactionEndorserService.instance) {
      TransactionEndorserService.instance = new TransactionEndorserService();
    }
    return TransactionEndorserService.instance;
  }

  public async getTransactionEndorsers(txId: string): Promise<TransactionDetails | null> {
    return this.fabric.getTransactionDetails(txId);
  }
}

export default TransactionEndorserService.getInstance();
