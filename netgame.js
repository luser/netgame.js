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
      //TODO: sanity check seq here
      var seq = bufview.getUint32(0, true);
      var ack = bufview.getUint32(4, true);
      this.nextAckToSend = seq;
      if (ack != 0xFFFFFFFF &&
          ack <= this.lastSeqSent &&
          (ack > this.lastAckReceived ||
           this.lastAckReceived == 0xFFFFFFFF)) {
        this.lastAckReceived = ack;
        callback(this, "onack", [ack]);
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

  function netprop(type, default_value) {
    this.type = type;
    this.value = default_value || 0;
  }

  function read_u8(dataview, offset) {
    this.value = dataview.getUint8(offset, true);
  }
  function write_u8(dataview, offset) {
    dataview.setUint8(offset, this.value, true);
  }
  function read_i8(dataview, offset) {
    this.value = dataview.getInt8(offset, true);
  }
  function write_i8(dataview, offset) {
    dataview.setInt8(offset, this.value, true);
  }
  function read_u16(dataview, offset) {
    this.value = dataview.getUint16(offset, true);
  }
  function write_u16(dataview, offset) {
    dataview.setUint16(offset, this.value, true);
  }
  function read_i16(dataview, offset) {
    this.value = dataview.getInt16(offset, true);
  }
  function write_i16(dataview, offset) {
    dataview.setInt16(offset, this.value, true);
  }
  function read_u32(dataview, offset) {
    this.value = dataview.getUint32(offset, true);
  }
  function write_u32(dataview, offset) {
    dataview.setUint32(offset, this.value, true);
  }
  function read_i32(dataview, offset) {
    this.value = dataview.getInt32(offset, true);
  }
  function write_i32(dataview, offset) {
    dataview.setInt32(offset, this.value, true);
  }

  // Default types
  netprop.u8 =  {size: 1, read: read_u8, write: write_u8 };
  netprop.i8 =  {size: 1, read: read_i8, write: write_i8 };
  netprop.u16 = {size: 2, read: read_u16, write: write_u16 };
  netprop.i16 = {size: 2, read: read_i16, write: write_i16 };
  netprop.u32 = {size: 4, read: read_u32, write: write_u32 };
  netprop.i32 = {size: 4, read: read_i32, write: write_i32 };

  netprop.prototype = {
    read: function(dataview, offset) {
      this.type.read.apply(this, [dataview, offset]);
      return offset + this.type.size;
    },
    write: function(dataview, offset) {
      this.type.write.apply(this, [dataview, offset]);
      return offset + this.type.size;
    }
  };

  function client_net() {
    //TODO
  }

  function server_net() {
    //TODO
  }

  scope.netgame = netgame;
  scope.netprop = netprop;
  scope.client_net = client_net;
  scope.server_net = server_net;
})(window);
