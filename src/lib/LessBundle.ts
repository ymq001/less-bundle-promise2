/// <reference path="../typings/tsd.d.ts" />

import fs = require('fs');
import path = require('path');

class Writer {
  private __lines: Array<string>;

  constructor(operator) {
    if (Array.isArray(operator)) {
      this.__lines = operator;
      return;
    }
  }

  write(output, previousLine) {
    this.__lines.forEach(line => {
      const trim = line.trim();

      if (!previousLine && !trim) {
        return;
      }

      output.push(line);
      previousLine = trim;
    });
    return previousLine;
  }
}

export interface IObject<T> {
  [x: string]: T;
}

export default class LessBundle {
  private writers: Array<Writer> = [];
  private output: Array<string>;
  private imports: IObject<boolean>;
  private lessFileRegex: RegExp;
  private cssFileRegex: RegExp;
  private stringLiteralRegex: RegExp;

  constructor() {
    this.writers = [];
    this.output = [];
    this.imports = {};
    this.lessFileRegex = /.less$/;
    this.cssFileRegex = /.css$/;
    this.stringLiteralRegex = /.*(?:'|")(.*)(?:'|").*/;
  }

  buildContents(lines: string[], filePath: string, nodeModulesPath: string) {
    let currentLines = [];
    let line;
    let hashPath;
    let imported;
    let file;
    let splitLines;

    if (typeof this.imports[filePath] === 'undefined') {
      this.imports[filePath] = true;
    }

    for (var index = 0; index < lines.length; ++index) {
      line = lines[index].trim();

      if (line.indexOf('@import ') === 0) {
        // We found an import statement
        if (currentLines.length > 0) {
          this.writers.push(new Writer(currentLines));
          currentLines = [];
        }

        imported = line.replace(this.stringLiteralRegex, '$1');
        if (!(this.lessFileRegex.test(imported) || this.cssFileRegex.test(imported))) {
          imported += '.less';
        }

        if (imported.match(/^~/)) {
          hashPath = imported.replace('~', nodeModulesPath ? nodeModulesPath : path.join(__dirname, '../../'));
        } else {
          hashPath = path.resolve(filePath, '..', imported);
        }
        if (typeof this.imports[hashPath] === 'undefined') {
          this.imports[hashPath] = true;
          file = fs.readFileSync(hashPath, 'utf8');
          splitLines = file.split(/\r\n|\n/);
          splitLines[0] = splitLines[0].trim();
          this.buildContents(splitLines, hashPath, nodeModulesPath);
        }

        continue;
      }
      currentLines.push(lines[index]);
    }

    // Push all remaining lines
    this.writers.push(new Writer(currentLines));
    return index;
  }

  removeEmptyStringsFromEnd(output) {
    while (!output[output.length - 1]) {
      output.pop();
    }
  }

  generateOutput() {
    let previousLine = '';

    this.writers.forEach(writer => {
      previousLine = writer.write(this.output, previousLine);
    });

    this.removeEmptyStringsFromEnd(this.output);
  }

  compressor({ src, dest, writeFile = true, nodeModulesPath }: { src: string; dest?: string[]; writeFile: boolean; nodeModulesPath?: string; }): Promise<string> {
    return new Promise((resolve, reject) => {
      if (writeFile) {
        dest.forEach((outFile, index) => {
          var end = outFile.lastIndexOf('.');
          dest[index] = outFile.substring(0, (end > -1) ? end : undefined) + '.less';
        });
      }

      const file = fs.readFileSync(src, { encoding: 'utf-8' });
      const splitLines = file.split(/\r\n|\n/);
      splitLines[0] = splitLines[0].trim();

      this.buildContents(splitLines, src, nodeModulesPath);

      this.generateOutput();

      if (this.output[this.output.length - 1] && !!this.output[this.output.length - 1].trim()) {
        this.output.push('');
      }

      if (writeFile) {
        dest.forEach(destFile => {
          var destPath = path.resolve(destFile),
            split = path.resolve(destPath, '..').split(/\/|\\/),
            concat = '';

          if (/[a-zA-Z]:/.test(split[0])) {
            split.shift();
            split.unshift('/' + split.shift());
          }

          split.forEach(val => {
            concat += val + '/';
            try {
              fs.mkdirSync(concat);
            } catch (err) {
              // TODO
            }
          });

          this.writeToFile(destPath, this.output)
            .then(() => resolve(this.output.join('\n')))
            .catch(error => reject(error));
        });
      }

      resolve(this.output.join('\n'));
    });
  }

  writeToFile(path, data) {
    return new Promise(function (resolve, reject) {
      try {
        var fd = fs.openSync(path, 'w'),
          buffer = new Buffer(data.join('\n'), 'utf8');

        fs.writeSync(fd, buffer, 0, buffer.length, 0);
        fs.closeSync(fd);
        resolve();
      } catch (err) {
        console.log('Could not write to file: ' + JSON.stringify(err, null, 4));
        reject(err);
      }
    });
  }
}
