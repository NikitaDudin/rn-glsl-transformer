
# rn-glsl-transformer

Simple React Native babel transformer for glsl, frag, vert, tesc, tese, geom and comp shader files.

[![npm version](https://img.shields.io/npm/v/rn-glsl-transformer.svg?style=flat)](https://www.npmjs.com/package/rn-glsl-transformer)
[![issues](https://img.shields.io/github/issues/nikitadudin/rn-glsl-transformer.svg?style=flat)](https://github.com/nikitadudin/rn-glsl-transformer/issues)

# Install
```
npm install gl-glsl-transformer
```

or

```
yarn add gl-glsl-transformer
```

# Configure

Merge the contents from your project's metro.config.js file with this config (create the file if it does not exist already).

`metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config');

const SOURCE_EXTS = ['glsl', 'vert', 'frag', 'tesc', 'tese', 'geom', 'comp'];

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push(...SOURCE_EXTS);
config.transformer.babelTransformerPath = require.resolve('rn-glsl-transformer');

module.exports = config;
```

# Usage

```js
import fragmentShader from './shader.frag';
import vertexShader from './shader.vert';

typeof fragmentShader === 'string'; // true
typeof vertexShader === 'string'; // true
```

## Typescript

Add the modules typing for each required file extension

`global.d.ts`:

```ts
declare module '*.glsl' {
  const content: string;
  export default content;
}

declare module '*.vert' {
  const content: string;
  export default content;
}

declare module '*.frag' {
  const content: string;
  export default content;
}

declare module '*.tesc' {
  const content: string;
  export default content;
}

declare module '*.tese' {
  const content: string;
  export default content;
}

declare module '*.geom' {
  const content: string;
  export default content;
}

declare module '*.comp' {
  const content: string;
  export default content;
}
```

# Contributing

Contributions are very welcome!

Thanks for contributions!

## License

[ISC](LICENSE)
