'use strict';

const _ = require('lodash');

const client = require('rotonde-client/node/rotonde-client')('ws://rotonde:4224');
const uuid = require('node-uuid');

const pid = 0x6015;
const vid = 0x0403;

/**
 *
 * BIONICOHAND_FOUND
 *
 */

const send = (port, data) => {
  client.sendAction('SERIAL_WRITE', {
    port: port.comName,
    response: 'TEST',
    data,
  });
  client.eventHandlers.attachOnce('TEST', (e) => {
    console.log(e);
  });
}

const startBionicoHand = (status, port) => {
  client.addLocalDefinition('action', 'HAND_FINGERS', [
    {
      name: 'fingers',
      type: 'array',
      units: 'position: 0-100, speed: 0-100',
    }
  ]);

  client.eventHandlers.attach('SERIAL_READ', (e) => {
    console.log(e);
  });

  const fingersHandler = (a) => {
    _.forEach(a.data.fingers, (f, i) => {
      console.log(f);
      const cmd = 'F' + i + ' P' + f.position + ' S' + f.speed;
      console.log(cmd);
      send(port, cmd);
    })
  };
  client.actionHandlers.attach('HAND_FINGERS', fingersHandler);
}

const processPort = (port) => {
  if (port.productId != pid || port.vendorId != vid) {
    return;
  }
  console.log('found bionicos hand ', port);

  const handler = (e) => {
    if (_.isEqual(port, e.data)) {
      console.log('lost this bionico hand ', e.data);
      client.eventHandlers.detach('SERIAL_PORT_LOST', handler);
    } else {
      console.log(port, e.data);
    }
  };
  client.eventHandlers.attach('SERIAL_PORT_LOST', handler);

  // status is the name of the event used to report serial port status
  const status = 'BIONICOHAND_OPEN_'+uuid.v1();
  client.sendAction('SERIAL_OPEN', {
    port: port.comName,
    baud: 38400,
    parser: 'READLINE',
    separator: '\t\r\n',
    response: status,
  });
  client.eventHandlers.attachOnce(status, (e) => {
    console.log(e);
    if (e.data.status == 'OK') {
      client.sendEvent('BIONICOHAND_FOUND', {
        port,
        index: 0,
      });
      startBionicoHand(status, port);
      return;
    }
    client.sendEvent('BIONICOHAND_ERROR', {
      port
    });
  });
}

client.onReady(() => {
  client.bootstrap({'SERIAL_LIST': {}}, ['SERIAL_PORTS_AVAILABLE'], ['SERIAL_PORT_DISCOVERED', 'SERIAL_PORT_LOST']).then((ports) => {

    _.forEach(ports[0].data.ports, processPort);

    client.eventHandlers.attach('SERIAL_PORT_DISCOVERED', (e) => {
      processPort(e.data);
    });

  }, (err) => {
    console.log(err);
    process.exit();
  });
});

client.connect();
