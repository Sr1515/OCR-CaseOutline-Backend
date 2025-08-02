import { Injectable, InternalServerErrorException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { SignInDTO, SignUpDTO } from './dtos/auth';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from "bcrypt"
import { JwtService } from '@nestjs/jwt';
import { User } from 'generated/prisma';

@Injectable()
export class AuthService {
    constructor(
        private readonly prismaService: PrismaService,
        private jwtService: JwtService
    ) { }

    async signUp(data: SignUpDTO) {

        const userAlreadyExists = await this.prismaService.user.findUnique({
            where: {
                email: data.email
            }
        })

        if (userAlreadyExists) {
            throw new UnauthorizedException("Usuário já existe");
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const newUser = await this.prismaService.user.create({
            data: {
                ...data,
                password: hashedPassword
            }
        });

        return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.username
        }
    }

    async signIn(data: SignInDTO) {

        const user = await this.prismaService.user.findUnique({
            where: {
                email: data.email
            }
        })

        if (!user) {
            throw new UnauthorizedException('credenciais inválidas')
        }

        const passwordMatch = await bcrypt.compare(data.password, user.password);

        if (!passwordMatch) {
            throw new UnauthorizedException('credenciais inválidas');
        }

        const accessToken = await this.jwtService.signAsync({
            id: user.id,
            name: user.username,
            email: user.email
        })

        return { accessToken };

    }

    async getAll(): Promise<User[] | null> {
        try {
            return await this.prismaService.user.findMany();
        } catch (error) {
            console.error('Erro inesperado:', error);
            throw new InternalServerErrorException('Erro ao buscar usuários');
        }
    }

}