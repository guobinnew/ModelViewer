const webpack = require('webpack');
const CopyWebpackPlugin = require("copy-webpack-plugin");
const CleanWebpackPlugin = require('clean-webpack-plugin');
const path = require('path')
const fs = require('fs')


const distPath = path.join(__dirname, '../dist')
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath)
}

const serverPath = path.join(__dirname, '../server')
const clientPath = path.join(__dirname, '../client/dist')

module.exports = {
    target:'node',
    mode: 'production',
    entry: path.join(serverPath, 'index.js'),
    output: {
      path: path.join(distPath, 'backend'),
      filename: 'server.js'
    },
    devtool: 'none',
    module: {
      rules: [{
          test: /(\.jsx|\.js)$/,
          use: {
            loader: "babel-loader"
          },
          exclude: /node_modules/
        }]
  },
  node: {
		__filename: true,
		__dirname: true
	},
  plugins: [
    new CleanWebpackPlugin(["backend","frontend"], {
      root: distPath,
      verbose: true, //开启在控制台输出信息
      dry: false,
    }),
    new CopyWebpackPlugin([
      {
        from: path.join(serverPath, 'data'),
        to: path.join(distPath, 'backend/data'),
      },
      {
        from: clientPath,
        to: path.join(distPath, 'frontend'),
      }
    ]),
  ]
}