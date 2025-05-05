/**
 * `metro-react-native-babel-transformer` has recently been migrated to the React Native
 * repository and published under the `@react-native/metro-babel-transformer` name.
 * The new package is default on `react-native` >= 0.73.0, so we need to conditionally load it.
 */
const getReactNativeTransformer = () => {
  try {
    return require("@react-native/metro-babel-transformer");
  } catch (error) {
    return require("metro-react-native-babel-transformer");
  }
};

const getExpoTransformer = () => {
  try {
    return require("@expo/metro-config/babel-transformer");
  } catch (error) {
    return null;
  }
};

const SHADER_FILE_EXTENSIONS = [
  'glsl', // unified, any shader type
  'vert', // VERTex
  'frag', // FRAGment
  'tesc', // TESsellation Control shaders
  'tese', // TESsellation Evaluation shaders
  'geom', // GEOMetry shaders
  'comp', // COMPute shaders
];

const createTransformer = (transformer) => async (params) => {
  if (SHADER_FILE_EXTENSIONS.some((ext) => {
    return params.filename.toLowerCase().endsWith(`.${ext}`);
  })) {
    const { src } = params;
    const output = `;export default\`${src.replaceAll('\n', '\\n').replaceAll('\t', '\\t')}\`;`;

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
   * To avoid breaking projects, we should prioritze that package if it is available.
   **/
  getExpoTransformer() || getReactNativeTransformer()
);
