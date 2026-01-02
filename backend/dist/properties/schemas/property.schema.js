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
exports.PropertySchema = exports.Property = void 0;
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
class BudgetRange {
}
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], BudgetRange.prototype, "min", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], BudgetRange.prototype, "max", void 0);
class IdealTenantPreferences {
}
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], IdealTenantPreferences.prototype, "employmentStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], IdealTenantPreferences.prototype, "maritalStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: enums_1.VehiclePreference }),
    __metadata("design:type", String)
], IdealTenantPreferences.prototype, "vehicles", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], IdealTenantPreferences.prototype, "hasPets", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], IdealTenantPreferences.prototype, "smokingHabits", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], IdealTenantPreferences.prototype, "drinkingHabits", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], IdealTenantPreferences.prototype, "religionPreference", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], IdealTenantPreferences.prototype, "educationLevel", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], IdealTenantPreferences.prototype, "socialHabits", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], IdealTenantPreferences.prototype, "hasChildren", void 0);
class LandlordRequirements {
}
__decorate([
    (0, mongoose_1.Prop)({ type: BudgetRange }),
    __metadata("design:type", BudgetRange)
], LandlordRequirements.prototype, "budgetRange", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: BudgetRange }),
    __metadata("design:type", BudgetRange)
], LandlordRequirements.prototype, "annualIncome", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], LandlordRequirements.prototype, "petsAllowed", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], LandlordRequirements.prototype, "nonOwnerOccupied", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], LandlordRequirements.prototype, "sharedApartment", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], LandlordRequirements.prototype, "shortlet", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], LandlordRequirements.prototype, "selfCompound", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], LandlordRequirements.prototype, "sharedCompound", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: IdealTenantPreferences }),
    __metadata("design:type", IdealTenantPreferences)
], LandlordRequirements.prototype, "idealTenantPreferences", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], LandlordRequirements.prototype, "tenantPreferences", void 0);
let Property = class Property {
};
exports.Property = Property;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "User", required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Property.prototype, "landlordId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Property.prototype, "images", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Property.prototype, "monthlyPrice", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Address }),
    __metadata("design:type", Address)
], Property.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Property.prototype, "neighborhood", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Property.prototype, "bedCount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Property.prototype, "bathCount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Property.prototype, "sqFt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], Property.prototype, "petFriendly", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: enums_1.PropertyType }),
    __metadata("design:type", String)
], Property.prototype, "propertyType", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Property.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Property.prototype, "amenities", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Property.prototype, "proofOfOwnership", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: enums_1.PropertyStatus, default: enums_1.PropertyStatus.Draft }),
    __metadata("design:type", String)
], Property.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: LandlordRequirements }),
    __metadata("design:type", LandlordRequirements)
], Property.prototype, "landlordRequirements", void 0);
exports.Property = Property = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Property);
exports.PropertySchema = mongoose_1.SchemaFactory.createForClass(Property);
//# sourceMappingURL=property.schema.js.map