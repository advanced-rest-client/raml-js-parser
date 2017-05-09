[![Build Status](https://travis-ci.org/advanced-rest-client/raml-js-parser.svg?branch=stage)](https://travis-ci.org/advanced-rest-client/raml-js-parser)  

# raml-js-parser

# `<raml-js-parser>`
The RAML parser (JS version) as a web component.

The `<raml-js-parser>` can accept an URL from where the API definition can be
downloaded or a RAML file from file input or with integration with `web-unzip` element with zip.js
library output (slightly altered by the `web-unzip` component).
Dependencies for the main RAML file should be set either on the element as a property or event's
`defail` property. See API for more details.

See demo for example of all use cases usages.

### Events based approach

Parser can be included only once in the DOM and other element do not need to have
direct access to this element. It uses browser's events system to pass data.
The `<raml-js-parser>` will listen for `parse-raml-url`, `parse-raml-content`
and `parse-raml-file` events and in a result the event details will contain the
`raml` property which is a Promise that will resolve itself when parser
finish work.

#### `parse-raml-url` event
This event will be handled only if it contains the `url` property in the
event detail object. It should be an URL to the RAML resource that will be
downloaded.
Note, that the web app has to have an CORS access to the resource in order to
download it.

#### `parse-raml-content` event
This event if useful when the app already have content of the RAML file as string
and it's ready to parse it.
Additionally it may contain a list of files or directory structure where the
parser will search for delepndencies (referenced libraries).

This event will be handled only if it contains the `content` property in
the event detail object. Additional files or directory structure can be
passed in the `files` property.

#### `parse-raml-file` event
To be used when the app want to parse a RAML file which is a FileEntry or
a File (Blob) object. It similar to the `parse-raml-content` event but before
invoking the same method it will read file content firest.

This event will be handled only if it contains the `file` property in
the event detail object. Additional files or directory structure can be
passed in the `files` property.

### Example
``` html
<raml-js-parser></raml-js-parser>
```

``` javascript
// Handler for drop event
processFile = (e) => {
  var items = Array.from(e.dataTransfer.items);
  var main = this.findMainRamlFileSomehow(items);

  let detail = {
    'file': main,
    'files': items // this is optional.
  };
  let event = this.fire('parse-raml-file', detail);

  if (!event.detail.raml) {
    // uuups, raml parser is not attached to the DOM.
    return;
  }

  event.detail.raml.then((api) => {
    // api is the parser output.
  });
};
```

## Use with ARC elements
This element is just a web component's implementation of the RAML JS parser.
ARC components requires enhanced JSON output of the JS parser. For that you
have to use `raml-json-enhance` element.

### Example:
```html
<raml-js-parser json latest-json="{{raml}}"></raml-js-parser>
<raml-json-enhance json="[[raml.specification]]"></raml-json-enhance>
```
```javascript
window.addEventListener('raml-json-enhance-ready', function(e) {
  console.log(e.detail.json); // contains ARC elements data model.
});
```
or in plain JavaScript
```html
<raml-js-parser json></raml-js-parser>
<raml-json-enhance></raml-json-enhance>
```
```javascript
var parser = document.querySelector('raml-js-parser');
parser.addEventListener('api-parse-ready', function(e) {
  var enhacer = document.querySelector('raml-json-enhance');
  enhacer.json = e.detail.json.specification;
});
parser.loadApi(urlToApi);

window.addEventListener('raml-json-enhance-ready', function(e) {
  console.log(e.detail.json); // contains ARC elements data model.
});
```

## ZIP files and multiple files
The element can work with zip files if using [web-unzip]() element. This element uses
[zip.js](https://gildas-lormeau.github.io/zip.js/) for unzipping files and is setting the `content`
property to each entry with the Blob of file contents.

After that you can either manually tell the parser which file is the main file or you can use
`raml-main-entry-lookup` element. The element will search the structure of files (either FileList
or result of reading the zip file by zip.js) and will point a candidate for the main file.
If candidates is more than one, then the user should pick the right one.

Example of usage is in [demo.js](demo/demo.js) file.



### Events
| Name | Description | Params |
| --- | --- | --- |
| api-parse-ready | Fired when the RAML file has been parsed and the result is ready. | result **Object** - The parsing result. |
json **Object** - (optional) Set when `json` property is set. JSON output. |
| error | Fired when error occurred while parsing the file. | error **Error** - The error object. |
| raml-js-parser-ready | Fired when the element has been attached to the DOM and is ready to parse data. | __none__ |
