#Less Bundle Promise Single (less-bundle-single)

Bundle all of your LESS files into a single file. Useful for large projects with multiple components utilizing their own LESS files.

## Usage

```javascript
const path = require('path');
const LessBundle = require('less-bundle-promise');

new LessBundle().compressor({
    src: 'main.less'
}).then(output =>{
  // do something with output less
}).catch(error => {
  console.log('Error', error);
});

// Or write to a file
new LessBundle().compressor({
    src: 'main.less',
    dest: 'bundle.less',
    writeFile: true
}).then(output =>{
  // do something with output less
}).catch(error => {
  console.log('Error', error);
});

// Or write to a file and custom node_modules path
new LessBundle().compressor({
    src: 'main.less',
    dest: 'bundle.less',
    writeFile: true,
    nodeModulesPath: path.join(__dirname, './node_modules');
}).then(output =>{
  // do something with output less
}).catch(error => {
  console.log('Error', error);
});

A `bundle.less` file will be generated with all less output
```