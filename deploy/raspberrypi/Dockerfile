FROM resin/raspberrypi-node:latest

RUN sudo apt-get update && \
    sudo apt-get -y upgrade && \
    sudo apt-get install unzip

ADD https://github.com/MHKit/rotonde-bionicohand/archive/master.zip /tmp
RUN unzip /tmp/master.zip -d /usr/local/ && mv /usr/local/rotonde-bionicohand-master /usr/local/rotonde-bionicohand

WORKDIR "/usr/local/rotonde-bionicohand/"

RUN npm install

CMD ["/usr/local/bin/node", "index.js"]
