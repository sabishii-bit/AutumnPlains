// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.ts',
  mode: 'development',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        // Handling images and model files
        test: /\.(png|svg|jpg|jpeg|gif|obj|mtl)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]' // Outputs files to assets directory in dist
        }
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.css'],
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    assetModuleFilename: 'assets/[name][ext]', // Ensure assets go to the correct directory
    clean: true,
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    open: true,
    port: 3000,
  }
};
