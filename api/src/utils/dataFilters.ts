export function hasText(value: any): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function hasPositiveNumber(value: any): boolean {
  return typeof value === 'number' && !Number.isNaN(value) && value > 0;
}

export function dedupeById<T>(items: T[], getId: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = getId(item)?.trim();
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

export function isValidContract(contract: any): boolean {
  return (
    hasText(contract?.contractId) &&
    hasText(contract?.exporterId) &&
    hasText(contract?.buyerId) &&
    hasText(contract?.buyerCountry) &&
    hasText(contract?.coffeeType) &&
    hasPositiveNumber(contract?.quantity) &&
    hasPositiveNumber(contract?.pricePerKg) &&
    hasText(contract?.currency)
  );
}

export function isValidShipment(shipment: any): boolean {
  return (
    hasText(shipment?.shipmentId) &&
    hasText(shipment?.contractId) &&
    hasText(shipment?.exporterId) &&
    hasText(shipment?.buyerId) &&
    hasText(shipment?.origin) &&
    hasPositiveNumber(shipment?.quantity)
  );
}

export function isValidInspection(inspection: any): boolean {
  return (
    hasText(inspection?.inspectionID) &&
    hasText(inspection?.shipmentID) &&
    hasText(inspection?.exporterID)
  );
}

export function isValidDeclaration(declaration: any): boolean {
  return (
    hasText(declaration?.declarationId) &&
    hasText(declaration?.shipmentId) &&
    hasText(declaration?.hsCode) &&
    hasPositiveNumber(declaration?.quantity) &&
    hasPositiveNumber(declaration?.value)
  );
}

export function isValidLC(lc: any): boolean {
  return (
    hasText(lc?.lcId) &&
    hasText(lc?.contractId) &&
    hasText(lc?.exporterId) &&
    hasPositiveNumber(lc?.amount)
  );
}

export function isValidForex(forex: any): boolean {
  return (
    hasText(forex?.forexId) &&
    hasText(forex?.contractId) &&
    hasText(forex?.exporterId) &&
    hasPositiveNumber(forex?.amount)
  );
}
