FBL.ns(
  function() {
    var Cc = Components.classes;
    var Ci = Components.interfaces;

    var versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"]
                         .getService(Ci.nsIVersionComparator);

    // If we're not Firebug 1.4, don't even bother with this.
    if (versionChecker.compare(Firebug.version, "1.4X0a") < 0)
      return;

    with (FBL) {
      var JETPACK_URL = "about:jetpack";

      var JetpackTabWatcher = {
        shouldCreateContext: function(browser, uri) {
          if (uri == JETPACK_URL) {
            if (Firebug.Activation){
              Firebug.Activation.watchBrowser(browser);
            }else{
              Firebug.URLSelector.watchBrowser(browser);
            }
            return true;
          }
        },
        shouldNotCreateContext: function(browser, uri) {
        },
        initContext: function(context) {
          var msg = ("Thanks for using Jetpack with Firebug! Please note " +
                     "that if you want to see your Jetpack's logging " +
                     "messages, you'll have to switch to the Firebug " +
                     "panel on the about:jetpack tab.");
          Firebug.Console.logFormatted([msg], context, 'log', false, null);
        },
        showContext: function(browser, context) {
          if (browser.contentWindow.location.href == JETPACK_URL) {
            Firebug.showChromeErrors = true;
            // Supress pointless 'not well formed' errors when
            // XHRs retrieve content that obviously isn't XML.
            Firebug.showXMLErrors = false;
            Firebug.activateSameOrigin = false;
          }
        },
        loadedContext: function(context) {
        },
        destroyContext: function(context) {
        }
      };

      var JetpackConsoleListener = {
        onConsoleInjected:function(context, win) {
          // Not sure if we need to wrap this, but let's be safe.
          win = XPCNativeWrapper(win);
          if (win.location.href == JETPACK_URL) {
            if (win.wrappedJSObject.Logging)
              win.wrappedJSObject.Logging._onFirebugConsoleInjected();
          }
        }
      };

      JetpackModule = extend(
        Firebug.Module,
        {
          loadedContext: function(context) {
          },
          watchWindow: function(context, win) {
          },
          initialize: function() {
            Firebug.Module.initialize.apply(this, arguments);
            Firebug.Console.addListener(JetpackConsoleListener);
            TabWatcher.addListener(JetpackTabWatcher);
          },

          shutdown: function() {
            Firebug.Module.shutdown.apply(this, arguments);
            Firebug.Console.removeListener(JetpackConsoleListener);
            TabWatcher.removeListener(JetpackTabWatcher);
          }
        });

      Firebug.registerModule(JetpackModule);

      Firebug.isJetpackSupported = true;

      // TODO: We should totally use this for something.
      //
      // function JetpackPanel() {}
      // JetpackPanel.prototype = extend(
      //   Firebug.Panel,
      //   {
      //     name: "Jetpack",
      //     title: "Jetpack",
      //
      //     initialize: function() {
      //       Firebug.Panel.initialize.apply(this, arguments);
      //     }
      //   });
      //
      // Firebug.registerPanel(JetpackPanel);
    }});
