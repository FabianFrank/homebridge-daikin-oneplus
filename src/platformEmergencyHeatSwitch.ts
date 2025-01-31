import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { DaikinApi, TargetHeatingCoolingState } from './daikinapi';

import { DaikinOnePlusPlatform } from './platform';

/**
 * Emergency Heat Switch
 * Unfortunately HomeKit does not support an "emergency heat" or "auxiliary heat" mode directly,
 * so the code works around that by exposing a switch to both control and show the emergency heat
 * status. "On" means auxiliary heat is being requested by the thermostat.
 */
export class DaikinOnePlusEmergencyHeatSwitch {
  private service: Service;
  CurrentState!: CharacteristicValue;
  
  constructor(
    private readonly platform: DaikinOnePlusPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly deviceId: string,
    private readonly daikinApi: DaikinApi,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Daikin')
      .setCharacteristic(this.platform.Characteristic.Model, accessory.context.device.model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.id)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, accessory.context.device.firmwareVersion);

    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Switch) 
                    || this.accessory.addService(this.platform.Service.Switch);

    // set the service name, this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleCurrentStateGet.bind(this))
      .onSet(this.handleCurrentStateSet.bind(this));
  }

  updateValues() {
    const value = this.handleCurrentStateGet();
    this.service.updateCharacteristic(this.platform.Characteristic.On, value);
    setTimeout(()=>this.updateValues(), 2000);
  }

  /**
   * Handle requests to get the current value of the "On" characteristic
   */
  handleCurrentStateGet(): boolean {
    return (
      this.daikinApi.deviceHasData(this.deviceId) &&
      this.daikinApi.getTargetState(this.deviceId) === TargetHeatingCoolingState.AUXILIARY_HEAT
    );
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  async handleCurrentStateSet(value: CharacteristicValue) {
    this.platform.log.debug('Emergency Heat', this.accessory.displayName, '- Set Emergency Heat State:', value);
    await this.daikinApi.setTargetState(this.deviceId, value ? TargetHeatingCoolingState.AUXILIARY_HEAT : TargetHeatingCoolingState.HEAT);
  }
  
}
