"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeMatchScore = computeMatchScore;
const match_helpers_1 = require("./match.helpers");
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
function computeMatchScore(tenant, property) {
    const apartmentPreferenceMatchPercentage = computeApartmentPreferenceMatch(tenant, property);
    const preferencesMatchPercentage = computePreferencesMatch(tenant, property);
    const matchScore = Math.round(preferencesMatchPercentage * 0.6 + apartmentPreferenceMatchPercentage * 0.4);
    return {
        preferencesMatchPercentage,
        apartmentPreferenceMatchPercentage,
        matchScore,
    };
}
function computeApartmentPreferenceMatch(tenant, property) {
    const lookingFor = tenant?.lookingFor?.map((value) => value.toString());
    if (!lookingFor || !lookingFor.length) {
        return 100;
    }
    if (!property.propertyType) {
        return 0;
    }
    return lookingFor.includes(property.propertyType.toString()) ? 100 : 0;
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
    if (tenant?.annualEarnings !== undefined && property.monthlyPrice !== undefined) {
        considered += 1;
        const monthlyAffordable = tenant.annualEarnings / 12 / 3;
        if (property.monthlyPrice <= monthlyAffordable) {
            matched += 1;
        }
    }
    if (requirements?.petsAllowed !== undefined && tenant?.hasPets !== undefined) {
        considered += 1;
        if (!tenant.hasPets || requirements.petsAllowed) {
            matched += 1;
        }
    }
    const reqTenantPrefs = requirements?.idealTenantPreferences || requirements?.tenantPreferences || {};
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
//# sourceMappingURL=match.utils.js.map