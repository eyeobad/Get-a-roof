"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSchema = exports.User = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const enums_1 = require("../../common/enums");
class Address {
}
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Address.prototype, "street", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Address.prototype, "city", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Address.prototype, "state", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Address.prototype, "zip", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Address.prototype, "lat", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Address.prototype, "lng", void 0);
class VerificationDetails {
}
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], VerificationDetails.prototype, "nin", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], VerificationDetails.prototype, "passportId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], VerificationDetails.prototype, "utilityBillUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], VerificationDetails.prototype, "facialScanUrl", void 0);
class LoginCredentials {
}
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LoginCredentials.prototype, "passwordHash", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LoginCredentials.prototype, "googleId", void 0);
class TenantPreferences {
}
__decorate([
    (0, mongoose_1.Prop)({ type: [String], enum: enums_1.PropertyType, default: [] }),
    __metadata("design:type", Array)
], TenantPreferences.prototype, "lookingFor", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], TenantPreferences.prototype, "employmentStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], TenantPreferences.prototype, "annualEarnings", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], TenantPreferences.prototype, "maritalStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: enums_1.VehiclePreference }),
    __metadata("design:type", String)
], TenantPreferences.prototype, "vehicles", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], TenantPreferences.prototype, "hasPets", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], TenantPreferences.prototype, "petFriendlyRequired", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], TenantPreferences.prototype, "smokingHabits", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], TenantPreferences.prototype, "drinkingHabits", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], TenantPreferences.prototype, "religionPreference", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], TenantPreferences.prototype, "educationLevel", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], TenantPreferences.prototype, "socialHabits", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], TenantPreferences.prototype, "hasChildren", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], TenantPreferences.prototype, "maxCommuteRadius", void 0);
class Preferences {
}
__decorate([
    (0, mongoose_1.Prop)({ type: TenantPreferences }),
    __metadata("design:type", TenantPreferences)
], Preferences.prototype, "tenant", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Preferences.prototype, "landlord", void 0);
let User = class User {
};
exports.User = User;
__decorate([
    (0, mongoose_1.Prop)({ enum: enums_1.UserRole, default: enums_1.UserRole.Unassigned }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, required: true, lowercase: true, trim: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, sparse: true }),
    __metadata("design:type", String)
], User.prototype, "phoneNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "photoUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Address }),
    __metadata("design:type", Address)
], User.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isVerified", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: enums_1.VerificationStatus, default: enums_1.VerificationStatus.None }),
    __metadata("design:type", String)
], User.prototype, "verificationStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: VerificationDetails }),
    __metadata("design:type", VerificationDetails)
], User.prototype, "verificationDetails", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: LoginCredentials }),
    __metadata("design:type", LoginCredentials)
], User.prototype, "loginCredentials", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Preferences }),
    __metadata("design:type", Preferences)
], User.prototype, "preferences", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "emailVerified", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "phoneVerified", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "emailOtp", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], User.prototype, "emailOtpExpiresAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "phoneOtp", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], User.prototype, "phoneOtpExpiresAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "passwordResetToken", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], User.prototype, "passwordResetExpiresAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [mongoose_2.Types.ObjectId], ref: "Property", default: [] }),
    __metadata("design:type", Array)
], User.prototype, "savedProperties", void 0);
exports.User = User = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], User);
exports.UserSchema = mongoose_1.SchemaFactory.createForClass(User);
//# sourceMappingURL=user.schema.js.map