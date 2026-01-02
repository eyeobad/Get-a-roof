"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLower = toLower;
exports.valuesMatch = valuesMatch;
exports.isInRange = isInRange;
exports.computePercentage = computePercentage;
exports.toNumber = toNumber;
function toLower(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : undefined;
}
function valuesMatch(a, b) {
    if (!a || !b) {
        return false;
    }
    return toLower(a) === toLower(b);
}
function isInRange(value, min, max) {
    if (value === undefined || value === null) {
        return false;
    }
    if (min !== undefined && value < min) {
        return false;
    }
    if (max !== undefined && value > max) {
        return false;
    }
    return true;
}
function computePercentage(matched, considered) {
    if (!considered) {
        return 100;
    }
    return Math.round((matched / considered) * 100);
}
function toNumber(value) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
}
//# sourceMappingURL=match.helpers.js.map