import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Property, PropertyDocument } from "../../properties/schemas/property.schema";
import { User, UserDocument } from "../../users/schemas/user.schema";
import { UserRole } from "../enums";

type WorkspaceActorType = "owner" | "agent" | "solo";

export type WorkspaceContext = {
  actorId: string;
  scope: WorkspaceActorType;
  orgId: string | null;
  orgMemberIds: string[];
};

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>
  ) { }

  async getWorkspaceActorContext(actorId: string): Promise<WorkspaceContext> {
    const actor = await this.userModel
      .findById(actorId)
      .select("role agentOrgId")
      .lean()
      .exec();
    if (!actor) {
      throw new BadRequestException("Actor not found");
    }

    if (actor.role === UserRole.Organisation) {
      const orgMemberIds = await this.getOrgMemberIds(actorId);
      return {
        actorId,
        scope: "owner",
        orgId: actorId,
        orgMemberIds,
      };
    }

    if (actor.role === UserRole.Landlord && actor.agentOrgId) {
      const orgId = actor.agentOrgId.toString();
      const orgMemberIds = await this.getOrgMemberIds(orgId);
      return {
        actorId,
        scope: "agent",
        orgId,
        orgMemberIds,
      };
    }

    return {
      actorId,
      scope: "solo",
      orgId: null,
      orgMemberIds: [actorId],
    };
  }

  async getOrgMemberIds(orgId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(orgId)) {
      return [];
    }

    const org = await this.userModel
      .findById(orgId)
      .select("role orgProfile.agentIds")
      .lean()
      .exec();

    if (!org || org.role !== UserRole.Organisation) {
      return [];
    }

    const indexedAgents = (org.orgProfile?.agentIds ?? [])
      .map((id) => id.toString())
      .filter(Boolean);

    const linkedAgentIds = await this.userModel
      .find({ agentOrgId: new Types.ObjectId(orgId) })
      .select("_id")
      .lean()
      .exec();

    const linked = linkedAgentIds.map((item) => item._id.toString());

    const members = new Set<string>([orgId, ...indexedAgents, ...linked]);
    return Array.from(members);
  }

  async getPropertyWorkspaceFilter(
    actorId: string,
    scope: "mine" | "all" = "all"
  ): Promise<Record<string, unknown>> {
    const context = await this.getWorkspaceActorContext(actorId);

    const actorObjectId = this.toObjectId(actorId);
    if (!actorObjectId) {
      return {};
    }

    if (context.scope === "solo" || scope === "mine") {
      return { landlordId: actorObjectId };
    }

    if (!context.orgId) {
      return { landlordId: actorObjectId };
    }

    const orgId = context.orgId;
    const orgObjectId = this.toObjectId(orgId);
    const memberIds = context.orgMemberIds
      .map((id) => this.toObjectId(id))
      .filter(Boolean) as Types.ObjectId[];

    if (!orgObjectId || memberIds.length === 0) {
      return { landlordId: actorObjectId };
    }

    return {
      $or: [
        { orgId: orgObjectId },
        { landlordId: { $in: memberIds } },
      ],
    };
  }

  async canActorManageProperty(
    actorId: string,
    property: PropertyDocument
  ): Promise<boolean> {
    const context = await this.getWorkspaceActorContext(actorId);
    const actorObjectId = this.toObjectId(actorId);
    if (!actorObjectId) {
      return false;
    }

    const propertyOwnerId = property.landlordId?.toString?.();
    if (propertyOwnerId === actorObjectId.toString()) {
      return true;
    }

    // Agents and solo landlords can only mutate their own listings.
    if (context.scope !== "owner") {
      return false;
    }

    const propertyOrgId = property.orgId?.toString?.();
    if (context.orgId && propertyOrgId && propertyOrgId === context.orgId) {
      return true;
    }

    return context.orgMemberIds.includes(propertyOwnerId ?? "");
  }

  async assertCanManageProperty(actorId: string, property: PropertyDocument) {
    const canManage = await this.canActorManageProperty(actorId, property);
    if (!canManage) {
      throw new ForbiddenException("Access denied");
    }
  }

  async listWorkspaceProperties(actorId: string, scope: "mine" | "all") {
    const filter = await this.getPropertyWorkspaceFilter(actorId, scope);
    return this.propertyModel.find(filter).select("_id").lean().exec();
  }

  private toObjectId(value: string | undefined): Types.ObjectId | null {
    if (!value || !Types.ObjectId.isValid(value)) {
      return null;
    }
    return new Types.ObjectId(value);
  }
}
