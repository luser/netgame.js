"use strict";
(function(scope) {
   function callback(thing, method, args) {
       if(method in thing && 'function' === typeof thing[method]) {
           thing[method].apply(thing, args);
       }
   }

    function netgame() {
        this.nextSequence = 0;
        this.lastSeqSent = 0xFFFFFFFF;
        this.nextAckToSend = 0xFFFFFFFF;
        this.lastAckReceived = 0xFFFFFFFF;
    }

    netgame.prototype = {
        // Process a packet from an ArrayBuffer.
        processPacket: function(buf) {
            var bufview = new DataView(buf);
            var seq = bufview.getUint32(0, true);
            var ack = bufview.getUint32(4, true);
            this.nextAckToSend = seq;
            if (ack != 0xFFFFFFFF &&
                ack <= this.lastSeqSent &&
                ack > this.lastAckReceived) {
                this.lastAckReceived = ack;
            }

            return true;
        },

        // Construct a packet and send it by calling
        // sender, passing it the ArrayBuffer of the
        // packet's contents. data is the packet payload as an ArrayBuffer.
        sendPacket: function(sender, data) {
            var HEADER_SIZE = 8;
            var seq = this.nextSequence;
            this.lastSeqSent = seq;
            this.nextSequence++;
            var size = HEADER_SIZE;
            if (data)
                size += data.byteLength;
            var buf = new ArrayBuffer(size);
            var bufview = new DataView(buf);
            bufview.setUint32(0, seq, true);
            bufview.setUint32(4, this.nextAckToSend, true);
            if (data) {
                var u8buf = new Uint8Array(buf);
                u8buf.set(data, HEADER_SIZE);
            }
            sender(buf);
        }
    };

    function client_net() {
        //TODO
    }

    function server_net() {
        //TODO
    }

    scope.netgame = netgame;
    scope.client_net = client_net;
    scope.server_net = server_net;
})(window);
