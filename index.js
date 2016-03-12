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
  const status = uuid.v1();
  client.sendAction('SERIAL_WRITE', {
    port: port.comName,
    response: status,
    data,
  });
  client.eventHandlers.attachOnce(status, (e) => {
    console.log(e);
  });
}

const startBionicoHand = (status, port) => {
  client.addLocalDefinition('action', 'HAND_FINGERS', [
    {
      name: 'fingers',
      type: 'array',
      units: 'position: 0-1, speed: 0-1',
    }
  ]);

  client.eventHandlers.attach('SERIAL_READ', (e) => {
    console.log(e);
  });

  const fingersHandler = (a) => {
    const cmd = _.reduce(a.data.fingers, (c, f, i) => {
      return c + ',' + Math.floor(f.position*10000)/10000 + ',' + Math.floor(f.speed*10000)/10000;
    }, '0');
    send(port, cmd + ';');
  };
  client.actionHandlers.attach('HAND_FINGERS', fingersHandler);
}

const processPort = (port) => {
  if (port.productId != pid || port.vendorId != vid) {
    return;
  }

  const handler = (e) => {
    if (_.isEqual(port, e.data)) {
      client.eventHandlers.detach('SERIAL_PORT_LOST', handler);
    }
  };
  client.eventHandlers.attach('SERIAL_PORT_LOST', handler);

  // status is the name of the event used to report serial port status
  const status = 'BIONICOHAND_OPEN_'+uuid.v1();
  client.sendAction('SERIAL_OPEN', {
    port: port.comName,
    baud: 115200,
    parser: 'READLINE',
    separator: '\r\n',
    response: status,
  });
  client.eventHandlers.attachOnce(status, (e) => {
    console.log(e);
    if (e.data.status != 'OK') {
      if (e.data.status == 'ALREADY_OPENNED') {
        client.sendAction('SERIAL_CLOSE', {
          port: port.comName
        });
        process.exit(1);
      }
      client.sendEvent('BIONICOHAND_ERROR', {
        port
      });
      process.exit(1);
    }
    client.sendEvent('BIONICOHAND_FOUND', {
      port,
      index: 0,
    });
    startBionicoHand(status, port);
  });
}

client.onReady(() => {
  client.bootstrap({'SERIAL_LIST': {}}, ['SERIAL_PORTS_AVAILABLE'], ['SERIAL_PORT_DISCOVERED', 'SERIAL_PORT_LOST']).then((ports) => {

    _.forEach(ports[0].data.ports, processPort);

    client.eventHandlers.attach('SERIAL_PORT_DISCOVERED', (e) => {
      processPort(e.data);
    });

    client.unDefinitionHandlers.attach('*', (d) => {
      if (_.includes(['SERIAL_PORTS_AVAILABLE', 'SERIAL_PORT_DISCOVERED', 'SERIAL_PORT_LOST'], d.identifier)) {
        console.log('Lost serial module, exiting.');
        process.exit(1);
      }
    });

  }, (err) => {
    console.log(err);
    process.exit();
  });
});

client.connect();
