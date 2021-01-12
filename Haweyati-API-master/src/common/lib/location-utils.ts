import { get } from 'https'
import { HttpException, HttpStatus } from '@nestjs/common'
import { Client } from '@googlemaps/google-maps-services-js'

export class LocationUtils {
  static async getLocationData(lat: any, lng: any): Promise<any> {
    const client = new Client({})

    let location = null
    try {
      location = await client.reverseGeocode({
        params: {
          latlng: [lat, lng],
          key: 'AIzaSyDSz2Q7d49FVjGoAW2k8eWFXSdQbbipVc8'
        },
        timeout: 1000
      })
    } catch (e) {
      console.log(e.response)
    }
    return location?.data
  }

  static async getCity(lat: any, lng: any): Promise<string> {
    const location = await this.getLocationData(lat, lng)
    for (const index of location?.results[0]?.address_components) {
      if (index.types.includes('locality')) {
        return index.long_name
      } else if (index.types.includes('administrative_area_level_2')) {
        return index.long_name
      }
    }
    throw new HttpException(
      "can't find city, try again!",
      HttpStatus.NOT_ACCEPTABLE
    )
  }

  static async getAddress(lat: any, lng: any): Promise<string> {
    const location = await this.getLocationData(lat, lng)
    return location?.results[0]?.formatted_address
  }

  static async getDistance(p1lat: any, p1lng: any, p2lat: any, p2lng: any) {
    try {
      const data = await getRequest(
        'https://maps.googleapis.com/maps/api/distancematrix/json?origins=' +
          p1lat +
          ',' +
          p1lng +
          '&destinations=' +
          p2lat +
          ',' +
          p2lng +
          '&key=AIzaSyDSz2Q7d49FVjGoAW2k8eWFXSdQbbipVc8'
      )
      // @ts-ignore
      return data.rows[0].elements[0].distance.text.split(' ')[0]
    } catch (e) {
      console.log("Can't find distance")
    }
  }
}

function getRequest(url: string) {
  return new Promise((resolve, reject) => {
    let data = ''
    get(url, message => {
      message.on('data', _ => (data += _))
      message.on('error', reject)
      message.on('end', () => resolve(JSON.parse(data)))
    })
  })
}
