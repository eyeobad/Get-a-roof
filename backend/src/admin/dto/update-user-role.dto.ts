import { IsIn } from "class-validator";
import { UserRole } from "../../common/enums";

export class UpdateUserRoleDto {
  @IsIn([UserRole.Tenant, UserRole.Landlord, UserRole.Admin])
  role: UserRole.Tenant | UserRole.Landlord | UserRole.Admin;
}
