const upstreamTransformer = (function () {
  try {
    const resolver = require("@react-native/metro-babel-transformer");
    return resolver;
  } catch (error) {
    return require("metro-react-native-babel-transformer");
  }
}());

const SHADER_FILE_EXTENSIONS = [
  'glsl', // unified, any shader type
  'vert', // VERTex
  'frag', // FRAGment
  'tesc', // TESsellation Control shaders
  'tese', // TESsellation Evaluation shaders
  'geom', // GEOMetry shaders
  'comp', // COMPute shaders
];

const transform = async (params) => {
  if (SHADER_FILE_EXTENSIONS.some((ext) => {
    return params.filename.toLowerCase().endsWith(`.${ext}`);
  })) {
    const { src } = params;
    const output = `;export default\`${src.replaceAll('\n', '\\n').replaceAll('\t', '\\t')}\`;`;

    return upstreamTransformer.transform({
      ...params,
      src: output,
    });
  }

  return upstreamTransformer.transform(params);
};

module.exports.transform = transform;
