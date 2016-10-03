(function(scope) {
  'use strict';
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
    'https://cdn.rawgit.com/advanced-rest-client/raml-example-api/master/api.raml';
  scope.fileListChanged = () => {
    scope.hasData = false;
    scope.noEntryPoint = false;
    scope.multipleEntryPoints = false;
    scope.entryPoints = [];
    scope.api = undefined;
  };
  scope.entryFound = (e) => {
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

  scope._useEntryPoint = (e) => {
    var item = e.model.get('item');
    scope.multipleEntryPoints = false;
    scope.entryPoints = [];
    scope.parseRaml(item);
  };

  scope.parseRaml = (item) => {
    scope.working = true;

    let detail = {
      'file': item.entry,
      'files': scope.file
    };
    let event = scope.fire('parse-raml-file', detail);
    if (!event.detail.raml) {
      console.error('Event did not contained raml property.');
      return;
    }

    event.detail.raml
      .then((api) => {
        scope.api = api;
        scope._displayApiStructure();
        // scope._highlightApiJson();
        scope.errors = api.errors();
      })
      .catch((e) => {
        console.warn('API error', e);
        scope.working = false;
      });
  };

  scope._highlightApiJson = () => {
    window.setTimeout(() => {
      let obj = scope.api.expand(true).toJSON({
        dumpSchemaContents: true,
        rootNodeDetails: true,
        serializeMetadata: true
      });
      let txt = JSON.stringify(obj);
      let event = scope.fire('syntax-highlight', {
        code: txt,
        lang: 'js'
      });
      scope.$.out.innerHTML = event.detail.code;
      scope.working = false;
      scope.hasData = true;
    }, 1);
  };

  scope._displayApiStructure = () => {
    window.setTimeout(() => {
      let txt = '';
      scope.api.allResources().forEach((resource) => {
        let rName = resource.displayName();
        let rUri = resource.absoluteUri();
        txt += rName + ' <small>' + rUri + '</small>\n';
        resource.methods().forEach((method) => {
          let mName = method.displayName ? method.displayName() : null;
          let mMethod = method.method ? method.method() : 'unknown';
          let mDesc = method.description ? method.description() : null;
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

  scope.toggleJson = () => {
    scope.$.jsonOutput.toggle();
  };
  scope.toggleStruct = () => {
    scope.$.structureOutput.toggle();
  };

  scope._downloadRaml = () => {
    var url = scope.ramlFileUrl;
    if (!url) {
      return;
    }
    scope.working = true;

    let detail = {
      'url': url
    };
    let event = scope.fire('parse-raml-url', detail);
    if (!event.detail.raml) {
      console.error('Event did not contained raml property.');
      return;
    }

    event.detail.raml
      .then((api) => {
        scope.api = api;
        scope._displayApiStructure();
        // scope._highlightApiJson();
        scope.errors = api.errors();
      })
      .catch((e) => {
        console.warn('API error', e);
        scope.working = false;
      });
  };

})(document.querySelector('#app'));
