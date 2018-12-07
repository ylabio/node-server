const Collection = require('../../services/storage/collection.js');
//const storage = require('@google-cloud/storage');
const ObjectID = require('mongodb').ObjectID;
const {errors, stringUtils} = require('../../lib');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

class File extends Collection {

  define() {
    const parent = super.define();
    return {
      collection: 'file',
      indexes: this.spec.extend(parent.indexes, {
        //title: [{'title': 1}, {'unique': true, partialFilterExpression: {isDeleted: false}}],
      }),
      // Полная схема объекта
      model: this.spec.extend(parent.model, {
          title: 'Файл',
          properties: {
            url: {type: 'string', example: 'http://example.com/file.png'},
            name: {type: 'string', default: ''},
            kind: {type: 'string', default: 'other'},
            mime: {type: 'string', default: ''},
            extension: {type: 'string', default: ''},
            originalName: {type: 'string', default: ''},
            title: {type: 'string', default: ''},
            description: {type: 'string', default: ''},
            path: {type: 'string', default: ''},
            // sets: {
            //   type: 'object',
            //   patternProperties: {
            //     '^.+$': this.spec.generate('rel', {description: 'Файл', type: 'file'})
            //   },
            //   default: {},
            //   description: 'Производные файлы, например, превью',
            //   additionalProperties: true
            // }
          },
          required: ['url'],
          additionalProperties: false
        }
      )
    };
  }

  schemes() {
    return this.spec.extend(super.schemes(), {
      // Схема создания
      create: {
        properties: {
          $unset: ['path'],
        }
      },

      // Схема редактирования
      update: {
        properties: {
          $unset: ['path']
        },
      },

      // Схема просмотра
      view: {
        properties: {
          $unset: ['path'],
        }
      }

    });
  }

  async init(config, services) {
    await super.init(config, services);
    return this;
  }

  getKindByMimeExt(mime, ext) {
    mime = mime.toLowerCase();
    ext = ext.toLowerCase();
    const names = Object.keys(this.config.kinds);
    for (let name of names) {
      const kinds = this.config.kinds[name];
      if (kinds.indexOf('*') !== -1 || kinds.indexOf(ext) !== -1 || kinds.indexOf(mime) !== -1) {
        return name;
      }
    }
    return null;
  }

  /**
   * Загрузка и создание объекта файла
   * @param stream
   * @param body
   * @param session
   * @param fields
   * @returns {Promise.<*|Object>}
   */
  async upload({stream, body, session, fields = {'*': 1}}) {
    body.extension = body.originalName.split('.').pop();
    body.kind = this.getKindByMimeExt(body.mime, body.extension);
    if (!body.kind) {
      throw new errors.Validation([{
        path: ['mime'],
        rule: 'enum',
        accept: 'Some. Please, see documentation',
        message: 'Not supported file extension or mime'
      }]);
    }
    const secret = stringUtils.random(12, 'abcdefghijklmnopqrstuvwxyz0123456789');
    const _id = new ObjectID(); // id для сущности и url файла
    body.name = `${_id.toString()}-${secret}.${body.extension}`;
    body.url = `${this.config.url}/${body.name}`;
    const pathFile = path.resolve(this.config.dir, body.name);
    const streamWrite = fs.createWriteStream(pathFile, {flags: 'w'});

    stream.pipe(streamWrite);

    let result;
    try {
      await new Promise((resolve, reject) => {
        streamWrite.on('finish', resolve);
        streamWrite.on('error', reject);
        stream.on('end', () => resolve());
        stream.on('error', () => {
          streamWrite.destroy('Client stream error');
          reject();
        });
      });
      result = await this.createOne({
        body, session, fields,
        prepare: (parentPrepare, object) => {
          parentPrepare(object);
          object._id = _id;
          object.path = pathFile;
        }
      });
    } catch (e) {
      streamWrite.destroy();
      throw e;
    }
    return result;
  }


  async cleanup(log = true) {
    // const minDate = moment().subtract(3, 'days').unix();
    // let result = {
    //   countFiles: 0,
    //   countObjects: 0
    // };
    // const buckets = this.buckets;
    // const bucketsNames = Object.keys(buckets);
    // for (let bucketName of bucketsNames) {
    //   const fileList = await buckets[bucketName].getFiles();
    //   for (let file of fileList[0]) {
    //     let deleteFile = false;
    //     try {
    //       const fileEntity = await this.getOne({filter: {name: file.name}, view: false});
    //       if (
    //         (fileEntity.state === 'error') ||
    //         (fileEntity.state === 'loading' && fileEntity.dateCreate < minDate)
    //       ) {
    //         //@todo + check external links
    //         //await this.destroyOne({id: fileEntity._id, view: false});
    //         result.countObjects++;
    //         deleteFile = true;
    //       }
    //     } catch (e) {
    //       if (e instanceof errors.NotFound) {
    //         // deleteFile = true;
    //       }
    //     }
    //     if (deleteFile) {
    //       //file.delete();
    //       result.countFiles++;
    //       if (log) {
    //         console.log('Delete: ' + file.name);
    //       }
    //     }
    //   }
    // }
    // return result;
  }
}

module.exports = File;
