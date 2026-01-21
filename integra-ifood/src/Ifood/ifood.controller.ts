import { Controller, Post, Query } from '@nestjs/common';
import { IfoodService } from './ifood.service';
import { Cron } from '@nestjs/schedule';
import { SankhyaService } from '../Sankhya/sankhya.service';



@Controller('ifood')
export class IfoodController {
  constructor(private readonly ifoodService: IfoodService, private readonly sankhyaService: SankhyaService) {}

}
