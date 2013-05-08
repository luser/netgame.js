test("Send", function() {
    var n = new netgame();
    n.sendPacket(function(buf) {
      equals(buf.byteLength, 8);
      var u32 = new Uint32Array(buf);
      equals(u32[0], 0);
      equals(u32[01], 0xFFFFFFFF);  // nothing to ack
    });
    n.sendPacket(function(buf) {
      equals(buf.byteLength, 8);
      var u32 = new Uint32Array(buf);
      equals(u32[0], 1);
      equals(u32[01], 0xFFFFFFFF);  // nothing to ack
    });
    // Now pass in a packet.
    var pkt = new Uint32Array(2);
    pkt[0] = 0xABABCDCD;
    pkt[1] = 0xFFFFFFFF;
    equals(n.processPacket(pkt.buffer), true);
    n.sendPacket(function(buf) {
      equals(buf.byteLength, 8);
      var u32 = new Uint32Array(buf);
      equals(u32[0], 2);
      equals(u32[01], 0xABABCDCD);  // acking previously received packet
    });
});
