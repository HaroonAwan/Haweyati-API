import { DriversService } from './drivers.service'
import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { IDriver } from '../../data/interfaces/drivers.interface'
import { ImageController } from '../../common/lib/image.controller'
import { FileInterceptor } from "@nestjs/platform-express";
import { ImageConversionUtils } from "../../common/lib/image-conversion-utils";
import { dtoDriver } from "../../data/dtos/driver.dto";

@Controller('drivers')
export class DriversController extends ImageController<IDriver> {
  constructor(protected readonly service: DriversService) {
    super(service)
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async post(@UploadedFile() file, @Body() data: dtoDriver): Promise<IDriver> {
    if (file) {
      data.image = {
        name: file.filename,
        path: file.path
      }
      await ImageConversionUtils.toWebp(data.image.path)
    } else {
      data.image = undefined
    }

    return await this.service.createDriver(data)
  }

  @Patch()
  @UseInterceptors(FileInterceptor('image'))
  async patch(@UploadedFile() file, @Body() data: dtoDriver): Promise<IDriver> {

    if (file) {
      data.image = {
        name: file.filename,
        path: file.path
      }
      await ImageConversionUtils.toWebp(data.image.path)
    }
    return await this.service.changeDriver(data)
  }

  @Get('getrequests')
  async getRequests(): Promise<IDriver[]> {
    return await this.service.getByStatus('Pending')
  }

  @Get('getverified')
  async getVerifiedDrivers(): Promise<IDriver[]> {
    return await this.service.getByStatus('Active')
  }

  @Get('getverified/stand-alone')
  async getVerifiedStandAloneDrivers(): Promise<IDriver[]> {
    return await this.service.getVerifiedStandAloneDrivers()
  }

  @Get('getrejected')
  async getRejectedDrivers(): Promise<IDriver[]> {
    return await this.service.getByStatus('Rejected')
  }

  @Get('getblocked')
  async getBlockedDrivers(): Promise<IDriver[]> {
    return await this.service.getByStatus('Blocked')
  }

  @Patch('getverified/:id')
  async getVerified(@Param('id') id: string): Promise<IDriver> {
    return await this.service.updateByStatus(id, 'Active')
  }

  @Patch('getrejected/:id')
  async getRejected(@Param('id') id: string): Promise<IDriver> {
    return await this.service.getRejected(id)
  }

  @Patch('getblocked/:id')
  async getBlocked(@Param('id') id: string): Promise<IDriver> {
    return this.service.updateByStatus(id, 'Blocked')
  }

  @Patch('getunblocked/:id')
  async getUnblocked(@Param('id') id: string): Promise<IDriver> {
    return await this.service.updateByStatus(id, 'Active')
  }

  @Get('supplier/:id')
  async getCompanyDrivers(@Param('id') id: string): Promise<IDriver[]> {
    return await this.service.getCompanyDrivers(id)
  }

  @Get('getbyperson/:id')
  async getByPersonId(@Param('id') id: string): Promise<IDriver> {
    return await this.service.getByPersonId(id)
  }

  @Patch('remove-device-id/:id')
  async removeDeviceId(@Param('id') id: string): Promise<IDriver> {
    return await this.service.removeDeviceId(id)
  }
}
