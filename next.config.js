// 排除不需要的的Node模块 目的是轻量化
/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        // Ignore node-specific modules when bundling for the browser
        // https://webpack.js.org/configuration/resolve/#resolvealias
        config.resolve.alias = {
            ...config.resolve.alias,
            "sharp$": false,
            "onnxruntime-node$": false,
        }
        config.resolve.fallback = {
            fs: false,
        };
        return config;
    },
}

module.exports = nextConfig
