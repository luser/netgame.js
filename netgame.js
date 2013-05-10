"use strict";
(function(scope) {
    function netgame() {
        this.nextSequence = 0;
        this.lastSeqSent = 0xFFFFFFFF;
        this.nextAckToSend = 0xFFFFFFFF;
        this.lastAckReceived = 0xFFFFFFFF;
    }

    netgame.prototype = {
        // Process a packet from an ArrayBuffer.
        processPacket: function(buf) {
            var bufview = new BufferView(buf, BufferView.LE);
            var seq = bufview.readUnsignedInt();
            var ack = bufview.readUnsignedInt();
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
        // packet's contents.
        sendPacket: function(sender) {
            var seq = this.nextSequence;
            this.lastSeqSent = seq;
            this.nextSequence++;
            var buf = new ArrayBuffer(8); //XXX: this sucks
            var bufview = new BufferView(buf, BufferView.LE);
            bufview.writeUnsignedInt(seq);
            bufview.writeUnsignedInt(this.nextAckToSend);
            //TODO: actually write data
            sender(buf);
        }
    };

    scope.netgame = netgame;
})(window);
