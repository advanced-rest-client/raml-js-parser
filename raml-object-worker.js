/* global importScripts, self */
try {
  importScripts('polyfills.js', 'browser/index.js', 'raml2object.js');
} catch (e) {
  self.postMessage({
    error: true,
    message: e.message
  });
}

self.onmessage = function(e) {
  try {
    var result = raml2obj.parse(e.data.raml);
    self.postMessage({
      result: result,
      state: e.data.state
    });
  } catch (e) {
    self.postMessage({
      error: true,
      message: e.message,
      state: e.data.state
    });
  }
};
