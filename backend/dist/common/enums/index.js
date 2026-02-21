"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VehiclePreference = exports.MatchStatus = exports.PropertyType = exports.PropertyStatus = exports.VerificationStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["Tenant"] = "Tenant";
    UserRole["Landlord"] = "Landlord";
    UserRole["Admin"] = "Admin";
    UserRole["Unassigned"] = "Unassigned";
})(UserRole || (exports.UserRole = UserRole = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["None"] = "None";
    VerificationStatus["Pending"] = "Pending";
    VerificationStatus["Approved"] = "Approved";
    VerificationStatus["Failed"] = "Failed";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var PropertyStatus;
(function (PropertyStatus) {
    PropertyStatus["Draft"] = "Draft";
    PropertyStatus["Listed"] = "Listed";
})(PropertyStatus || (exports.PropertyStatus = PropertyStatus = {}));
var PropertyType;
(function (PropertyType) {
    PropertyType["Apartment"] = "Apartment";
    PropertyType["House"] = "House";
    PropertyType["Condo"] = "Condo";
    PropertyType["Townhouse"] = "Townhouse";
    PropertyType["Duplex"] = "Duplex";
    PropertyType["Bungalow"] = "Bungalow";
    PropertyType["Penthouse"] = "Penthouse";
    PropertyType["Villa"] = "Villa";
    PropertyType["Studio"] = "Studio";
    PropertyType["Loft"] = "Loft";
    PropertyType["Other"] = "Other";
    PropertyType["SelfCompound"] = "SelfCompound";
    PropertyType["SharedApartment"] = "SharedApartment";
    PropertyType["SharedCompound"] = "SharedCompound";
    PropertyType["Shortlet"] = "Shortlet";
    PropertyType["NonOwnerOccupied"] = "NonOwnerOccupied";
})(PropertyType || (exports.PropertyType = PropertyType = {}));
var MatchStatus;
(function (MatchStatus) {
    MatchStatus["TenantLiked"] = "TenantLiked";
    MatchStatus["LandlordQualified"] = "LandlordQualified";
    MatchStatus["ChatInitiated"] = "ChatInitiated";
    MatchStatus["Dismissed"] = "Dismissed";
})(MatchStatus || (exports.MatchStatus = MatchStatus = {}));
var VehiclePreference;
(function (VehiclePreference) {
    VehiclePreference["Yes"] = "Yes";
    VehiclePreference["No"] = "No";
    VehiclePreference["Any"] = "Any";
})(VehiclePreference || (exports.VehiclePreference = VehiclePreference = {}));
