"use strict";
var netgame = (function() {
    function netgame() {
        this.nextSequence = 0;
        this.nextAck = 0xFFFFFFFF;
    }

    netgame.prototype = {
        // Process a packet from an ArrayBuffer.
        processPacket: function(buf) {
            var bufview = new BufferView(buf, BufferView.LE);
            var seq = bufview.readUnsignedInt();
            var ack = bufview.readUnsignedInt();
            this.nextAck = seq;
            //TODO: handle acks
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
            bufview.writeUnsignedInt(this.nextAck);
            //TODO: actually write data
            sender(buf);
        }
    };

    return netgame;
})();
