import { Injectable } from '@nestjs/common'
import { OrdersService } from '../orders/orders.service'
import { DriversService } from '../drivers/drivers.service'
import { CustomersService } from '../customers/customers.service'
import { IDriver } from '../../data/interfaces/drivers.interface'
import { ICustomer } from '../../data/interfaces/customer.interface'
import { IOrder, OrderStatus } from '../../data/interfaces/orders.interface'
import { ShopRegistrationService } from '../shop-registration/shop-registration.service'
import { BuildingMaterialsService } from '../building-materials/building-materials.service'
import { FinishingMaterialsService } from '../finishing-materials/finishing-materials.service'

@Injectable()
export class DashboardService {
  constructor(
    protected readonly ordersService: OrdersService,
    protected readonly driversService: DriversService,
    protected readonly customersService: CustomersService,
    protected readonly suppliersService: ShopRegistrationService,
    protected readonly buildingMaterialService: BuildingMaterialsService,
    protected readonly finishingMaterialService: FinishingMaterialsService
  ) {
  }

  async allData(): Promise<any> {
    const drivers = ((await this.driversService.getByStatus(
      'Active'
    )) as IDriver[]).length
    const suppliers = await this.suppliersService.totalSuppliers()
    const orders = ((await this.ordersService.getByStatus(
      OrderStatus.Pending
    )) as IOrder[]).length
    const customers = ((await this.customersService.fetch()) as ICustomer[])
      .length

    const count: number =
      ((await this.buildingMaterialService.fetch()) as []).length +
      ((await this.finishingMaterialService.fetch()) as []).length

    return {
      drivers: drivers,
      suppliers: suppliers,
      orders: orders,
      customers: customers,
      productSold: count
    }
  }
}
