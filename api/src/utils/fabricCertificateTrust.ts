import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ORGANIZATION_MSP: Record<string, string> = {
  EXPORTER: 'ECTAMSP', ECTA: 'ECTAMSP', ECTAMSP: 'ECTAMSP', ADMIN: 'ECTAMSP',
  ECX: 'ECXMSP', ECXMSP: 'ECXMSP',
  BANK: 'BanksMSP', BANKS: 'BanksMSP', BANKSMSP: 'BanksMSP',
  NBE: 'NBEMSP', NBEMSP: 'NBEMSP',
  CUSTOMS: 'CustomsMSP', CUSTOMSMSP: 'CustomsMSP',
  SHIPPING: 'ShippingMSP', SHIPPINGMSP: 'ShippingMSP', LOGISTICS: 'ShippingMSP',
};

const MSP_DOMAIN: Record<string, string> = {
  ECTAMSP: 'ecta.cecbs.et',
  ECXMSP: 'ecx.cecbs.et',
  BanksMSP: 'banks.cecbs.et',
  NBEMSP: 'nbe.cecbs.et',
  CustomsMSP: 'customs.cecbs.et',
  ShippingMSP: 'shipping.cecbs.et',
};

const MSP_CONFIG_KEY: Record<string, string> = {
  ECTAMSP: 'ECTA',
  ECXMSP: 'ECX',
  BanksMSP: 'BANKS',
  NBEMSP: 'NBE',
  CustomsMSP: 'CUSTOMS',
  ShippingMSP: 'SHIPPING',
};

const trustMaterialCache = new Map<string, { roots: crypto.X509Certificate[]; issuers: crypto.X509Certificate[] }>();

export function normalizeFabricMspId(value: string): string {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return ORGANIZATION_MSP[normalized] || (value.endsWith('MSP') ? value : `${value}MSP`);
}

/** Validate a signing certificate against the CA roots in its Fabric MSP. */
export function getFabricCertificateTrustStatus(pemCertificate: string, mspOrOrganization: string): string {
  try {
    const mspId = normalizeFabricMspId(mspOrOrganization);
    const certificate = new crypto.X509Certificate(pemCertificate);
    const now = Date.now();
    if (now < Date.parse(certificate.validFrom) || now > Date.parse(certificate.validTo)) {
      return 'EXPIRED_OR_NOT_YET_VALID';
    }

    const domain = MSP_DOMAIN[mspId];
    if (!domain) return 'UNANCHORED';
    let trustMaterial = trustMaterialCache.get(mspId);
    if (!trustMaterial) {
      const configKey = MSP_CONFIG_KEY[mspId];
      const configuredRootsPath = configKey ? process.env[`FABRIC_MSP_CA_ROOT_${configKey}`] : undefined;
      const configuredIntermediatesPath = configKey ? process.env[`FABRIC_MSP_CA_INTERMEDIATE_${configKey}`] : undefined;
      const readCertificateFile = (filePath: string): crypto.X509Certificate[] => {
        if (!fs.existsSync(filePath)) return [];
        const contents = fs.readFileSync(filePath, 'utf8');
        const pemCertificates = contents.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [];
        return pemCertificates.map((pem) => new crypto.X509Certificate(pem));
      };

      if (configuredRootsPath) {
        const roots = readCertificateFile(configuredRootsPath);
        const issuers = configuredIntermediatesPath ? readCertificateFile(configuredIntermediatesPath) : [];
        if (roots.length === 0) return 'UNAVAILABLE';
        trustMaterial = { roots, issuers };
        trustMaterialCache.set(mspId, trustMaterial);
      } else {
        // Production deployments must supply independently provisioned
        // consortium roots. In local development the organization-level MSP
        // can be a stale snapshot, so prefer the peer/admin MSP bundles used
        // by the identities on the active network.
        if (process.env.NODE_ENV === 'production') return 'UNAVAILABLE';

        const organizationDirectory = path.resolve(
          __dirname,
          '../../../blockchain/organizations/peerOrganizations',
          domain,
        );
        const mspDirectories = [
          path.join(organizationDirectory, 'users', `Admin@${domain}`, 'msp'),
          path.join(organizationDirectory, 'peers', `peer0.${domain}`, 'msp'),
          path.join(organizationDirectory, 'msp'),
          path.resolve(process.cwd(), 'blockchain/organizations/peerOrganizations', domain, 'users', `Admin@${domain}`, 'msp'),
          path.resolve(process.cwd(), 'blockchain/organizations/peerOrganizations', domain, 'peers', `peer0.${domain}`, 'msp'),
          path.resolve(process.cwd(), 'blockchain/organizations/peerOrganizations', domain, 'msp'),
        ];
        const mspDirectory = mspDirectories.find((candidate) =>
          fs.existsSync(path.join(candidate, 'cacerts')) && fs.readdirSync(path.join(candidate, 'cacerts')).some((fileName) => {
            const filePath = path.join(candidate, 'cacerts', fileName);
            return fs.statSync(filePath).isFile();
          })
        );
        if (!mspDirectory) return 'UNANCHORED';
        const readCertificates = (directory: string): crypto.X509Certificate[] => {
          if (!fs.existsSync(directory)) return [];
          return fs.readdirSync(directory)
            .filter((fileName) => fs.statSync(path.join(directory, fileName)).isFile())
            .map((fileName) => new crypto.X509Certificate(fs.readFileSync(path.join(directory, fileName))));
        };
        trustMaterial = {
          roots: readCertificates(path.join(mspDirectory, 'cacerts')),
          issuers: readCertificates(path.join(mspDirectory, 'intermediatecerts')),
        };
        trustMaterialCache.set(mspId, trustMaterial);
      }
    }

    const roots = trustMaterial.roots.filter((root) => root.ca);
    const issuers = [...trustMaterial.issuers, ...roots].filter((issuer) => issuer.ca);
    const rootFingerprints = new Set(roots.map((root) => root.fingerprint256));
    let current = certificate;
    const visited = new Set<string>();
    for (let depth = 0; depth <= issuers.length; depth += 1) {
      if (rootFingerprints.has(current.fingerprint256)) return 'TRUSTED_BY_CONFIGURED_MSP_ROOT';
      if (visited.has(current.fingerprint256)) return 'UNANCHORED';
      visited.add(current.fingerprint256);
      const issuer = issuers.find((candidate) =>
        now >= Date.parse(candidate.validFrom) && now <= Date.parse(candidate.validTo) &&
        current.checkIssued(candidate) && current.verify(candidate.publicKey)
      );
      if (!issuer) return 'UNANCHORED';
      current = issuer;
    }
    return 'UNANCHORED';
  } catch (_) {
    return 'UNAVAILABLE';
  }
}
