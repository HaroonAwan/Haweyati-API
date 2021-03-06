import { Module } from '@nestjs/common'
import { OrdersModule } from '../orders/orders.module'
import { DashboardService } from './dashboard.service'
import { DriversModule } from '../drivers/drivers.module'
import { DashboardController } from './dashboard.controller'
import { CustomersModule } from '../customers/customers.module'
import { ShopRegistrationModule } from '../shop-registration/shop-registration.module'
import { BuildingMaterialsModule } from '../building-materials/building-materials.module'
import { FinishingMaterialsModule } from '../finishing-materials/finishing-materials.module'

@Module({
  imports: [
    OrdersModule,
    DriversModule,
    CustomersModule,
    ShopRegistrationModule,
    BuildingMaterialsModule,
    FinishingMaterialsModule
  ],
  providers: [DashboardService],
  controllers: [DashboardController]
})
export class DashboardModule {
}
