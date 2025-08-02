import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { SignInDTO, SignUpDTO } from './dtos/auth';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { User } from 'generated/prisma';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('signup')
  async signUp(@Body() body: SignUpDTO) {
    return this.authService.signUp(body);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('signin')
  async signIn(@Body() body: SignInDTO) {
    return this.authService.signIn(body);
  }

  @UseGuards(AuthGuard)
  @Get('users')
  @HttpCode(HttpStatus.OK)
  async getAllUsers(): Promise<User[] | null> {
    return this.authService.getAll();
  }

  @HttpCode(HttpStatus.OK)
  @Get('verify')
  async verifyToken(@Req() req: Request) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new BadRequestException('Token ausente ou mal informado');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtConstants.secret,
      });

      return { valid: true };
    } catch (e) {
      throw new BadRequestException('Token inválido ou expirado');
    }
  }
}
