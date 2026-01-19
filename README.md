# WeGA-WebApp-Mirador

Mirador web component for the WeGA WebApp. 

This web component defines a custom element `<wega-mirador>` and integrates the 
[mirador-image-tools] plugin into the original [Mirador viewer], providing 
enhanced image manipulation capabilities.

## Usage

Import the JavaScript and add the custom element to your HTML:

```html
<script type="module" src="WeGA-WebApp-Mirador.js"></script>
...
<wega-mirador></wega-mirador>
```

## Configuration

The `<wega-mirador>` web component can be configured via the attributes
* `@url`: A sequence of IIIF manifest URLs separated by whitespace.
* `@canvasindexorid`: A sequence of canvas IDs or numbers associated with 
  the respective entry for `@url`.
* `@lang`: The default display language of Mirador.


## Development

Install the node dependencies and build the project:

```shell
npm ci
npm run build
```

The build artifacts will be saved to the `dist/` directory.

[mirador-image-tools]: https://github.com/ProjectMirador/mirador-image-tools
[Mirador viewer]: https://github.com/ProjectMirador/mirador
