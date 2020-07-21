import {Document} from "mongoose";
import { IShopRegistrationInterface } from './shopRegistration.interface';
import { IImage } from './image.interface';
import { IBuildingMaterialCategory } from "./buildingMaterialCategory.interface";

export interface IBuildingMaterialsInterface extends Document{
  name: string,
  description: string,
  parent: IBuildingMaterialCategory,
  suppliers : IShopRegistrationInterface[],
  images: IImage[],
  pricing: [
    {city:string},
    {price: number}
  ],
  status: string
}