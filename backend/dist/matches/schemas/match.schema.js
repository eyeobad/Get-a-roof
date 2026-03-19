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
exports.MatchSchema = exports.Match = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const enums_1 = require("../../common/enums");
let Match = class Match {
};
exports.Match = Match;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "User", required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Match.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "Property", required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Match.prototype, "propertyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "User" }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Match.prototype, "landlordId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: enums_1.MatchStatus, default: enums_1.MatchStatus.TenantLiked }),
    __metadata("design:type", String)
], Match.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Match.prototype, "matchScore", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Match.prototype, "preferencesMatchPercentage", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Match.prototype, "apartmentPreferenceMatchPercentage", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Match.prototype, "locationScore", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Match.prototype, "amenityScore", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Match.prototype, "affordabilityScore", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Match.prototype, "tenantLiked", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: () => new Date() }),
    __metadata("design:type", Date)
], Match.prototype, "timestamp", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Match.prototype, "landlordSeenAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Match.prototype, "dismissedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: enums_1.DismissReason }),
    __metadata("design:type", String)
], Match.prototype, "dismissReason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Match.prototype, "recycleCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            content: { type: String },
            senderId: { type: mongoose_2.Types.ObjectId, ref: "User" },
            timestamp: { type: Date },
        },
    }),
    __metadata("design:type", Object)
], Match.prototype, "lastMessage", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Match.prototype, "tenantUnreadCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Match.prototype, "landlordUnreadCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Match.prototype, "landlordReplied", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: enums_1.RouteAccessStatus,
        default: enums_1.RouteAccessStatus.None,
    }),
    __metadata("design:type", String)
], Match.prototype, "routeAccessStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Match.prototype, "routeAccessRequestedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Match.prototype, "routeAccessRespondedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Match.prototype, "routeOriginLat", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Match.prototype, "routeOriginLng", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Match.prototype, "routeAccessExpiresAt", void 0);
exports.Match = Match = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Match);
exports.MatchSchema = mongoose_1.SchemaFactory.createForClass(Match);
exports.MatchSchema.index({ tenantId: 1, propertyId: 1 }, { unique: true });
exports.MatchSchema.index({ tenantId: 1, status: 1, updatedAt: -1 });
exports.MatchSchema.index({ propertyId: 1, status: 1, updatedAt: -1 });
exports.MatchSchema.index({ status: 1, dismissReason: 1, dismissedAt: 1 });
exports.MatchSchema.index({ landlordId: 1, status: 1, updatedAt: -1 });
