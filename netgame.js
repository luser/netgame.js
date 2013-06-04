"use strict";
(function(scope) {
  var perfnow = window && 'performance' in window && 'now' in window.performance
    ? function() { return Math.round(window.performance.now()); } : Date.now;

  function callback(thing, method, args) {
    if(method in thing && 'function' === typeof thing[method]) {
      thing[method].apply(thing, args);
    }
  }

  /*
   * A netconn represents a single network connection. It does not actually transmit
   * data, you must call processPacket for each packet that arrives, and pass a sender
   * function when calling sendPacket.
   */
  function netconn() {
    this.nextSequence = 0;
    this.lastSeqSent = 0xFFFFFFFF;
    this.nextAckToSend = 0xFFFFFFFF;
    this.lastAckReceived = 0xFFFFFFFF;
  }

  netconn.prototype = {
    /*
     * Process a packet from an ArrayBuffer.
     */
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

      if (buf.byteLength > 8) {
        callback(this, "onpacket", [buf.slice(8)]);
      }
      return true;
    },

    /*
     * Construct a packet and send it by calling
     * sender, passing it the ArrayBuffer of the
     * packet's contents. data is the packet payload as an ArrayBuffer.
     * Returns the sequence number of the packet sent.
     */
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
        var u8data = new Uint8Array(data);
        u8buf.set(u8data, HEADER_SIZE);
      }
      sender(buf);
      return seq;
    }
  };

  /*
   * A netprop is a single property that has a fixed binary representation so it
   * can be serialized for transmission across the network.
   * The type parameter should be one of the types defined on this function:
   * netprop.{u8,i8}: unsigned or signed 8-bit value.
   * netprop.{u16,i16}: unsigned or signed 16-bit value.
   * netprop.{u32,i32}: unsigned or signed 32-bit value.
   * netprop.f32: 32-bit float
   * netprop.f64: 64-bit float
   */
  function netprop(type, name, default_value) {
    this.type = type;
    this.name = name || "";
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
  function read_f32(dataview, offset) {
    this.value = dataview.getFloat32(offset, true);
  }
  function write_f32(dataview, offset) {
    dataview.setFloat32(offset, this.value, true);
  }
  function read_f64(dataview, offset) {
    this.value = dataview.getFloat64(offset, true);
  }
  function write_f64(dataview, offset) {
    dataview.setFloat64(offset, this.value, true);
  }

  // Built-in types.
  netprop.u8 =  {size: 1, read: read_u8, write: write_u8,
                 toString: function() { return "netprop.u8"; } };
  netprop.i8 =  {size: 1, read: read_i8, write: write_i8,
                 toString: function() { return "netprop.i8"; } };
  netprop.u16 = {size: 2, read: read_u16, write: write_u16,
                 toString: function() { return "netprop.u16"; } };
  netprop.i16 = {size: 2, read: read_i16, write: write_i16,
                 toString: function() { return "netprop.i16"; } };
  netprop.u32 = {size: 4, read: read_u32, write: write_u32,
                 toString: function() { return "netprop.u32"; } };
  netprop.i32 = {size: 4, read: read_i32, write: write_i32,
                 toString: function() { return "netprop.i32"; } };
  netprop.f32 = {size: 4, read: read_f32, write: write_f32,
                 toString: function() { return "netprop.f32"; } };
  netprop.f64 = {size: 8, read: read_f64, write: write_f64,
                 toString: function() { return "netprop.f64"; } };


  netprop.prototype = {
    toString: function() {
      return "netprop(" + this.type + "," + this.name + "," + this.default_value + ")";
    },
    /*
     * Read this property from dataview, starting at offset.
     * Return the new offset after reading.
     */
    read: function(dataview, offset) {
      this.type.read.apply(this, [dataview, offset]);
      return offset + this.type.size;
    },
    /*
     * Write this property to dataview, starting at offset.
     * Return the new offset after writing.
     */
    write: function(dataview, offset) {
      this.type.write.apply(this, [dataview, offset]);
      return offset + this.type.size;
    }
  };

  /*
   * List of objects that have subclassed netobject. Indices in this array
   * are passed across the network as tags, so they must match on both sides of
   * the connection.
   */
  var netObjects = [];

  /*
   * A netobject is an object that can be serialized across the network.
   * The props argument is an object whose keys will be added as properties
   * to the this object and whose values are appropriate for passing to the
   * netprop constructor.
   *
   * Example:
   *   var obj = new netobject({a: netprop.u8});
   *
   * See also the documentation for netobject.register.
   */
  function netobject(props) {
    var netprops = [];
    var keys = Object.keys(props).sort();
    function defineProp(obj, name) {
      var np = new netprop(props[name], name);
      netprops.push(np);
      Object.defineProperty(obj, name, {
                              enumerable: true,
                              get: function() {
                                return np.value;
                              },
                              set: function(value) {
                                np.value = value;
                              }
                            });
    }
    for (var i = 0; i < keys.length; i++) {
      defineProp(this, keys[i]);
    }

    /*
     * Write all the properties of this object to dataview starting at offset.
     * Returns the new offset after writing.
     */
    this.write = function(dataview, offset) {
      for (var i = 0; i < netprops.length; i++) {
        //TODO: delta compress
        offset = netprops[i].write(dataview, offset);
      }
      return offset;
    };

    /*
     * Read all the properties of this object from dataview starting at offset.
     * Return the new offset after reading.
     */
    this.read = function(dataview, offset) {
      for (var i = 0; i < netprops.length; i++) {
        //TODO: delta compress
        offset = netprops[i].read(dataview, offset);
      }
      return offset;
    };

    /*
     * Return the number of bytes this object requires to serialize all of
     * its properties.
     */
    this.size = function() {
      var total = 0;
      for (var i = 0; i < netprops.length; i++) {
        total += netprops[i].type.size;
      }
      return total;
    };
  }

  /*
   * Register a constructor as a netobject, and return a prototype
   * for it. If the class derives from a subclass of netobject, pass
   * the parent class as the second parameter.
   *
   * Example:
   *   var myobject() { netobject.call(this, {a: netobject.u32; }); }
   *   myobject.prototype = netobject.register(myobject);
   */
  netobject.register = function(cls, parent) {
    var netID = netObjects.length;
    netObjects.push(cls);
    return Object.create(parent || netobject.prototype,
                         {constructor: {value: cls},
                          netID: {value: netID}
                         });
  };

  /*
   * clientinput is a subclass of netobject used to store input
   * from the client for transmission to the server.
   */
  function clientinput(props) {
    props = props || {};
    props.timestamp = netobj.u32;
    netobject.call(this, props);
    this.inputID = -1;
  }

  clientinput.prototype = netobject.register(clientinput);

  /*
   * client_net represents the client side of a game connection. sender is an
   * object whose send method accepts an ArrayBuffer of data to send.
   * input_type is a constructor that is a subclass of clientinput that
   * represents input from the player.
   */
  function client_net(sender, input_type) {
    function sender_send(data) {
       sender.send(data);
    }
    this.netconn = new netconn();
    // Last time reported by the server.
    this.serverTime = 0;
    // The local time at which the server time was received.
    var serverTimeReceivedAt = 0;
    // Half of the round-trip time from sending a packet to
    // receiving an ACK for it.
    var lastLag = 0;
    var packetData = new Array(32);

    // We store a ring buffer of input_count inputs and send them repeatedly until
    // the server acks them or we wrap the buffer so that they have a better chance
    // of surviving packet loss.
    var input_count = 32;
    // The last input that the server acked.
    var lastAckedInputID = -1;
    // The ID of the next input the client can use.
    var nextInputID = 0;
    var inputs = new Array(input_count);
    if (input_type) {
      for (var i = 0; i < input_count; i++) {
        inputs[i] = new input_type();
      }
    }
    // Local copies of world things mirrored from the server
    this.things = [];
    var self = this;
    this.netconn.onack = function(acked) {
      var idx = acked % packetData.length;
      var data = packetData[idx];
      packetData[idx] = null;
      lastLag = (perfnow() - data.timestamp) / 2;
      if ('firstInputID' in data && 'lastInputID' in data) {
        lastAckedInputID = data.lastInputID;
      }
    };
    this.netconn.onpacket = function(packet) {
      var view = new DataView(packet);
      var offset = 0;
      self.serverTime = view.getUint32(offset, true);
      serverTimeReceivedAt = perfnow();
      offset += 4;
      // Iterate over all netobjects in this packet.
      while (offset < view.byteLength) {
        var index = view.getUint8(offset);
        offset++;
        if (offset == view.byteLength)
          break;
        var netID = view.getUint8(offset);
        offset++;
        if (offset == view.byteLength)
          break;
        if (netID >= netObjects.length)
          break;
        var obj = new netObjects[netID]();
        offset = obj.read(view, offset);
        self.things[index] = obj;
        callback(self, "onupdate", []);
      }
    };

    /*
     * Return an input object (of type input_type) whose properties can be set.
     * This object will be sent to the server the next time sendToServer is called.
     */
    this.getNextInput = function() {
      var input = inputs[nextInputID % input_count];
      input.inputID = nextInputID;
      nextInputID++;
      input.timestamp = this.serverTime + (perfnow() - serverTimeReceivedAt) + lastLag;
      return input;
    };

    this.sendToServer = function() {
      var packet = null;
      var data = {timestamp: perfnow()};
      var nextSendInputID = lastAckedInputID + 1;
      if (nextSendInputID != nextInputID) {
        //TODO: could keep this around instead of creating a new one every time.
        packet = new ArrayBuffer((nextInputID - nextSendInputID) * inputs[0].size() + 6);
        var view = new DataView(packet);
        var offset = 0;
        // Send input ID range to server so it can drop duped inputs.
        view.setUint32(offset, nextSendInputID, true);
        offset += 4;
        view.setUint8(offset, (nextInputID - nextSendInputID));
        offset++;
        view.setUint8(offset, input_type.prototype.netID);
        offset++;
        for (var i = nextSendInputID; i < nextInputID; i++) {
          var idx = i % input_count;
          offset = inputs[idx].write(view, offset);
        }
        data.firstInputID = nextSendInputID;
        data.lastInputID = nextInputID - 1;
      }
      var seq = self.netconn.sendPacket(sender_send, packet);
      packetData[seq % packetData.length] = data;
    };
  }

  client_net.prototype = {
    /*
     * Pass a packet received from the network to the client.
     */
    recv: function(data) {
      this.netconn.processPacket(data);
    }
  };

  /*
   * server_client represents the server's network connection to a client. sender is an
   * object whose send method accepts an ArrayBuffer of data to send.
   * One of these should be created for each client connected to a server, and passed
   * to server_net.addClient.
   */
  function server_client(sender) {
    this.sender = function(data) { sender.send(data); };
    this.netconn = new netconn();

    // The last input ID this client sent.
    var lastReceivedInputID = -1;
    var self = this;
    this.netconn.onpacket = function(packet) {
      var view = new DataView(packet);
      var offset = 0;
      var firstInputID = view.getUint32(offset, true);
      offset += 4;
      var IDcount = view.getUint8(offset);
      offset++;
      var netID = view.getUint8(offset);
      offset++;
      if (netID >= netObjects.length)
        return;
      // Iterate over all inputs in this packet.
      for (var inputID = firstInputID;
           inputID < firstInputID + IDcount && offset < view.byteLength;
           inputID++) {
        //TODO: don't construct a new input every time
        var input = new netObjects[netID]();
        offset = input.read(view, offset);
        // Don't process duplicate inputs.
        if (inputID > lastReceivedInputID) {
          callback(self, "oninput", [input]);
        }
      }
      lastReceivedInputID = firstInputID + IDcount - 1;
    };
  }
  server_client.prototype = {
    /*
     * Send a packet to the client.
     */
    send: function(data) {
      this.netconn.sendPacket(this.sender, data);
    },
    /*
     * Pass a packet received from the network to the server.
     */
    recv: function(data) {
      this.netconn.processPacket(data);
    }
  };

  /*
   * server_net represents the state of the server's network connection to all
   * clients. Call addClient with a server_client instance to add a new client
   * connected to the server. Call updateClients to send a network packet to all clients.
   */
  function server_net() {
    this.clients = [];
  }

  server_net.prototype = {
    /*
     * Add client as a connected client. It should be a server_client object.
     */
    addClient: function(client) {
      this.clients.push(client);
    },

    /*
     * Send a network packet updating all clients about the list of things in the game.
     */
    updateClients: function(things) {
      var total = 4; // server timestamp
      for (var i = 0; i < things.length; i++) {
        total += 2; // index + netID as u8s, pretty wasteful right now
        total += things[i].size();
      }
      //TODO: should store world state per-client, delta-compress against
      // acked state
      var packet = new ArrayBuffer(total);
      var view = new DataView(packet);
      var offset = 0;
      view.setUint32(offset, perfnow(), true);
      offset += 4;
      for (i = 0; i < things.length; i++) {
        view.setUint8(offset, i);
        offset++;
        view.setUint8(offset, things[i].netID);
        offset++;
        offset = things[i].write(view, offset);
      }

      for (i = 0; i < this.clients.length; i++) {
        this.clients[i].send(packet);
      }
    }
  };

  scope.netconn = netconn;
  scope.netprop = netprop;
  scope.netobject = netobject;
  scope.clientinput = clientinput;
  scope.client_net = client_net;
  scope.server_net = server_net;
  scope.server_client = server_client;
})(window);
