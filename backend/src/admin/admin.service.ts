import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, Types } from "mongoose";
import { User, UserDocument } from "../users/schemas/user.schema";
import { Property, PropertyDocument } from "../properties/schemas/property.schema";
import { Match, MatchDocument } from "../matches/schemas/match.schema";
import { Message, MessageDocument } from "../chat/schemas/message.schema";
import { AdminAudit, AdminAuditDocument } from "./schemas/admin-audit.schema";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { ModerateListingDto } from "./dto/moderate-listing.dto";
import { PropertyStatus, UserRole } from "../common/enums";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UsersService } from "../users/users.service";

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Property.name) private readonly propertyModel: Model<PropertyDocument>,
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    @InjectModel(AdminAudit.name) private readonly auditModel: Model<AdminAuditDocument>,
    private readonly usersService: UsersService
  ) {}

  async getMetrics(params: { from?: string; to?: string }) {
    const fromDate = params.from ? new Date(params.from) : new Date(Date.now() - 29 * 86400000);
    const toDate = params.to ? new Date(params.to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    const windowMatch = { createdAt: { $gte: fromDate, $lte: toDate } };
    const [landlordIds, tenantIds] = await Promise.all([
      this.userModel.distinct("_id", { role: UserRole.Landlord }),
      this.userModel.distinct("_id", { role: UserRole.Tenant }),
    ]);

    const validPropertyIds = landlordIds.length
      ? await this.propertyModel.distinct("_id", { landlordId: { $in: landlordIds } })
      : [];

    const validMatchFilter: FilterQuery<MatchDocument> = {
      propertyId: { $in: validPropertyIds },
      tenantId: { $in: tenantIds },
    };

    const validMatchIds = validPropertyIds.length
      ? await this.matchModel.distinct("_id", validMatchFilter)
      : [];

    const [totalUsers, verifiedUsers, totalListings, totalMatches, totalMessages] =
      await Promise.all([
        this.userModel.countDocuments({}),
        this.userModel.countDocuments({ emailVerified: true }),
        Promise.resolve(validPropertyIds.length),
        Promise.resolve(validMatchIds.length),
        validMatchIds.length
          ? this.messageModel.countDocuments({ matchId: { $in: validMatchIds } })
          : Promise.resolve(0),
      ]);

    const [roleDistribution, listingStatus, signupsByDay, messagesByDay, matchesByDay] =
      await Promise.all([
        this.userModel.aggregate([
          { $group: { _id: "$role", count: { $sum: 1 } } },
          { $project: { _id: 0, role: "$_id", count: 1 } },
        ]),
        validPropertyIds.length
          ? this.propertyModel.aggregate([
              { $match: { _id: { $in: validPropertyIds } } },
              { $group: { _id: "$status", count: { $sum: 1 } } },
              { $project: { _id: 0, status: "$_id", count: 1 } },
            ])
          : Promise.resolve([]),
        this.aggregateDaily(this.userModel, windowMatch),
        validMatchIds.length
          ? this.aggregateDaily(this.messageModel, {
              ...windowMatch,
              matchId: { $in: validMatchIds },
            })
          : Promise.resolve([]),
        validPropertyIds.length
          ? this.aggregateDaily(this.matchModel, {
              ...windowMatch,
              ...validMatchFilter,
            })
          : Promise.resolve([]),
      ]);

    return {
      summary: {
        totalUsers,
        totalListings,
        totalMatches,
        totalMessages,
        verifiedUsers,
      },
      charts: {
        roleDistribution,
        listingStatus,
        signupsByDay,
        messagesByDay,
        matchesByDay,
      },
    };
  }

  async listUsers(params: {
    q?: string;
    role?: string;
    suspended?: string;
    page?: string;
    limit?: string;
  }) {
    const page = Math.max(1, Number(params.page ?? 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit ?? 20) || 20));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<UserDocument> = {};
    if (params.q) {
      const regex = new RegExp(params.q.trim(), "i");
      filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
    }
    if (params.role) {
      filter.role = params.role;
    }
    if (params.suspended === "true") {
      filter.isSuspended = true;
    }
    if (params.suspended === "false") {
      filter.isSuspended = false;
    }

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "_id firstName lastName email role isSuspended suspendedAt suspensionReason emailVerified createdAt"
        )
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async updateUserStatus(
    adminId: string,
    userId: string,
    dto: UpdateUserStatusDto,
    meta: { ip?: string; userAgent?: string }
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException("User not found");
    }

    const update = dto.isSuspended
      ? {
          isSuspended: true,
          suspendedAt: new Date(),
          suspensionReason: dto.reason?.trim() || "Suspended by admin",
        }
      : { isSuspended: false, suspendedAt: undefined, suspensionReason: undefined };

    const updated = await this.userModel
      .findByIdAndUpdate(userId, update, { new: true })
      .select(
        "_id firstName lastName email role isSuspended suspendedAt suspensionReason emailVerified createdAt"
      )
      .lean();
    if (!updated) throw new NotFoundException("User not found");

    await this.logAudit(adminId, "USER_STATUS_UPDATED", "User", userId, update, meta);
    return updated;
  }

  async updateUserRole(
    adminId: string,
    userId: string,
    dto: UpdateUserRoleDto,
    meta: { ip?: string; userAgent?: string }
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException("User not found");
    }

    const updated = await this.userModel
      .findByIdAndUpdate(userId, { role: dto.role }, { new: true })
      .select(
        "_id firstName lastName email role isSuspended suspendedAt suspensionReason emailVerified createdAt"
      )
      .lean();
    if (!updated) throw new NotFoundException("User not found");

    await this.logAudit(
      adminId,
      "USER_ROLE_UPDATED",
      "User",
      userId,
      { role: dto.role },
      meta
    );
    return updated;
  }

  async deleteUser(
    adminId: string,
    userId: string,
    meta: { ip?: string; userAgent?: string }
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException("User not found");
    }
    if (adminId === userId) {
      throw new BadRequestException("You cannot delete your own admin account.");
    }

    const existing = await this.userModel.findById(userId).lean();
    if (!existing) {
      throw new NotFoundException("User not found");
    }

    if (existing.role === UserRole.Admin) {
      const adminCount = await this.userModel.countDocuments({ role: UserRole.Admin });
      if (adminCount <= 1) {
        throw new BadRequestException("Cannot delete the last admin account.");
      }
    }

    await this.usersService.deleteUser(userId);
    await this.logAudit(adminId, "USER_DELETED", "User", userId, {}, meta);
    return { deleted: true };
  }

  async listListings(params: {
    q?: string;
    status?: string;
    moderationStatus?: string;
    page?: string;
    limit?: string;
  }) {
    const page = Math.max(1, Number(params.page ?? 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit ?? 20) || 20));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<PropertyDocument> = {};
    if (params.q) {
      const regex = new RegExp(params.q.trim(), "i");
      filter.$or = [
        { "address.street": regex },
        { "address.city": regex },
        { neighborhood: regex },
        { description: regex },
      ];
    }
    if (params.status) filter.status = params.status;
    if (params.moderationStatus) filter.moderationStatus = params.moderationStatus;

    const [rawItems, total] = await Promise.all([
      this.propertyModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "_id landlordId status moderationStatus moderationReason monthlyPrice propertyType listingIntent bedCount bathCount address createdAt"
        )
        .lean(),
      this.propertyModel.countDocuments(filter),
    ]);
    const items = await this.attachLandlordSummaries(rawItems);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async moderateListing(
    adminId: string,
    listingId: string,
    dto: ModerateListingDto,
    meta: { ip?: string; userAgent?: string }
  ) {
    if (!Types.ObjectId.isValid(listingId)) {
      throw new NotFoundException("Listing not found");
    }

    const update: Partial<PropertyDocument> & Record<string, unknown> = {
      moderatedBy: new Types.ObjectId(adminId),
      moderatedAt: new Date(),
      moderationReason: dto.reason?.trim() || undefined,
    };

    if (dto.action === "approve") {
      update.status = PropertyStatus.Listed;
      update.moderationStatus = "Approved";
    } else if (dto.action === "reject") {
      update.status = PropertyStatus.Draft;
      update.moderationStatus = "Rejected";
    } else {
      update.status = PropertyStatus.Draft;
      update.moderationStatus = "Hidden";
    }

    const updated = await this.propertyModel
      .findByIdAndUpdate(listingId, update, { new: true })
      .select(
        "_id landlordId status moderationStatus moderationReason monthlyPrice propertyType listingIntent bedCount bathCount address createdAt"
      )
      .lean();
    if (!updated) throw new NotFoundException("Listing not found");
    const [item] = await this.attachLandlordSummaries([updated]);

    await this.logAudit(adminId, "LISTING_MODERATED", "Property", listingId, update, meta);
    return item;
  }

  async deleteListing(
    adminId: string,
    listingId: string,
    meta: { ip?: string; userAgent?: string }
  ) {
    if (!Types.ObjectId.isValid(listingId)) {
      throw new NotFoundException("Listing not found");
    }

    const listingObjectId = new Types.ObjectId(listingId);
    const existing = await this.propertyModel.findById(listingObjectId).lean();
    if (!existing) {
      throw new NotFoundException("Listing not found");
    }

    const matchIds = await this.matchModel
      .find({ propertyId: listingObjectId })
      .distinct("_id")
      .exec();

    if (matchIds.length) {
      await this.messageModel.deleteMany({
        matchId: { $in: matchIds.map((id) => new Types.ObjectId(id)) },
      });
      await this.matchModel.deleteMany({ _id: { $in: matchIds } });
    }

    await this.propertyModel.deleteOne({ _id: listingObjectId });
    await this.logAudit(adminId, "LISTING_DELETED", "Property", listingId, {}, meta);
    return { deleted: true };
  }

  async getAuditLogs(params: { page?: string; limit?: string; action?: string }) {
    const page = Math.max(1, Number(params.page ?? 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit ?? 20) || 20));
    const skip = (page - 1) * limit;
    const filter: FilterQuery<AdminAuditDocument> = {};
    if (params.action) filter.action = params.action;

    const [items, total] = await Promise.all([
      this.auditModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("adminId", "firstName lastName email role")
        .lean(),
      this.auditModel.countDocuments(filter),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async seedDefaultAdmin() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD?.trim();
    if (!email || !password) return;

    const existing = await this.userModel.findOne({ email }).exec();
    if (!existing) return;
    if (existing.role !== UserRole.Admin) {
      existing.role = UserRole.Admin;
      await existing.save();
    }
  }

  private async aggregateDaily(model: Model<any>, match: Record<string, unknown>) {
    return model.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", count: 1 } },
    ]);
  }

  private async logAudit(
    adminId: string,
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, unknown>,
    meta: { ip?: string; userAgent?: string }
  ) {
    if (!Types.ObjectId.isValid(adminId)) return;
    await this.auditModel.create({
      adminId: new Types.ObjectId(adminId),
      action,
      entityType,
      entityId,
      details,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  private async attachLandlordSummaries<
    T extends { landlordId?: Types.ObjectId | string }
  >(items: T[]) {
    if (!items.length) return items;
    const landlordIds = Array.from(
      new Set(
        items
          .map((item) => item.landlordId?.toString?.() ?? "")
          .filter(Boolean)
      )
    );
    if (!landlordIds.length) return items;

    const landlords = await this.userModel
      .find({ _id: { $in: landlordIds } })
      .select("_id firstName lastName email role")
      .lean();
    const byId = new Map(
      landlords.map((landlord) => [
        landlord._id.toString(),
        {
          id: landlord._id.toString(),
          firstName: landlord.firstName,
          lastName: landlord.lastName,
          email: landlord.email,
          role: landlord.role,
        },
      ])
    );

    return items.map((item) => ({
      ...item,
      landlord: byId.get(item.landlordId?.toString?.() ?? ""),
    }));
  }
}
