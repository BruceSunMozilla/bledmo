/*
 * BLE Demo App based on bluetooth v2 api. https://wiki.mozilla.org/B2G/Bluetooth/WebBluetooth-v2
 * GATT Service UUID: https://developer.bluetooth.org/gatt/services/Pages/ServicesHome.aspx
 * GATT Characteristics:  https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicsHome.aspx
 * TODO:
 * 1. Gecko UUID translation
 */

var waitingForRead = [];
var waitingPromise = false;

function performRead() {
  console.log('performRead() has been triggered');
  if (waitingForRead.length > 0) {
    something = waitingForRead[0];
    waitingForRead.shift();
    waitingPromise = true;
    something.readValue().then(function onResolve(value) {
      console.log('!!!!!!!!!!!!!!!! something value = ' + value);
      waitingPromise = false;
      performRead();
    }, function onReject(reason) {
      console.log('readValue failed: reason = ' + reason);
      waitingPromise = false;
      performRead();
    });
  }
}

function dumpGattService(gattService) {
  console.log('start dumping service >>>>>>>');
  console.log('isPrimary = ' + gattService.isPrimary);
  console.log('uuid = ' + gattService.uuid);
  console.log('instanceId = ' + gattService.instanceId);
  for (var i in gattService.characteristics) {
    console.log('characteristics[' + i + '] uuid = ' + gattService.characteristics[i].uuid);
    console.log('characteristics[' + i + '] instanceId = ' + gattService.characteristics[i].instanceId);
//    console.log('going to read characteristic[' + i + '] value');
//    waitingForRead.push(gattService.characteristics[i]);
//    for (var j in gattService.characteristics[i].descriptors) {
//      console.log('going to read characteristic[' + i + '] descriptor[' + j + '] value');
//      waitingForRead.push(gattService.characteristics[i].descriptors[j]);
//    }
  }
//  if (!waitingPromise) {
//    performRead();
//  }
  console.log('<<<<<<< stop dumping service');
}

