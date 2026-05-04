import { Injectable } from '@nestjs/common';
import { PrismaService } from '../Prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async saveMessage(senderId: string, receiverId: string, content: string) {
    return this.prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
      },
      include: {
        sender: {
          select: { id: true, email: true },
        },
      },
    });
  }

  async getMessagesBetweenUsers(userId: string, otherUserId: string) {
    // Marcar como lidas
    await this.prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        sender: {
          select: { id: true, email: true },
        },
      },
    });
  }

  async getConversations(userId: string) {
    // Busca usuários com quem houve troca de mensagens
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      select: {
        senderId: true,
        receiverId: true,
      },
    });

    const userIds = new Set<string>();
    messages.forEach((m) => {
      if (m.senderId !== userId) userIds.add(m.senderId);
      if (m.receiverId !== userId) userIds.add(m.receiverId);
    });

    // Também retorna todos os usuários ADMIN e MANAGER para iniciar novas conversas
    const staff = await this.prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'MANAGER'] },
        id: { not: userId },
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    staff.forEach((s) => userIds.add(s.id));

    const finalUsers = await this.prisma.user.findMany({
      where: {
        id: { in: Array.from(userIds) },
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    // Adiciona contagem de mensagens não lidas
    const unreadCounts = await this.prisma.message.groupBy({
      by: ['senderId'],
      where: {
        receiverId: userId,
        read: false,
      },
      _count: true,
    });

    return finalUsers.map((u) => ({
      ...u,
      unreadCount: unreadCounts.find((c) => c.senderId === u.id)?._count || 0,
    }));
  }
}
