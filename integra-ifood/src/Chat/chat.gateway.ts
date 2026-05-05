import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ChatGateway');
  private userSockets = new Map<string, string[]>(); // userId -> socketIds[]

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    const userId = (client.handshake.query.userId || client.handshake.auth?.userId) as string;
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      this.userSockets.set(userId, [...sockets, client.id]);
      this.logger.log(`User ${userId} connected on socket ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client.handshake.query.userId || client.handshake.auth?.userId) as string;
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      this.userSockets.set(
        userId,
        sockets.filter((id) => id !== client.id),
      );
      this.logger.log(`User ${userId} disconnected from socket ${client.id}`);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; content: string },
  ) {
    const senderId = (client.handshake.query.userId || client.handshake.auth?.userId) as string;
    if (!senderId) return;

    const message = await this.chatService.saveMessage(
      senderId,
      data.receiverId,
      data.content,
    );

    // Enviar para o destinatário (se estiver online)
    const receiverSockets = this.userSockets.get(data.receiverId);
    if (receiverSockets) {
      receiverSockets.forEach((socketId) => {
        this.server.to(socketId).emit('newMessage', message);
      });
    }

    // Enviar confirmação para o remetente (outras abas dele também)
    const senderSockets = this.userSockets.get(senderId);
    if (senderSockets) {
      senderSockets.forEach((socketId) => {
        this.server.to(socketId).emit('messageSent', message);
      });
    }
  }
}
