(function(scope) {
  'use strict';

  function $(selector, node) {
    return (node || document).querySelector(selector);
  }

  scope.file = undefined;
  scope.noEntryPoint = false;
  scope.multipleEntryPoints = false;
  scope.entryPoints = [];
  scope.working = false;
  scope.hasData = false;
  scope.api = undefined;
  scope.errors = [];
  scope.selectedOutput = 0;
  scope.ramlFileUrl =
    // 'https://raw.githubusercontent.com/advanced-rest-client/raml-example-api/master/api.raml';
    'https://cdn.rawgit.com/advanced-rest-client/drive-raml-api-v2/1f85d308/api.raml';
  scope.fileListChanged = function(e) {
    scope.hasData = false;
    scope.noEntryPoint = false;
    scope.multipleEntryPoints = false;
    scope.entryPoints = [];
    scope.api = undefined;

    //
    // Depending on number of files and if file is zip the flow will be different.
    //
    var file = e.target.file;
    scope.file = file;
    if (file.length === 1) {
      // no multiple files.
      // If it is not zip file, it can go directly to the parser
      if (file[0].name.indexOf('.zip') !== 1) {
        // first we need to decompress the zip file, select main file and
        // finally pass all file structure to the parser.
        $('web-unzip').file = file;
        return;
      }
      // Parse single file.
      scope.parseRaml(file[0]);
    } else {
      // `raml-main-entry-lookup` will try to find the main RAML file.
      // In most cases it will be `api.raml` located in main folder.
      // If the element won't be able to determine which file is main it will return
      // a list of candidates in the event.
      $('raml-main-entry-lookup').files = file;
    }
  };

  scope._zipDataRead = function(e) {
    scope.file = e.detail.fileStructure;
    $('raml-main-entry-lookup').files = e.detail.fileStructure;
  };

  scope.entryFound = function(e) {
    console.log(e.detail);
    var file = e.detail.entry;
    if (!file) {
      scope.noEntryPoint = true;
      return;
    }
    if (file instanceof Array) {
      scope.multipleEntryPoints = true;
      scope.entryPoints = file;
    } else {
      scope.parseRaml(file);
    }
  };

  scope._useEntryPoint = function(e) {
    var item = e.model.get('item');
    scope.multipleEntryPoints = false;
    scope.entryPoints = [];
    scope.parseRaml(item);
  };

  scope.parseRaml = function(item) {
    scope.working = true;

    var detail = {
      'file': item.entry || item,
      'files': scope.file
    };
    var event = scope.fire('parse-raml-file', detail);
    if (!event.detail.raml) {
      console.error('Event did not contained raml property.');
      return;
    }

    event.detail.raml
      .then(function(result) {
        scope.handleParseResult(result);
      })
      .catch(function(e) {
        console.warn('API error', e);
        scope.working = false;
      });
  };

  scope._highlightApiJson = function() {
    window.setTimeout(function() {
      var obj = scope.api.expand(true).toJSON({
        dumpSchemaContents: true,
        rootNodeDetails: true,
        serializeMetadata: true
      });
      var txt = JSON.stringify(obj);
      var event = scope.fire('syntax-highlight', {
        code: txt,
        lang: 'js'
      });
      scope.$.out.innerHTML = event.detail.code;
      scope.working = false;
      scope.hasData = true;
    }, 1);
  };

  scope._displayApiStructure = function() {
    window.setTimeout(function() {
      var txt = '';
      scope.api.allResources().forEach(function(resource) {
        var rName = resource.displayName();
        var rUri = resource.absoluteUri();
        txt += rName + ' <small>' + rUri + '</small>\n';
        resource.methods().forEach(function(method) {
          var mName = method.displayName ? method.displayName() : null;
          var mMethod = method.method ? method.method() : 'unknown';
          var mDesc = method.description ? method.description() : null;
          if (mDesc) {
            mDesc = mDesc.value();
          }
          if (mName) {
            txt += '  ' + mName + ' <small>' + mMethod + '</small>\n';
          } else {
            txt += '  ' + mMethod + '\n';
          }
          txt += '  <small>' + mDesc + '</small>\n';
        });
      });
      scope.$.outStruct.innerHTML = txt;
      scope.working = false;
      scope.hasData = true;
    }, 2);
  };

  scope.toggleJson = function() {
    scope.$.jsonOutput.toggle();
  };
  scope.toggleStruct = function() {
    scope.$.structureOutput.toggle();
  };

  scope._downloadRaml = function() {
    var url = scope.ramlFileUrl;
    if (!url) {
      console.error('The URL is not set');
      return;
    }
    scope.working = true;
    var detail = {
      'url': url
    };
    var event = scope.fire('parse-raml-url', detail);
    if (!event.detail.raml) {
      console.error('The event did not handled the RAML property.');
      scope.working = false;
      return;
    }

    event.detail.raml
    .then(function(result) {
      scope.handleParseResult(result);
    })
    .catch(function(e) {
      console.warn('API error', e);
      scope.working = false;
    });
  };

  scope.handleParseResult = function(data) {
    scope.api = data.result;
    scope._displayApiStructure(data.json.specification);
    scope.errors = data.json.errors;
    console.log(data.json.specification);
  };

  // window.addEventListener('WebComponentsReady', function() {
  //
  // });

  scope._parserReady = function() {
    scope._downloadRaml();
  };

})(document.querySelector('#app'));
