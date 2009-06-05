var JetpackRuntimeTests = {
  _makeFakeFeed: function _makeFakeFeed(contents) {
    function fakeUri(url) {
      return {spec: url};
    }
    return {
      uri: fakeUri("http://www.foo.com/blah.html"),
      srcUri: fakeUri("http://www.foo.com/blah.js"),
      getCode: function() {
        return contents;
      }
    };
  },

  testContextWorks: function(self) {
    var wasLogCalled = false;
    var fakeConsole = {
      log: function log(text) {
        self.assertEqual(text, "hallo");
        wasLogCalled = true;
      }
    };
    var fakeFeed = this._makeFakeFeed("console.log('hallo');");
    var context = new JetpackRuntime.Context(
      fakeFeed,
      {globals: {console: fakeConsole},
       importers: {}}
    );
    self.assert(wasLogCalled);
    context.unload();
  }
};
