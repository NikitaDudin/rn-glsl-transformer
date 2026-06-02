const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const TRANSFORMER_REQUESTS = [
  '@expo/metro-config/babel-transformer',
  '@react-native/metro-babel-transformer',
  'metro-react-native-babel-transformer',
];

const baseOptions = {
  dev: true,
  hot: false,
  inlineRequires: false,
  minify: false,
  platform: 'ios',
  projectRoot: process.cwd(),
};

const loadRealTransformer = () => {
  const modulePath = require.resolve('../index');
  delete require.cache[modulePath];

  return require('../index');
};

const createMockTransformer = (name) => ({
  transform: async (params) => ({
    filename: params.filename,
    name,
    src: params.src,
  }),
});

const moduleNotFound = (request) => {
  const error = new Error(`Cannot find module '${request}'`);
  error.code = 'MODULE_NOT_FOUND';
  return error;
};

const loadWithMockedTransformers = (availableTransformers) => {
  const modulePath = require.resolve('../index');
  const originalResolveFilename = Module._resolveFilename;
  const originalLoad = Module._load;
  const mockedPaths = new Map();

  for (const [request, transformer] of Object.entries(availableTransformers)) {
    mockedPaths.set(request, {
      path: `/virtual/rn-glsl-transformer/${request.replaceAll('/', '__')}.js`,
      transformer,
    });
  }

  Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
    if (TRANSFORMER_REQUESTS.includes(request)) {
      const mock = mockedPaths.get(request);

      if (!mock) {
        throw moduleNotFound(request);
      }

      return mock.path;
    }

    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Module._load = function load(request, parent, isMain) {
    for (const mock of mockedPaths.values()) {
      if (request === mock.path) {
        return mock.transformer;
      }
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[modulePath];

  try {
    return require('../index');
  } finally {
    delete require.cache[modulePath];
    Module._resolveFilename = originalResolveFilename;
    Module._load = originalLoad;
  }
};

const transform = (transformer, filename, src) =>
  transformer.transform({
    filename: path.join(process.cwd(), filename),
    options: baseOptions,
    plugins: [],
    src,
  });

const walk = (value, visit) => {
  if (!value || typeof value !== 'object') {
    return;
  }

  visit(value);

  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        walk(item, visit);
      }
    } else {
      walk(child, visit);
    }
  }
};

const getExportsMemberName = (node) => {
  if (
    !node ||
    node.type !== 'MemberExpression' ||
    node.object.type !== 'Identifier' ||
    node.object.name !== 'exports'
  ) {
    return null;
  }

  if (node.property.type === 'Identifier') {
    return node.property.name;
  }

  if (node.property.type === 'StringLiteral') {
    return node.property.value;
  }

  return null;
};

const findExportAssignment = (ast, exportName) => {
  const matches = [];

  walk(ast, (node) => {
    if (
      node.type === 'AssignmentExpression' &&
      getExportsMemberName(node.left) === exportName
    ) {
      matches.push(node);
    }
  });

  return matches.at(-1) || null;
};

test('exports a Metro transform function', () => {
  const transformer = loadRealTransformer();

  assert.equal(typeof transformer.transform, 'function');
});

test('transforms shader files into default string exports with Expo Metro', async () => {
  const transformer = loadRealTransformer();
  const src = [
    'void main() {',
    '  gl_FragColor = vec4(`tick`, ${u_time}, 1.0, 1.0);',
    '  // Keep slashes \\ and / intact.',
    '}',
    '',
  ].join('\n');

  for (const ext of ['glsl', 'vert', 'frag', 'tesc', 'tese', 'geom', 'comp', 'wgsl']) {
    const result = await transform(transformer, `shader.${ext}`, src);
    const assignment = findExportAssignment(result.ast, 'default');

    assert.ok(assignment, `expected default export for .${ext}`);
    assert.equal(assignment.right.type, 'StringLiteral');
    assert.equal(assignment.right.value, src);
  }
});

test('matches shader extensions case-insensitively', async () => {
  const transformer = loadRealTransformer();
  const result = await transform(transformer, 'shader.FRAG', 'void main() {}');
  const assignment = findExportAssignment(result.ast, 'default');

  assert.ok(assignment);
  assert.equal(assignment.right.value, 'void main() {}');
});

test('passes regular JavaScript files through the upstream transformer', async () => {
  const transformer = loadRealTransformer();
  const result = await transform(transformer, 'sample.js', 'export const answer = 42;\n');
  const assignment = findExportAssignment(result.ast, 'answer');

  assert.ok(assignment);
  assert.equal(assignment.right.type, 'NumericLiteral');
  assert.equal(assignment.right.value, 42);
});

test('prefers the Expo Metro transformer when it is available', async () => {
  const transformer = loadWithMockedTransformers({
    '@expo/metro-config/babel-transformer': createMockTransformer('expo'),
    '@react-native/metro-babel-transformer': createMockTransformer('react-native'),
    'metro-react-native-babel-transformer': createMockTransformer('legacy'),
  });

  const result = await transform(transformer, 'sample.js', 'source');

  assert.equal(result.name, 'expo');
});

test('falls back to the React Native Metro transformer without Expo', async () => {
  const transformer = loadWithMockedTransformers({
    '@react-native/metro-babel-transformer': createMockTransformer('react-native'),
    'metro-react-native-babel-transformer': createMockTransformer('legacy'),
  });

  const result = await transform(transformer, 'sample.js', 'source');

  assert.equal(result.name, 'react-native');
});

test('falls back to the legacy Metro transformer last', async () => {
  const transformer = loadWithMockedTransformers({
    'metro-react-native-babel-transformer': createMockTransformer('legacy'),
  });

  const result = await transform(transformer, 'sample.js', 'source');

  assert.equal(result.name, 'legacy');
});

test('serializes shader source before sending it to the upstream transformer', async () => {
  const transformer = loadWithMockedTransformers({
    '@expo/metro-config/babel-transformer': createMockTransformer('expo'),
  });
  const source = 'uniform float value; // `template` ${safe}\n';
  const result = await transform(transformer, 'shader.frag', source);

  assert.equal(result.src, `export default ${JSON.stringify(source)};`);
});

test('throws a clear error when no upstream transformer can be resolved', () => {
  assert.throws(
    () => loadWithMockedTransformers({}),
    /Unable to find a React Native Metro Babel transformer/
  );
});
