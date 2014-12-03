/*
 * BLE Demo App based on bluetooth v2 api. https://wiki.mozilla.org/B2G/Bluetooth/WebBluetooth-v2
 * GATT Service UUID: https://developer.bluetooth.org/gatt/services/Pages/ServicesHome.aspx
 * GATT Characteristics:  https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicsHome.aspx
 * TODO:
 * 1. Gecko UUID translation
 */

document.addEventListener("DOMContentLoaded", function(event) {
  console.log("DOM fully loaded and parsed");

  var bluetooth = window.navigator.mozBluetooth;
  var defaultAdapter = null;
  var searchAgainBtn = null;
  var startNotiBtn = null;
  var discoveryHandler = null;
  var isGattClientConnected = null;
  var gattConnectState = null;
  var gattClient = null;
  var gattHrmChar = null;
  var HRM_SERVERVICE_UUID = 'fb349b5f-8000-0080-0010-00000d180000';
  var cccDescriptor;
  var hrmmeasurementTxt;
  searchAgainBtn = document.getElementById('search-device');
  gattConnectState = document.getElementById('conn-status');
  startNotiBtn = document.getElementById('start-register-noti');
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
    var li = document.createElement('li');
    var p = document.createElement('p');
    p.textContent = device.name;
    li.appendChild(p);

    var list = document.getElementById('device-list');
    list.appendChild(li);
  }

  function connectGattServer(device) {
    console.log('Device name:' + device.name);
    console.log('Device address:' + device.address);
    /* TODO: Remove it when we added connect options*/
    if (device.name === 'Polar H7 2AA27B' || device.name === 'Wahoo HRM V1.7' || device.name ==='MIO GLOBAL') {
      console.log('!!!!!!! Found HRM !!!!!!  ');
      console.log('!!!!!!! Stop Disocovery !!!!!!  ');
      defaultAdapter.stopDiscovery().then(function onResolve(){
         console.log('!!!!!!! Stop Disocovery done !!!!!!  ');
         device.connectGatt(false).then(function onResolve(gatt){
         console.log('connectGatt, onResolve');
         gattClient = gatt;
        console.log('-------------> after resolved connection state:  ' + gatt.connectionState);
        if (gatt.connectionState === 'connected') {
          gattConnectState.textContent = 'Connection state:  ' + gatt.connectionState;
        }
         // gatt.connectionState
         gatt.onconnectionstatechanged = function onConnectionStateChanged() {
           console.log("Connection state changed to", gatt.connectionState);
           gattConnectState.textContent = 'Connection state:  ' + gatt.connectionState;
          };

         // gatt onconnectionstatechanged
         gatt.oncharacteristicchanged = function onCharacteristicChanged(evt) {
           var hrmChar = evt.characteristic;
           console.log("The value of characteristic uuid:" + hrmChar.uuid);
           if (hrmChar.value) {
             var valueBytes = new Uint8Array(hrmChar.value);
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
      }, function onRejct(reason){
      });//stopdiscovery

       }, function onReject(reason){
         console.log('connectGatt reject');
       }); //connectGatt resolve
    }
  }

  searchAgainBtn.onclick = function searchAgainClick() {
    if (defaultAdapter) {
      console.log('---------btn press, start discovery --------');
      // clean up device list
      var list = document.getElementById('device-list');
      while (list.firstChild) list.removeChild(list.firstChild);

      defaultAdapter.startDiscovery().then(function onResolve(handle) {
        discoveryHandler = handle;
        discoveryHandler.ondevicefound = function onDeviceFound(evt) {
         console.log('-->_onDeviceFound(): evt = ' + evt);
         addDeviceToList(evt.device);
         connectGattServer(evt.device); 
        } // ondevice found
       }, function onReject(reason) {
         console.log('--> startDiscovery failed: reason = ' + reason);
       }); //startdiscovery resolve
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
          gattHrmChar = gattClient.services[i].characteristics[0];
          break;
        }
      }

      console.log('HRM CHAR: Starting notification');
      gattHrmChar.startNotifications();
      console.log('HRM CHAR: Write CCCD to enable descriptor');
      cccDescriptor = gattHrmChar.descriptors[0];
      var enableNotification = new ArrayBuffer(2);
      enableNotification[0] = 0x01;
      enableNotification[1] = 0x00;
      cccDescriptor.writeValue(enableNotification);
    }
  };

}); //DOMContentLoaded
