"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MATCH_WEIGHTS = void 0;
exports.computeMatchScore = computeMatchScore;
const enums_1 = require("../enums");
const property_utils_1 = require("./property.utils");
const match_helpers_1 = require("./match.helpers");
const geo_utils_1 = require("./geo.utils");
exports.DEFAULT_MATCH_WEIGHTS = {
    preferences: 0.30,
    apartmentType: 0.20,
    location: 0.25,
    amenity: 0.10,
    affordability: 0.15,
};
const PROPERTY_TYPE_GROUPS = [
    [enums_1.PropertyType.Apartment, enums_1.PropertyType.Studio, enums_1.PropertyType.Loft],
    [enums_1.PropertyType.House, enums_1.PropertyType.Bungalow, enums_1.PropertyType.Villa],
    [enums_1.PropertyType.Duplex, enums_1.PropertyType.Townhouse],
    [enums_1.PropertyType.Condo, enums_1.PropertyType.Penthouse],
    [enums_1.PropertyType.SharedApartment, enums_1.PropertyType.SharedCompound],
    [enums_1.PropertyType.SelfCompound, enums_1.PropertyType.NonOwnerOccupied],
];
const typeToGroup = new Map();
PROPERTY_TYPE_GROUPS.forEach((group, index) => {
    group.forEach((type) => typeToGroup.set(type, index));
});
const tenantPreferenceKeys = [
    "employmentStatus",
    "maritalStatus",
    "vehicles",
    "smokingHabits",
    "drinkingHabits",
    "religionPreference",
    "educationLevel",
    "socialHabits",
    "hasChildren",
];
function computeMatchScore(tenant, property, weights = exports.DEFAULT_MATCH_WEIGHTS) {
    const apartmentPreferenceMatchPercentage = computeApartmentPreferenceMatch(tenant, property);
    const preferencesMatchPercentage = computePreferencesMatch(tenant, property);
    const locationScore = computeLocationScore(tenant, property);
    const amenityScore = computeAmenityScore(tenant, property);
    const affordabilityScore = computeAffordabilityScore(tenant, property);
    const matchScore = Math.round(preferencesMatchPercentage * weights.preferences +
        apartmentPreferenceMatchPercentage * weights.apartmentType +
        locationScore * weights.location +
        amenityScore * weights.amenity +
        affordabilityScore * weights.affordability);
    return {
        preferencesMatchPercentage,
        apartmentPreferenceMatchPercentage,
        locationScore,
        amenityScore,
        affordabilityScore,
        matchScore,
    };
}
function computeApartmentPreferenceMatch(tenant, property) {
    const lookingFor = tenant?.lookingFor
        ?.map((value) => (0, property_utils_1.normalizePropertyType)(value)?.toString() ?? value.toString())
        .filter(Boolean);
    if (!lookingFor || !lookingFor.length) {
        return 100;
    }
    const normalizedType = (0, property_utils_1.normalizePropertyType)(property.propertyType);
    if (!normalizedType) {
        return 50;
    }
    const propertyTypes = new Set();
    propertyTypes.add(normalizedType.toString());
    const requirements = property.landlordRequirements;
    if (requirements?.nonOwnerOccupied)
        propertyTypes.add(enums_1.PropertyType.NonOwnerOccupied);
    if (requirements?.sharedApartment)
        propertyTypes.add(enums_1.PropertyType.SharedApartment);
    if (requirements?.shortlet)
        propertyTypes.add(enums_1.PropertyType.Shortlet);
    if (requirements?.selfCompound)
        propertyTypes.add(enums_1.PropertyType.SelfCompound);
    if (requirements?.sharedCompound)
        propertyTypes.add(enums_1.PropertyType.SharedCompound);
    if (lookingFor.some((type) => propertyTypes.has(type))) {
        return 100;
    }
    const propertyGroup = typeToGroup.get(normalizedType.toString());
    if (propertyGroup !== undefined) {
        for (const desired of lookingFor) {
            const desiredGroup = typeToGroup.get(desired);
            if (desiredGroup === propertyGroup) {
                return 70;
            }
        }
    }
    return 20;
}
function computeLocationScore(tenant, property) {
    const tenantLat = tenant?.lat;
    const tenantLng = tenant?.lng;
    const propertyLat = property.lat;
    const propertyLng = property.lng;
    if (tenantLat === undefined ||
        tenantLng === undefined ||
        propertyLat === undefined ||
        propertyLng === undefined) {
        return 50;
    }
    const distanceKm = (0, geo_utils_1.haversineDistanceKm)({ lat: tenantLat, lng: tenantLng }, { lat: propertyLat, lng: propertyLng });
    const maxRadiusKm = tenant?.preferredDistance ??
        tenant?.maxCommuteRadius ??
        20;
    if (!Number.isFinite(maxRadiusKm) || maxRadiusKm <= 0) {
        return 50;
    }
    const ratio = distanceKm / maxRadiusKm;
    if (ratio <= 0.25)
        return 100;
    if (ratio <= 0.50)
        return 85;
    if (ratio <= 0.75)
        return 65;
    if (ratio <= 1.00)
        return 40;
    if (ratio <= 1.50)
        return 20;
    return 10;
}
function computeAmenityScore(tenant, property) {
    const desired = tenant?.desiredAmenities;
    if (!desired || desired.length === 0) {
        return 100;
    }
    const available = new Set((property.amenities ?? []).map((a) => a.toLowerCase().trim()));
    if (available.size === 0) {
        return 30;
    }
    let matched = 0;
    for (const item of desired) {
        if (available.has(item.toLowerCase().trim())) {
            matched++;
        }
    }
    return (0, match_helpers_1.computePercentage)(matched, desired.length);
}
function computeAffordabilityScore(tenant, property) {
    const annualEarnings = tenant?.annualEarnings;
    const monthlyPrice = property.monthlyPrice;
    if (annualEarnings === undefined || monthlyPrice === undefined) {
        return 50;
    }
    if (monthlyPrice <= 0) {
        return 100;
    }
    const monthlyAffordable = annualEarnings / 12 / 3;
    if (monthlyAffordable <= 0) {
        return 0;
    }
    const ratio = monthlyPrice / monthlyAffordable;
    if (ratio <= 0.80)
        return 100;
    if (ratio <= 1.00)
        return 80;
    if (ratio <= 1.20)
        return 50;
    if (ratio <= 1.50)
        return 20;
    return 0;
}
function computePreferencesMatch(tenant, property) {
    const requirements = property.landlordRequirements;
    let matched = 0;
    let considered = 0;
    if (requirements?.annualIncome) {
        const tenantIncome = tenant?.annualEarnings;
        if (tenantIncome !== undefined) {
            considered += 1;
            if ((0, match_helpers_1.isInRange)(tenantIncome, requirements.annualIncome.min, requirements.annualIncome.max)) {
                matched += 1;
            }
        }
    }
    if (requirements?.petsAllowed !== undefined && tenant?.hasPets !== undefined) {
        considered += 1;
        if (!tenant.hasPets || requirements.petsAllowed) {
            matched += 1;
        }
    }
    if (tenant?.petFriendlyRequired !== undefined &&
        property.petFriendly !== undefined) {
        considered += 1;
        if (!tenant.petFriendlyRequired || property.petFriendly) {
            matched += 1;
        }
    }
    const reqTenantPrefs = requirements?.idealTenantPreferences ||
        requirements?.tenantPreferences ||
        {};
    for (const key of tenantPreferenceKeys) {
        const reqValue = reqTenantPrefs[key];
        const tenantValue = tenant?.[key];
        if (reqValue === undefined || tenantValue === undefined) {
            continue;
        }
        considered += 1;
        if (typeof tenantValue === "boolean") {
            if (tenantValue === reqValue) {
                matched += 1;
            }
            continue;
        }
        if ((0, match_helpers_1.toLower)(String(reqValue)) === "any" ||
            (0, match_helpers_1.toLower)(String(tenantValue)) === "any") {
            matched += 1;
            continue;
        }
        if ((0, match_helpers_1.valuesMatch)(String(tenantValue), String(reqValue))) {
            matched += 1;
        }
    }
    return (0, match_helpers_1.computePercentage)(matched, considered);
}
