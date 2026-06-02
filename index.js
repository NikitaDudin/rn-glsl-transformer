const resolveOptional = (request) => {
  try {
    return require.resolve(request);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return null;
    }

    throw error;
  }
};

/**
 * `metro-react-native-babel-transformer` has recently been migrated to the React Native
 * repository and published under the `@react-native/metro-babel-transformer` name.
 * The new package is default on `react-native` >= 0.73.0, so we need to conditionally load it.
 */
const getReactNativeTransformer = () => {
  const transformerPath =
    resolveOptional("@react-native/metro-babel-transformer") ||
    resolveOptional("metro-react-native-babel-transformer");

  if (!transformerPath) {
    throw new Error(
      "Unable to find a React Native Metro Babel transformer. Install @react-native/metro-babel-transformer or metro-react-native-babel-transformer."
    );
  }

  return require(transformerPath);
};

const getExpoTransformer = () => {
  const transformerPath = resolveOptional("@expo/metro-config/babel-transformer");

  return transformerPath ? require(transformerPath) : null;
};

const SHADER_FILE_EXTENSIONS = [
  'glsl', // unified, any shader type
  'vert', // VERTex
  'frag', // FRAGment
  'tesc', // TESsellation Control shaders
  'tese', // TESsellation Evaluation shaders
  'geom', // GEOMetry shaders
  'comp', // COMPute shaders
  'wgsl', // WebGPU Shading Language
];

const createTransformer = (transformer) => async (params) => {
  if (SHADER_FILE_EXTENSIONS.some((ext) => {
    return params.filename.toLowerCase().endsWith(`.${ext}`);
  })) {
    const { src } = params;
    const output = `export default ${JSON.stringify(src)};`;

    return transformer.transform({
      ...params,
      src: output,
    });
  }

  return transformer.transform(params);
};

module.exports.transform = createTransformer(
  /*
   * Expo v50.0.0 has begun using @expo/metro-config/babel-transformer as its upstream transformer.
   * To avoid breaking projects, we should prioritize that package if it is available.
   **/
  getExpoTransformer() || getReactNativeTransformer()
);