document.addEventListener("DOMContentLoaded", function(event) {
  console.log("DOM fully loaded and parsed");

  var bluetooth = window.navigator.mozBluetooth;
  var defaultAdapter = null;
  var startSearchDeviceBtn = null;
  var stopSearchDeviceBtn = null;
  var startNotiBtn = null;
  var discoveryHandler = null;
  var isGattClientConnected = null;
  var gattConnectState = null;
  var gattClient = null;
  var gattHrmChar = null;
  var hrmmeasurementTxt = null;
//  var HRM_SERVERVICE_UUID = 'fb349b5f-8000-0080-0010-00000d180000';
  var HRM_SERVERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
  var HRM_CHARACTERISTIC_UUID = '00002a37-0000-1000-8000-00805f9b34fb';
  var CCCD_UUID = '00002902-0000-1000-8000-00805f9b34fb';
  var targetDevice = null;
  startSearchDeviceBtn = document.getElementById('start-search-device');
  stopSearchDeviceBtn = document.getElementById('stop-search-device');
  gattConnectState = document.getElementById('conn-status');
  startNotiBtn = document.getElementById('start-register-noti');
  connectBtn = document.getElementById('connect');
  disconnectBtn = document.getElementById('disconnect');
  discoverBtn = document.getElementById('discover');
  hrmmeasurementTxt = document.getElementById('hrm-measurement');
  defaultAdapter =  bluetooth.defaultAdapter;
  if (defaultAdapter) {
    console.log('defaultAdapter get!');
  } else {
    console.log('defaultAdapter not get! We need to wait adapter added');
  }

  bluetooth.onattributechanged = function onManagerAttributeChanged(evt) {
    console.log('register adapterchanged');
    for (var i in evt.attrs) {
      console.log('--> onattributechanged(): evt.attrs[i] = ' + evt.attrs[i]);
       switch (evt.attrs[i]) {
         case 'defaultAdapter':
           console.log("!!!defaultAdapter changed. address:", bluetooth.defaultAdapter.address);
           defaultAdapter = bluetooth.defaultAdapter;

           defaultAdapter.onattributechanged = function onAdapterAttributeChanged(evt) {
             console.log('--> _onAdapterAttributeChanged.... ');
              for (var i in evt.attrs) {
                console.log('---> _onAdapterAttributeChanged.... ' + evt.attrs[i]);
                 switch (evt.attrs[i]) {
                   case 'state':
                    if (defaultAdapter.state === 'enabled') {
                      console.log('bluetooth enabled!!!!!');
                    }
                    break;
                   case 'address':
                     console.log('adapter address' + defaultAdapter.address);
                     break;
                   case 'name':
                     console.log('adapter name: '+defaultAdapter.name);
                     break;
                   case 'discoverable':
                     console.log('discoverable state: '+defaultAdapter.discoverable);
                     break;
                   case 'discovering':
                     console.log('discovering' + defaultAdapter.discovering);
                     break;
                    default:
                     break;
                 }
            }
          };
          enableBluetooth();
          break;
        default:
           break;
       }
    }
 };

  function enableBluetooth() {
    console.log('enable bluetooth');
    defaultAdapter.enable();
  }

  function disableBluetooth() {
    console.log('disable bluetooth');
    defaultAdapter.disable();
  }

  function addDeviceToList(device) {
    console.log("found '" + device.name + "'");

    var li = document.createElement('li');
    var p = document.createElement('p');
    p.textContent = device.name;
    li.appendChild(p);

    var list = document.getElementById('device-list');
    list.appendChild(li);

    if (device.name == "Wahoo HRM V1.7" || device.name == "Polar H7 2AA27B" || device.name == "Polar H7 10142E") {
//    if (device.name == "Wahoo HRM V1.7") {
//    if (device.name == "Polar H7 2AA27B") {
//    if (device.name == "Polar H7 10142E") {
//    if (device.name == "Jocelyn1") {
      gattClient = device.gatt;
      console.log('gattClient assigned with device.name = ' + device.name);
      gattClient.oncharacteristicchanged = function onCharacteristicChanged(evt) {
        var characteristic = evt.characteristic;
        console.log("The value of characteristic (uuid:", characteristic.uuid, ") changed to ", characteristic.value);
           if (characteristic.value) {
             var valueBytes = new Uint8Array(characteristic.value);
             if (valueBytes.length < 2) {
               console.log('Invalid Heart Rate Measurement value');
               return;
             }
             var flags = valueBytes[0];
             var hrFormat = flags & 0x01;
             var sensorContactStatus = (flags >> 1) & 0x03;
             var eeStatus = (flags >> 3) & 0x01;
             var rrBit = (flags >> 4) & 0x01;
             var heartRateMeasurement;
             var energyExpanded;
             var rrInterval;
             var minLength = hrFormat == 1 ? 3 : 2;
             if (valueBytes.length < minLength) {
               console.log('Invalid Heart Rate Measurement value');
               return;
             }
             if (hrFormat == 0) {
               console.log('8-bit Heart Rate format');
               heartRateMeasurement = valueBytes[1];
               console.log(' Heart Rate Measurement: ' + heartRateMeasurement);
               hrmmeasurementTxt.textContent = heartRateMeasurement;
             } else {
               console.log('16-bit Heart Rate format');
               heartRateMeasurement = valueBytes[1] | (valueBytes[2] << 8);
               console.log(' Heart Rate Measurement: ' + heartRateMeasurement);
             }
           }
      }
    }
  }

  function discoverDevice() {
    defaultAdapter.startDiscovery().then(function onResolve(handle) {
      discoveryHandler = handle;
      discoveryHandler.ondevicefound = function onDeviceFound(evt) {
        //console.log('-->_onDeviceFound(): evt = ' + evt);
        addDeviceToList(evt.device);
      } // ondevice found
    }, function onReject(reason) {
      console.log('--> startDiscovery failed: reason = ' + reason);
    }); //startdiscovery resolve
  };

  startSearchDeviceBtn.onclick = function startSearchDevice() {
    if (defaultAdapter) {
      console.log('---------btn press, start discovery --------');
      // clean up device list
      var list = document.getElementById('device-list');
      while (list.firstChild) list.removeChild(list.firstChild);

      console.log(defaultAdapter.discovering);
      if (defaultAdapter.discovering == true) {
        defaultAdapter.stopDiscovery().then(function onResolve() {
          discoverDevice(defaultAdapter);
        }, function onReject(reason) {
          console.log('--> stopDiscovery failed: reason = ' + reason);
        }); //stopdiscoverty resolve
      } else {
        discoverDevice();
      }
    }
  };

  stopSearchDeviceBtn.onclick = function stopSearchDevice() {
    defaultAdapter.stopDiscovery().then(function onResolve() {
      console.log('--> stopDiscovery complete');
    }, function onReject(reason) {
      console.log('--> stopDiscovery failed: reason = ' + reason);
    }); //stopdiscoverty resolve
  }

  connectBtn.onclick = function Connect() {
    console.log("going to connect");
    if (defaultAdapter && gattClient){
      gattClient.connect().then(function onResolve() {
        console.log("connected");
        gattClient.discoverServices().then(function onResolve() {
          console.log('start to discover');
          for (var i in gattClient.services) {
            dumpGattService(gattClient.services[i]);
          }
        }, function onReject(reason) {
          console.log('discover failed: reason = ' + reason);
        });
      }, function onReject(reason) {
        console.log('connect failed: reason = ' + reason);
      });
    }
  };

  disconnectBtn.onclick = function Disconnect() {
    if (defaultAdapter && gattClient){
      gattClient.disconnect().then(function onResolve() {
        console.log("disconnected");
      }, function onReject(reason) {
        console.log('disconnect failed: reason = ' + reason);
      });
    }
  };

  discoverBtn.onclick = function Connect() {
    if (defaultAdapter && gattClient){
      gattClient.discoverServices().then(function onResolve() {
        console.log('discover completed');
      }, function onReject(reason) {
        console.log('discover failed: reason = ' + reason);
      });
    }
  };

  startNotiBtn.onclick = function startNotiBtnClick() {
    if (defaultAdapter && gattClient){
      for (var i in gattClient.services) {
        console.log('GattService uuid:' + gattClient.services[i].uuid);
        console.log('GattService instanceid:' + gattClient.services[i].instanceId);
        console.log('GattService isPrimary:' + gattClient.services[i].isPrimary);
        if (gattClient.services[i].uuid === HRM_SERVERVICE_UUID) {
          console.log('Found HRM Service!!!!');
          for (var j in gattClient.services[i].characteristics) {
            if (gattClient.services[i].characteristics[j].uuid === HRM_CHARACTERISTIC_UUID) {
              console.log('Found HRM Characteristic!!!!');
              gattHrmChar = gattClient.services[i].characteristics[j];
              console.log('HRM properties: broadcast(' + gattHrmChar.properties.broadcast + '), '
                                        + 'read(' + gattHrmChar.properties.read + '), '
                                        + 'writeNoResponse(' + gattHrmChar.properties.writeNoResponse + '), '
                                        + 'write(' + gattHrmChar.properties.write + '), '
                                        + 'notify(' + gattHrmChar.properties.notify + '), '
                                        + 'indicate(' + gattHrmChar.properties.indicate + '), '
                                        + 'signedWrite(' + gattHrmChar.properties.signedWrite + '), '
                                        + 'extendedProps(' + gattHrmChar.properties.extendedProps + '), ');
            }
          }
          break;
        }
      }
      console.log('HRM CHAR: Starting notification');
      gattHrmChar.startNotifications().then(function onResolve() {
        console.log('start notification completed');
      }, function onReject(reason) {
        console.log('start notification failed: reason = ' + reason);
      });
      for (var i in gattHrmChar.descriptors) {
        console.log('Descriptor[' + i + '] uuid of HRM characteristic:' + gattHrmChar.descriptors[i].uuid);
        console.log('Descriptor[' + i + '] value of HRM characteristic:' + gattHrmChar.descriptors[i].value);
        if (gattHrmChar.descriptors[i].uuid === CCCD_UUID) {
          console.log('Found CCCD of HRM Characteristic!!!!');
          cccDescriptor = gattHrmChar.descriptors[i];
          var arrayBuffer = new ArrayBuffer(2);
          var uint8Array = new Uint8Array(arrayBuffer);
          uint8Array[0] = 0x01;
          uint8Array[1] = 0x00;
          cccDescriptor.writeValue(arrayBuffer);
        }
      }
    }
  };

}); //DOMContentLoaded
