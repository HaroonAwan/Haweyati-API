import * as moment from 'moment'
import { Model } from 'mongoose'
import { InjectModel } from '@nestjs/mongoose'
import { FcmService } from '../fcm/fcm.service'
import { PersonsService } from '../persons/persons.service'
import { DriversService } from '../drivers/drivers.service'
import { SimpleService } from '../../common/lib/simple.service'
import { LocationUtils } from '../../common/lib/location-utils'
import { CustomersService } from '../customers/customers.service'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { VehicleTypeService } from '../vehicle-type/vehicle-type.service'
import { IVehicleType } from '../../data/interfaces/vehicleType.interface'
import { IDriversInterface } from '../../data/interfaces/drivers.interface'
import { IOrders, OrderStatus } from '../../data/interfaces/orders.interface'
import { AdminNotificationsService } from '../admin-notifications/admin-notifications.service'

@Injectable()
export class OrdersService extends SimpleService<IOrders> {
  constructor(
    @InjectModel('orders')
    protected readonly model: Model<IOrders>,
    protected readonly fcmService: FcmService,
    protected readonly driverService: DriversService,
    protected readonly personsService: PersonsService,
    protected readonly customersService: CustomersService,
    protected readonly vehicleTypeService: VehicleTypeService,
    protected readonly adminNotificationsService: AdminNotificationsService
  ) {
    super(model)
  }

  async create(document: IOrders): Promise<IOrders> {
    console.log(document)
    // @ts-ignore
    if (document.customer.status != 'Blocked') {
      document.orderNo =
        'HW' +
        moment().format('YY') +
        moment().format('MM') +
        (
          '0000' +
          ((await this.model
            .find({
              createdAt: {
                $lt: moment().endOf('month'),
                $gte: moment().startOf('month')
              }
            })
            .countDocuments()
            .exec()) +
            1)
        ).slice(-4)

      //order generation
      const orderCreated = await super.create(document)

      //notification for admin
      if (orderCreated) {
        const notification = {
          type: 'Order',
          title: 'New Order',
          message: 'New Order with Ref. # ' + document.orderNo + '.'
        }
        await this.adminNotificationsService.create(notification)
      }
      orderCreated.customer = await this.customersService.fetch(
        // @ts-ignore
        document.customer
      )
      return orderCreated
    } else {
      throw new HttpException(
        "You are blocked by Admin! You can't place order, contact Haweyati Support for help.",
        HttpStatus.NOT_ACCEPTABLE
      )
    }
  }

  async addImage(data: any): Promise<IOrders> {
    const order = (await this.model.findById(data.id)) as IOrders
    if (order.image) order.image.push(data.image)
    else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      order.image = [data.image]
    }

