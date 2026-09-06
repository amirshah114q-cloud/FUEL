import { NavigatorScreenParams } from '@react-navigation/native';
import { OcrProcessResponse } from './models';
import { FuelFilterState } from './filters';
import { PickedFile } from '../utils/pickers';

export type DriverTabsParamList = {
  Home: undefined;
  MyEntries: undefined;
  Profile: undefined;
};

export type OfficeTabsParamList = {
  Dashboard: undefined;
  Records: { pendingFilter?: FuelFilterState } | undefined;
  Drivers: undefined;
  Vehicles: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  DriverTabs: NavigatorScreenParams<DriverTabsParamList> | undefined;
  OfficeTabs: NavigatorScreenParams<OfficeTabsParamList> | undefined;
  UploadSlip: undefined;
  SlipPreview: { file: PickedFile };
  OcrReview: { file: PickedFile; ocr: OcrProcessResponse };
  EntryDetail: { entryId: string };
  DriverForm: { driverId?: string } | undefined;
  VehicleForm: { vehicleId?: string } | undefined;
  Users: undefined;
  UserForm: { userId?: string } | undefined;
  Reports: undefined;
  Profile: undefined;
};