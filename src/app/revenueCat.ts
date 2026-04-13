import Purchases from "react-native-purchases";
import coinPacks from "../data/coinPacks";
import { THEME_PACKS } from "../data/cosmetics";
import { LevelPack } from "../data/levelPacks";

export type RevenueCatOfferings = Awaited<
  ReturnType<typeof Purchases.getOfferings>
>;
export type RevenueCatPackage =
  RevenueCatOfferings["all"][string]["availablePackages"][number];

export function findRevenueCatPackageByIdentifiers(
  offerings: RevenueCatOfferings,
  identifiers: string[],
): RevenueCatPackage | null {
  const targetIdentifiers = new Set(identifiers);
  const allOfferings = Object.values(offerings.all);
  const allPackages = allOfferings.flatMap(
    (offering) => offering.availablePackages,
  );

  const matchingPackage = allPackages.find(
    (pkg) =>
      targetIdentifiers.has(pkg.identifier) ||
      targetIdentifiers.has(pkg.product.identifier),
  );

  return matchingPackage ?? null;
}

export function resolveCoinPackPriceLabels(
  offerings: RevenueCatOfferings,
): Record<string, string> {
  const priceLabelsById: Record<string, string> = {};
  const allOfferings = Object.values(offerings.all);
  const allPackages = allOfferings.flatMap(
    (offering) => offering.availablePackages,
  );

  for (const coinPack of coinPacks) {
    const matchingPackage = allPackages.find(
      (pkg) =>
        pkg.identifier === coinPack.id ||
        pkg.product.identifier === coinPack.id ||
        pkg.product.identifier === coinPack.storeItemId,
    );

    if (matchingPackage?.product.priceString) {
      priceLabelsById[coinPack.id] = matchingPackage.product.priceString;
      continue;
    }

    const matchingOffering = offerings.all[coinPack.id];
    const firstOfferingPackage = matchingOffering?.availablePackages[0];
    if (firstOfferingPackage?.product.priceString) {
      priceLabelsById[coinPack.id] = firstOfferingPackage.product.priceString;
    }
  }

  return priceLabelsById;
}

export function resolveLevelPackPriceLabels(
  levelPacks: LevelPack[],
  offerings: RevenueCatOfferings,
): Record<string, string> {
  const priceLabelsById: Record<string, string> = {};
  const allOfferings = Object.values(offerings.all);
  const allPackages = allOfferings.flatMap(
    (offering) => offering.availablePackages,
  );

  const paidLevelPacks = levelPacks.filter(
    (levelPack) => levelPack.priceType === "real-money",
  );

  for (const levelPack of paidLevelPacks) {
    const matchingPackage = allPackages.find(
      (pkg) =>
        pkg.identifier === levelPack.id ||
        pkg.product.identifier === levelPack.id ||
        pkg.product.identifier === levelPack.storeItemId ||
        pkg.identifier === levelPack.storeItemId,
    );

    if (matchingPackage?.product.priceString) {
      priceLabelsById[levelPack.id] = matchingPackage.product.priceString;
      continue;
    }

    const matchingOffering = offerings.all[levelPack.id];
    const firstOfferingPackage = matchingOffering?.availablePackages[0];
    if (firstOfferingPackage?.product.priceString) {
      priceLabelsById[levelPack.id] = firstOfferingPackage.product.priceString;
    }
  }

  return priceLabelsById;
}

export function resolveThemePackPriceLabels(
  offerings: RevenueCatOfferings,
): Record<string, string> {
  const priceLabelsById: Record<string, string> = {};

  for (const themePack of THEME_PACKS) {
    const localizedPrice = resolveLocalizedPriceLabel(offerings, themePack.id);
    if (localizedPrice) {
      priceLabelsById[themePack.id] = localizedPrice;
    }
  }

  return priceLabelsById;
}

export function resolveLocalizedPriceLabel(
  offerings: RevenueCatOfferings,
  identifier: string,
): string | null {
  const allOfferings = Object.values(offerings.all);
  const allPackages = allOfferings.flatMap(
    (offering) => offering.availablePackages,
  );

  const matchingPackage = allPackages.find(
    (pkg) =>
      pkg.identifier === identifier || pkg.product.identifier === identifier,
  );

  if (matchingPackage?.product.priceString) {
    return matchingPackage.product.priceString;
  }

  const matchingOffering = offerings.all[identifier];
  const firstOfferingPackage = matchingOffering?.availablePackages[0];
  if (firstOfferingPackage?.product.priceString) {
    return firstOfferingPackage.product.priceString;
  }

  return null;
}
