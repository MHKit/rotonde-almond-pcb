'use strict'

const _ = require('lodash');

const client = require('rotonde-client/node/rotonde-client')('ws://rotonde:4224');

client.onReady(() => {
  console.log('Connected');
});

const PI_DIV = 15;
let angle = 0;
setInterval(() => {
  const fingers = _.times(5, (i) => {
    return {
      position: Math.cos(angle + i * Math.PI / 5) * 0.5 + 0.5,
      speed: 1,
    };
  });
  console.log(fingers);
  client.sendAction("HAND_FINGERS", {fingers})
  angle += Math.PI / PI_DIV;
}, 70);

client.connect();
