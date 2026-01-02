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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationController = void 0;
const common_1 = require("@nestjs/common");
const verification_service_1 = require("./verification.service");
const upload_passport_dto_1 = require("./dto/upload-passport.dto");
const submit_nin_dto_1 = require("./dto/submit-nin.dto");
const upload_utility_bill_dto_1 = require("./dto/upload-utility-bill.dto");
const submit_facial_scan_dto_1 = require("./dto/submit-facial-scan.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let VerificationController = class VerificationController {
    constructor(verificationService) {
        this.verificationService = verificationService;
    }
    uploadPassport(dto, req) {
        dto.userId = req.user?.sub;
        return this.verificationService.uploadPassport(dto);
    }
    submitNin(dto, req) {
        dto.userId = req.user?.sub;
        return this.verificationService.submitNin(dto);
    }
    uploadUtilityBill(dto, req) {
        dto.userId = req.user?.sub;
        return this.verificationService.uploadUtilityBill(dto);
    }
    submitFacialScan(dto, req) {
        dto.userId = req.user?.sub;
        return this.verificationService.submitFacialScan(dto);
    }
};
exports.VerificationController = VerificationController;
__decorate([
    (0, common_1.Post)("upload-passport"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [upload_passport_dto_1.UploadPassportDto, Object]),
    __metadata("design:returntype", void 0)
], VerificationController.prototype, "uploadPassport", null);
__decorate([
    (0, common_1.Post)("submit-nin"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [submit_nin_dto_1.SubmitNinDto, Object]),
    __metadata("design:returntype", void 0)
], VerificationController.prototype, "submitNin", null);
__decorate([
    (0, common_1.Post)("upload-utility-bill"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [upload_utility_bill_dto_1.UploadUtilityBillDto, Object]),
    __metadata("design:returntype", void 0)
], VerificationController.prototype, "uploadUtilityBill", null);
__decorate([
    (0, common_1.Post)("submit-facial-scan"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [submit_facial_scan_dto_1.SubmitFacialScanDto, Object]),
    __metadata("design:returntype", void 0)
], VerificationController.prototype, "submitFacialScan", null);
exports.VerificationController = VerificationController = __decorate([
    (0, common_1.Controller)("api/verification"),
    __metadata("design:paramtypes", [verification_service_1.VerificationService])
], VerificationController);
//# sourceMappingURL=verification.controller.js.map