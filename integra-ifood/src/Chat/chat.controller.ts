import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('conversations')
  async getConversations(@Request() req) {
    return this.chatService.getConversations(req.user.userId);
  }

  @Get('history/:otherUserId')
  async getHistory(@Request() req, @Param('otherUserId') otherUserId: string) {
    return this.chatService.getMessagesBetweenUsers(req.user.userId, otherUserId);
  }
}
