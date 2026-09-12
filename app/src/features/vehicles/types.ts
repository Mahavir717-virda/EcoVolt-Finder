import { ConnectorType, VehicleClass } from '@contracts/enums';
import { Vehicle } from '@contracts/types';

export interface VehicleFormData {
  vehicleClass: VehicleClass;
  model: string;
  batteryKwh: number;
  efficiencyWhKm: number;
  connectors: ConnectorType[];
  currentChargePct: number;
}

export const CAR_DEFAULTS: VehicleFormData = {
  vehicleClass: VehicleClass.CAR,
  model: '',
  batteryKwh: 40.5,
  efficiencyWhKm: 140,
  connectors: [ConnectorType.CCS2, ConnectorType.TYPE2_AC],
  currentChargePct: 42,
};

export const BIKE_DEFAULTS: VehicleFormData = {
  vehicleClass: VehicleClass.BIKE,
  model: '',
  batteryKwh: 3.7,
  efficiencyWhKm: 40,
  connectors: [
    ConnectorType.THREE_PIN,
    ConnectorType.BHARAT_AC_001,
    ConnectorType.TYPE2_AC,
  ],
  currentChargePct: 50,
};

export const POPULAR_EV_PRESETS = [
  {
    name: 'Tata Nexon EV Max',
    vehicleClass: VehicleClass.CAR,
    batteryKwh: 40.5,
    efficiencyWhKm: 140,
    connectors: [ConnectorType.CCS2, ConnectorType.TYPE2_AC],
  },
  {
    name: 'MG ZS EV',
    vehicleClass: VehicleClass.CAR,
    batteryKwh: 50.3,
    efficiencyWhKm: 150,
    connectors: [ConnectorType.CCS2, ConnectorType.TYPE2_AC],
  },
  {
    name: 'Mahindra XUV400',
    vehicleClass: VehicleClass.CAR,
    batteryKwh: 39.4,
    efficiencyWhKm: 145,
    connectors: [ConnectorType.CCS2, ConnectorType.TYPE2_AC],
  },
  {
    name: 'Ather 450X',
    vehicleClass: VehicleClass.BIKE,
    batteryKwh: 3.7,
    efficiencyWhKm: 40,
    connectors: [ConnectorType.THREE_PIN, ConnectorType.BHARAT_AC_001, ConnectorType.TYPE2_AC],
  },
  {
    name: 'Ola S1 Pro',
    vehicleClass: VehicleClass.BIKE,
    batteryKwh: 4.0,
    efficiencyWhKm: 42,
    connectors: [ConnectorType.THREE_PIN, ConnectorType.BHARAT_AC_001],
  },
  {
    name: 'TVS iQube ST',
    vehicleClass: VehicleClass.BIKE,
    batteryKwh: 5.1,
    efficiencyWhKm: 45,
    connectors: [ConnectorType.THREE_PIN, ConnectorType.BHARAT_AC_001],
  },
];
