const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: {
        editor: './frontend/js/editor.js'
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery"
        })
    ],
    output: {
        path: path.resolve(__dirname, 'frontend', 'public', 'dist', 'js', 'editor'),
        filename: '[name].bundle.js',
        libraryTarget: 'var',
        library: 'editor'
    }
};