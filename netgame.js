"use strict";
var netgame = (function() {
    var PACKET_RINGBUFFER_SIZE = 64;
    function netgame() {
        this.nextSequence = 0;
        this.nextAckToSend = 0xFFFFFFFF;
        this.lastAckReceived = 0xFFFFFFFF;
        this.packets = new Array(PACKET_RINGBUFFER_SIZE);
    }

    netgame.prototype = {
        // Process a packet from an ArrayBuffer.
        processPacket: function(buf) {
            var bufview = new BufferView(buf, BufferView.LE);
            var seq = bufview.readUnsignedInt();
            var ack = bufview.readUnsignedInt();
            this.nextAckToSend = seq;
            if (ack == 0xFFFFFFFF)
                // nothing to ack
                return true;
            var ackbuf = ack % PACKET_RINGBUFFER_SIZE;
            if (!this.packets[ackbuf]) {
                // Unknown packet being acked.
                return false;
            }
            if (this.lastAckReceived == 0xFFFFFFFF)
                this.lastAckReceived = ackbuf;
            //FIXME: This is not really correct, as it doesn't account for
            // dropped packets.
            var i = this.lastAckReceived;
            this.packets[i] = null;
            if (this.lastAckReceived != ackbuf) {
                do {
                    i++;
                    this.packets[i] = null;
                } while (i != ackbuf);
            }
            this.lastAckReceived = ackbuf;
            return true;
        },

        // Construct a packet and send it by calling
        // sender, passing it the ArrayBuffer of the
        // packet's contents.
        sendPacket: function(sender) {
            var seq = this.nextSequence;
            this.nextSequence++;
            var buf = new ArrayBuffer(8); //XXX: this sucks
            var bufview = new BufferView(buf, BufferView.LE);
            bufview.writeUnsignedInt(seq);
            bufview.writeUnsignedInt(this.nextAckToSend);
            //TODO: actually write data
            //TODO: put something useful in here
            this.packets[seq % PACKET_RINGBUFFER_SIZE] = {};
            sender(buf);
        }
    };

    return netgame;
})();
