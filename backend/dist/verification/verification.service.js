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
exports.VerificationService = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../users/users.service");
const enums_1 = require("../common/enums");
let VerificationService = class VerificationService {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async uploadPassport(dto) {
        if (!dto.userId) {
            throw new common_1.BadRequestException("userId is required");
        }
        const user = await this.usersService.findById(dto.userId);
        const passportId = dto.passportId || dto.documentUrl;
        user.verificationDetails = {
            ...(user.verificationDetails || {}),
            passportId,
        };
        user.verificationStatus = enums_1.VerificationStatus.Pending;
        await user.save();
        return { uploaded: true };
    }
    async submitNin(dto) {
        if (!dto.userId) {
            throw new common_1.BadRequestException("userId is required");
        }
        const user = await this.usersService.findById(dto.userId);
        user.verificationDetails = {
            ...(user.verificationDetails || {}),
            nin: dto.nin,
        };
        user.verificationStatus = enums_1.VerificationStatus.Pending;
        await user.save();
        return { submitted: true };
    }
    async uploadUtilityBill(dto) {
        if (!dto.userId) {
            throw new common_1.BadRequestException("userId is required");
        }
        const user = await this.usersService.findById(dto.userId);
        user.verificationDetails = {
            ...(user.verificationDetails || {}),
            utilityBillUrl: dto.documentUrl,
        };
        user.verificationStatus = enums_1.VerificationStatus.Pending;
        await user.save();
        return { uploaded: true };
    }
    async submitFacialScan(dto) {
        if (!dto.userId) {
            throw new common_1.BadRequestException("userId is required");
        }
        const user = await this.usersService.findById(dto.userId);
        user.verificationDetails = {
            ...(user.verificationDetails || {}),
            facialScanUrl: dto.documentUrl,
        };
        user.verificationStatus = enums_1.VerificationStatus.Pending;
        await user.save();
        return { submitted: true };
    }
};
exports.VerificationService = VerificationService;
exports.VerificationService = VerificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], VerificationService);
//# sourceMappingURL=verification.service.js.map