const webpack = require('webpack');
const CopyWebpackPlugin = require("copy-webpack-plugin");
const CleanWebpackPlugin = require('clean-webpack-plugin');
const path = require('path')
const fs = require('fs')

const sourcePath = path.join(__dirname, '../dist')
const rootPath = path.join(__dirname, '../bin')
const destPath = ["linux/resources/app","mac/Orion6.app/Contents/Resources/app","win/resources/app"]

let copyItems = []
destPath.forEach( function(v){
  var p = path.join(rootPath, v)
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p)
  }
  copyItems.push({
    from: sourcePath,
    to: p,
  })
})

module.exports = {
    target:'node',
    mode: 'production',
    entry: path.join(__dirname, 'publish/index.js'),
    output: {
      path: path.join(__dirname, 'publish'),
      filename: 'publish.js'
    },
    devtool: 'none',
  plugins: [
    new CleanWebpackPlugin(destPath, {
      root: rootPath,
      verbose: true, //开启在控制台输出信息
      dry: false,
    }),
    new CopyWebpackPlugin(copyItems),
  ]
}