import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsersService } from "../users/users.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>("JWT_SECRET") ||
        (() => {
          throw new Error("JWT_SECRET is required");
        })(),
    });
  }

  async validate(payload: { sub?: string; email?: string; role?: string | string[] }) {
    const userId = payload?.sub;
    if (!userId) {
      throw new UnauthorizedException("Invalid token payload");
    }

    try {
      const user = await this.usersService.findById(userId);
      return {
        sub: user.id,
        email: user.email,
        role: user.role,
      };
    } catch {
      throw new UnauthorizedException("Account no longer exists");
    }
  }
}