    // @ts-ignore
    return (await order.save()).image.name
  }

  async getPerson(all: any): Promise<any> {
    if (Array.isArray(all)) {
      for (const data of all) {
        data.customer.profile = await this.personsService.fetch(
          data.customer.profile
        )
      }
    } else {
      all.customer.profile = await this.personsService.fetch(
        all.customer.profile
      )
    }
    return all
  }

  async getByCustomerId(id: string): Promise<IOrders[]> {
    return await this.model
      .find({ customer: id })
      .sort({ createdAt: -1 })
      .exec()
  }

  async getSearchByCustomerId(id: string, name?: string): Promise<IOrders[]> {
    let data: any

    if (name) {
      data = await this.model
        .find({
          customer: id,
          $or: [
            { service: { $regex: name, $options: 'i' } },
            { orderNo: { $regex: name, $options: 'i' } }
          ]
        })
        .populate('customer')
        .sort({ createdAt: -1 })
        .exec()
    } else {
      data = await this.model
        .find({
          customer: id
        })
        .populate('customer')
        .sort({ createdAt: -1 })
        .exec()
    }
    return this.getPerson(data)
  }

  async getByDriverId(id: string): Promise<IOrders[]> {
    return this.getPerson(
      await this.model
        .find({ 'driver._id': id })
        .populate('customer')
        .sort({ createdAt: -1 })
        .exec()
    )
  }

  async completedDriverId(id: string): Promise<IOrders[]> {
    return this.getPerson(
      await this.model
        .find({ 'driver._id': id, status: OrderStatus.Delivered })
        .populate('customer')
        .sort({ createdAt: -1 })
        .exec()
    )
  }

  async getBySupplierId(id: string): Promise<any> {
    return await this.getPerson(
      await this.model
        .find({ status: OrderStatus.Accepted })
        .where('supplier._id: id')
        .populate('customer')
        .exec()
    )
  }

  async getAssignedOrdersBySupplierId(id: string): Promise<any> {
    const result = new Set()
    const orders = (await this.fetch()) as IOrders[]
    for (const order of orders) {
      for (const one of order.items) {
        // @ts-ignore
        if (one.supplier?._id == id && order.status == OrderStatus.Preparing) {
          result.add(order)
          break
        }
      }
    }
    return Array.from(result)
  }

  async getOrdersBySupplierAndStatus(id: string, status: number): Promise<any> {
    return await this.getPerson(
      await this.model
        .find({ status: status })
        .where('supplier._id', id)
        .populate('customer')
        .exec()
    )
  }

  async getOrdersByDriverAndStatus(id: string, status: number): Promise<any> {
    return await this.getPerson(
      await this.model
        .find({ status: status })
        .where('driver._id', id)
        .populate('customer')
        .sort({createdAt: -1})
        .exec()
    )
  }

  async completedSupplierId(id: string): Promise<any> {
    const result = new Set()
    const orders = (await this.getPerson(
      await this.model
        .find({ status: OrderStatus.Delivered })
        .populate('customer')
        .sort({ createdAt: -1 })
        .exec()
    )) as IOrders[]
    for (const order of orders) {
      for (const one of order.items) {
        // @ts-ignore
        if (one.supplier?._id == id) {
          result.add(order)
        }
      }
    }
    return Array.from(result)
  }

  async dispatchedSupplier(id: string): Promise<any> {
    const result = new Set()
    const orders = (await this.getPerson(
      await this.model
        .find({ status: OrderStatus.Dispatched })
        .populate('customer')
        .sort({ createdAt: -1 })
        .exec()
    )) as IOrders[]
    for (const order of orders) {
      for (const one of order.items) {
        // @ts-ignore
        if (one.supplier?._id == id) {
          result.add(order)
        }
      }
    }
    return Array.from(result)
  }

  async dispatchedDriver(id: string): Promise<any> {
    return (await this.getPerson(
      await this.model
        .find({ status: OrderStatus.Dispatched, 'driver._id': id })
        .populate('customer')
        .sort({ createdAt: -1 })
        .exec()
    )) as IOrders[]
  }

  async preparingDriver(id: string): Promise<any> {
    return (await this.getPerson(
      await this.model
        .find({ status: OrderStatus.Preparing, 'driver._id': id })
        .populate('customer')
        .sort({ createdAt: -1 })
        .exec()
    )) as IOrders[]
  }

  async fetch(id?: string): Promise<IOrders[] | IOrders> {
    if (id) {
      const data = await this.model
        .findById(id)
        .populate('customer')
        .exec()
      return await this.getPerson(data)
    } else {
      let all = await this.model
        .find()
        .populate('customer')
        .sort({ createdAt: -1 })
        .exec()
      all = await this.getPerson(all)
      return all
    }
  }

  //also used in reports module
  async getByStatus(status: OrderStatus) {
    let all = await this.model
      .find({ status })
      .populate('customer')
      .sort({ createdAt: -1 })
      .exec()
    all = await this.getPerson(all)
    return all
  }

  async updateStatus(id: string, status: OrderStatus, message?: string) {
    await this.model.findByIdAndUpdate(id, { status, reason: message }).exec()
    const order = await this.model.findById(id).exec()
    const persons = new Set<string>()

    // @ts-ignore
    persons.add(
      (
        await this.customersService.fetch(order.customer.toString())
      ).profile._id.toString()
    )
    if (order.driver) {
      // @ts-ignore
      persons.add(order.driver.profile._id.toString())
    }
    if (order.supplier) {
      // @ts-ignore
      persons.add(order.supplier.person._id.toString())
    }

    const notificationStatus = this.getStatusString(status)

    for (const id of persons) {
      await this.fcmService.sendSingle({
        id: id,
        title: 'Order Status Update',
        body:
          status == OrderStatus.Delivered
            ? 'Your order has been delivered! Order # ' + order.orderNo
            : 'Your Order Status has been changed to ' +
              notificationStatus +
              ' Order # ' +
              order.orderNo
      })
    }
    return order
  }

  getStatusString(status: OrderStatus): string {
    let notificationStatus: string
    switch (status) {
      case OrderStatus.Accepted:
        notificationStatus = 'Accepted'
      case OrderStatus.Delivered:
        notificationStatus = 'Delivered'
      case OrderStatus.Dispatched:
        notificationStatus = 'Dispatched'
      case OrderStatus.Pending:
        notificationStatus = 'Pending'
      case OrderStatus.Preparing:
        notificationStatus = 'Preparing'
      case OrderStatus.Cancelled:
        notificationStatus = 'Cancelled'
      case OrderStatus.Rejected:
        notificationStatus = 'Rejected'
    }
    console.log(notificationStatus)
    return notificationStatus
  }

  async search(query: any) {
    const data = await this.model
      .find({
        $or: [
          { service: { $regex: query.name, $options: 'i' } },
          { orderNo: { $regex: query.name, $options: 'i' } }
        ],
        status: OrderStatus.Pending
      })
      .populate('customer')
      .sort({ createdAt: -1 })
      .exec()

    return this.getPerson(data)
  }

  async viewOrders(data: any): Promise<any> {
    const results = new Set()
    const orders = await this.model
      .find({ city: data.city })
      .sort({ createdAt: -1 })
      .exec()
    for (const index of orders) {
      for (const item of data.services) {
        if (index.service == item) {
          results.add(index)
        }
      }
    }
    return Array.from(results)
  }

  async getByDate(date: string): Promise<any[]> {
    const orders = await this.getByStatus(OrderStatus.Delivered)
    const result = []
    for (const order of orders) {
      // @ts-ignore
      const convertedDate = moment(order.updatedAt).format('MM-DD-YYYY')
      if (convertedDate == date) {
        result.push(order)
      }
    }
    return result
  }

  async getByWeek(date: number): Promise<any[]> {
    const orders = await this.getByStatus(OrderStatus.Delivered)
    const result = []
    for (const order of orders) {
      // @ts-ignore
      const convertedDate = moment(order.updatedAt).week()
      if (date == convertedDate) {
        result.push(order)
      }
    }
    return result
  }

  async getByMonth(date: number): Promise<any[]> {
    const orders = await this.getByStatus(OrderStatus.Delivered)
    const result = []
    for (const order of orders) {
      // @ts-ignore
      const convertedDate = moment(order.updatedAt).month() + 1
      if (date == convertedDate) {
        result.push(order)
      }
    }
    return result
  }

  async getByYear(date: number): Promise<any[]> {
    const orders = await this.getByStatus(OrderStatus.Delivered)
    const result = []
    for (const order of orders) {
      // @ts-ignore
      const convertedDate = moment(order.updatedAt).year()
      if (date == convertedDate) {
        result.push(order)
      }
    }
    return result
  }

  async getCustom(date: string, dateTo: string): Promise<any[]> {
    const orders = await this.getByStatus(OrderStatus.Delivered)
    const result = []
    for (const order of orders) {
      // @ts-ignore
      const convertedDate = moment(order.updatedAt).format('MM-DD-YYYY')
      if (convertedDate >= date && convertedDate <= dateTo) {
        result.push(order)
      }
    }
    return result
  }

  // async getByProduct(date: string, dateTo: string): Promise<any[]>{
  //   let orders = await this.getByStatus('completed')
  //   let name = [], qty = [], total = [], result = []
  //   for (let order of orders){
  //     // @ts-ignore
  //     const convertedDate = moment(order.updatedAt).format('MM-DD-YYYY')
  //     if (convertedDate >= date && convertedDate <= dateTo){
  //       for (let i=0; i< order.details.items.length; ++i){
  //         let flag: boolean = false
  //         switch (order.service) {
  //           case 'Construction Dumpster': {
  //             if (name.length > 0) {
  //               for (let j = 0; j < name.length; ++j) {
  //                 if (name[j] == order.details.items[i].product.size + ' Yard Dumpster') {
  //                   qty[j] += 1
  //                   total[j] += +order.details.items[i].total
  //                   flag = true
  //                   break
  //                 }
  //               }
  //               if (!flag){
  //                 name.push(order.details.items[i].product.size + ' Yard Dumpster')
  //                 qty.push(1)
  //                 total.push(+order.details.items[i].total)
  //                 break
  //               }
  //             } else {
  //               name.push(order.details.items[i].product.size + ' Yard Dumpster')
  //               qty.push(1)
  //               total.push(+order.details.items[i].total)
  //             }
  //           }
  //           case 'Building Material': {
  //             if (name.length > 0) {
  //               for (let j = 0; j < name.length; ++j) {
  //                 if (name[j] == (order.details.items[i].product.name + ' ' + order.details.items[i].size)) {
  //                   qty[j] += +order.details.items[i].qty
  //                   total[j] += +order.details.items[i].total
  //                   flag = true
  //                   break
  //                 }
  //               }
  //               if (!flag){
  //                 name.push(order.details.items[i].product.name + ' ' + order.details.items[i].size)
  //                 qty.push(+order.details.items[i].qty)
  //                 total.push(+order.details.items[i].total)
  //                 break
  //               }
  //             } else {
  //               name.push(order.details.items[i].product.name + ' ' + order.details.items[i].size)
  //               qty.push(+order.details.items[i].qty)
  //               total.push(+order.details.items[i].total)
  //             }
  //           }
  //           case 'Finishing Material': {
  //             if (name.length > 0) {
  //               for (let j = 0; j < name.length; ++j) {
  //                 if (name[j] == (order.details.items[i].product.name)) {
  //                   qty[j] += +order.details.items[i].qty
  //                   total[j] += +order.details.items[i].total
  //                   flag = true
  //                   break
  //                 }
  //                 if (!flag){
  //                   name.push(order.details.items[i].product.name)
  //                   qty.push(+order.details.items[i].qty)
  //                   total.push(+order.details.items[i].total)
  //                   break
  //                 }
  //               }
  //             } else {
  //               name.push(order.details.items[i].product.name)
  //               qty.push(+order.details.items[i].qty)
  //               total.push(+order.details.items[i].total)
  //             }
  //           }
  //           case 'Scaffolding': {
  //             if (name.length > 0) {
  //               for (let j = 0; j < name.length; ++j) {
  //                 if (name[j] == (order.details.items[i].name + ' ' + order.details.items[i].size)) {
  //                   qty[j] += +order.details.items[i].qty
  //                   total[j] += +order.details.items[i].total
  //                   flag = true
  //                   break
  //                 }
  //                 if (!flag){
  //                   name.push(order.details.items[i].name + ' ' + order.details.items[i].size)
  //                   qty.push(+order.details.items[i].qty)
  //                   total.push(+order.details.items[i].total)
  //                   break
  //                 }
  //               }
  //             } else {
  //               name.push(order.details.items[i].name + ' ' + order.details.items[i].size)
  //               qty.push(+order.details.items[i].qty)
  //               total.push(+order.details.items[i].total)
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }
  //   for (let i=0; i< name.length; ++i){
  //     result.push({
  //       name: name[i],
  //       quantity: qty[i],
  //       total: total[i]
  //     })
  //   }
  //   return result
  // }

  async AddSupplierToAllItem(data: any): Promise<any> {
    const order = await this.model.findById(data._id).populate('customer').exec()
    if (data.flag) {
      //move these two statement below on your own risk
      order.supplier = data.supplier
      order.status = OrderStatus.Accepted
      if (order.service != 'Construction Dumpster'){
        // @ts-ignore
        const distance = await LocationUtils.getDistance(order.dropoff.dropoffLocation.latitude, order.dropoff.dropoffLocation.longitude, order.supplier.location.latitude, order.supplier.location.longitude)
        let volumetricWeight = 0
        for (const item of order.items){
          // @ts-ignore
          volumetricWeight += (item.item.product.volumetricWeight * item.item.qty)
        }
        const vehicle = await this.vehicleTypeService.findClosestVehicle(volumetricWeight) as IVehicleType
        order.deliveryFee = vehicle[0].deliveryCharges * distance
        order.volumetricWeight = volumetricWeight
      }
    } else {
      if (order.service != 'Construction Dumpster' && order.service != 'Delivery Vehicle'){
        order.paymentType = null
        order.deliveryFee = null
      }
      order.supplier = undefined
      order.status = OrderStatus.Pending
      order.supplierCancellationReason = {
        supplier: data.supplier._id,
        message: data.reason
      }
    }
    return await order.save()
  }

  async AddDriver(data: any): Promise<any> {
    if (data.flag) {
      const order = await this.model
        .findById(data._id)
        .populate('customer')
        .exec()
      if (!order.driver) {
        if (
          order.service == 'Scaffolding' ||
          order.service == 'Building Material'
        ) {
          const distance = await LocationUtils.getDistance(
            // @ts-ignore
            order.customer.location.latitude,
            // @ts-ignore
            order.customer.location.longitude,
            // @ts-ignore
            order.supplier.location.latitude,
            // @ts-ignore
            order.supplier.location.longitude
          )
          order.driver = data.driver
          order.deliveryFee =
            distance * data.driver.vehicle.type.deliveryCharges
          order.total += order.deliveryFee
          order.status = OrderStatus.Preparing
          await order.save()

          // @ts-ignore
          await this.fcmService.sendSingle({
            // @ts-ignore
            id: order.customer.profile._id,
            title:
              'You order #' + order.orderNo + 'is awaiting payment selection!',
            body: 'Please select payment method for order page to proceed.'
          })
        } else {
          order.driver = data.driver
          order.status = OrderStatus.Preparing
          await order.save()

          // @ts-ignore
          await this.fcmService.sendSingle({
            id: data.driver.profile._id,
            title: 'You have been assigned an order!',
            body: 'Order # ' + order.orderNo
          })
        }
        // this.fcmService.sendSingle({id: order.customer.profile._id, title: "Your order status has been changed to "+ this.getStatusString(OrderStatus.Preparing), body: 'Order # '+ order.orderNo})
      } else {
        throw new HttpException(
          'Order Not Available!',
          HttpStatus.NOT_ACCEPTABLE
        )
      }
    } else {
      return await this.model
        .findOneAndUpdate(
          { _id: data._id },
          { driver: undefined, status: OrderStatus.Accepted }
        )
        .exec()
    }
  }

  async processPayment(data: any): Promise<IOrders> {
    const order = await this.model
      .findByIdAndUpdate(data._id, {
        paymentType: data.paymentType,
        paymentIntentId: data.paymentIntentId
      })
      .exec()
    // @ts-ignore
    await this.fcmService.sendSingle({
      // @ts-ignore
      id: order.supplier.person._id,
      title:
        'Order #' + order.orderNo + ' payment is confirmed!',
      body: 'Please proceed with the order.'
    })
    return order
  }

  async filter(data: any): Promise<IOrders[]> {
    const result = new Set<any>()
    const orders = await this.model
      .find({ city: data.city, status: OrderStatus.Pending, service: {$ne: 'Delivery Vehicle'} })
      .populate('customer')
      .sort({ createdAt: -1 })
      .exec()
    for (const order of orders) {
      if (data.services.includes(order.service)) {
        // @ts-ignore
        order.customer.profile = await this.personsService.fetch(
          // @ts-ignore
          order.customer.profile
        )
        result.add(order)
      }
    }
    return Array.from(result)
  }

  async getDriverOrdersFromCity(city: string): Promise<IOrders[]> {
    return await this.getPerson(
      await this.model
        .find({ city, service: 'Delivery Vehicle' })
        .populate('customer')
        .sort({ createdAt: -1 })
        .exec()
    )
  }

  async estimateDistanceAndPrice(data: any): Promise<any> {
    const distance = +(await LocationUtils.getDistance(
      data.pickUpLat,
      data.pickUpLng,
      data.dropOffLat,
      data.dropOffLng
    ))
    return {
      distance,
      price:
        distance *
        +((await this.vehicleTypeService.fetch(data.vehicle)) as IVehicleType)
          ?.deliveryCharges
    }
  }

  async ordersFromVolumetricWeight(city: string, driverId: string): Promise<IOrders[]>{
    const driver  = await this.driverService.fetch(driverId) as IDriversInterface
    const orders = (await this.model.find(
      {
        // @ts-ignore
        volumetricWeight: {$lte: driver.vehicle.type.volumetricWeight},
        paymentType: {$ne: null},
        driver: {$eq: null},
        city,
        service: {$ne: 'Delivery Vehicle'}
      }).populate('customer').exec()) as IOrders[]
    // @ts-ignore
    const dvOrders = await this.model.find({service: 'Delivery Vehicle', status: OrderStatus.Pending}).populate('customer').exec() as IOrders[]
    for (const singleOrder of dvOrders){
      // @ts-ignore
      if (singleOrder.items[0].item.product._id == driver.vehicle.type._id){
        orders.push(singleOrder)
      }
    }
    return await this.getPerson(orders)
  }
}
