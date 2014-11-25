/*
 * BLE Demo App based on bluetooth v2 api. https://wiki.mozilla.org/B2G/Bluetooth/WebBluetooth-v2
 */

document.addEventListener("DOMContentLoaded", function(event) {
  console.log("DOM fully loaded and parsed");

  var bluetooth = window.navigator.mozBluetooth;
  var defaultAdapter = null;
  var searchAgainBtn = null;
  var discoveryHandler = null;
  var isGattClientConnected = null;
  var gattConnectState = null;
  searchAgainBtn = document.getElementById('search-device');
  connectState = document.getElementById('conn-status');
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
    if (device.name === 'Polar H7 2AA27B') {
      console.log('!!!!!!! Found Polar!!!!!!!');
      device.connectGatt(false).then(function onResolve(gatt){
         console.log('connectGatt, onResolve');
         // gatt.connectionState
         console.log('Connect with the HRM, connection state: ' + gatt.connectionState);                            
       }, function onReject(reason){
         console.log('connectGatt reject');
       });
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

}); //DOMContentLoaded
