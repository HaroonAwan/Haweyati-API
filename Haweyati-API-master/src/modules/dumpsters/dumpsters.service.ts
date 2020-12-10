import { Model } from 'mongoose'
import { Injectable } from "@nestjs/common"
import { InjectModel } from '@nestjs/mongoose'
import { SimpleService } from 'src/common/lib/simple.service'
import { IDumpster } from '../../data/interfaces/dumpster.interface'
import { IShopRegistration } from '../../data/interfaces/shop-registration.interface'
import { ShopRegistrationService } from '../shop-registration/shop-registration.service'

@Injectable()
export class DumpstersService extends SimpleService<IDumpster> {
  constructor(
    @InjectModel('dumpsters')
    protected readonly model: Model<IDumpster>,
    private readonly service: ShopRegistrationService
  ) {
    super(model)
  }

  async fetch(id?: string): Promise<IDumpster[] | IDumpster> {
    if (id) {
      const data = await this.model.findOne({ _id: id, status: 'Active' }).exec()
      for (let i = 0; i < data.suppliers.length; ++i) {
        data.suppliers[i] = (await this.service.fetch(
          data.suppliers[i].toString()
        )) as IShopRegistration
      }
      return data
    } else {
      const big = await this.model.find({ status: 'Active' }).exec()
      for (const data of big) {
        for (let i = 0; i < data.suppliers.length; ++i) {
          data.suppliers[i] = (await this.service.fetch(
            data.suppliers[i].toString()
          )) as IShopRegistration
        }
      }
      return big
    }
  }

  async create(document: IDumpster): Promise<IDumpster> {
    await this.service.checkPricingAccordingToSuppliers(document)
    return super.create(document);
  }

  async fromSuppliers(id: string): Promise<IDumpster[]> {
    const dump = await this.model.find({ status: 'Active' }).exec()
    const result = []

    for (const item of dump) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (item.suppliers.includes(id)) {
        result.push(item)
      }
    }

    return result
  }

  async getByCity(city: string): Promise<any> {
    if (city) {
      const data = await this.service.getDataFromCityName(
        city,
        'Construction Dumpster'
      )
      const dump = await this.model.find().exec()
      const result = new Set()

      for (const item of dump) {
        for (const supplier of data) {
          if (item.suppliers.includes(supplier)) {
            result.add(item)
          }
        }
      }
      return Array.from(result)
    }
  }

  async remove(id: string): Promise<IDumpster> {
    return await this.model.findByIdAndUpdate(id, { status: 'Inactive' }).exec()
  }
}
