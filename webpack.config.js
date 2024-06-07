const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

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
        // Handling images files
        test: /\.(png|svg|jpg|gif)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]' // Outputs files to assets directory in dist
        }
      },
      {
        // Handling model files
        test: /\.(obj|mtl|gltf|bin)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/models/[name][ext]'
        }
      },
      {
        // Handling texture files
        test: /\.(jpeg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/models/textures/[name][ext]'
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
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html', // Path to your template in the public folder
      filename: 'index.html', // Output file name
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    open: true,
    port: 3000,
  }
};
