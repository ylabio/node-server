const Collection = require('../../services/storage/collection.js');
const storage = require('@google-cloud/storage');
const ObjectID = require('mongodb').ObjectID;
const {errors, stringUtils} = require('../../lib');
const moment = require('moment');

class File extends Collection {

  define() {
    const parent = super.define();
    return {
      collection: 'file',
      indexes: {
        //title: [{'title': 1}, {'unique': true, partialFilterExpression: {isDeleted: false}}],
      },
      // Полная схема объекта
      model: this.spec.extend(parent.model, {
          title: 'Файл (создание)',
          properties: {
            url: {type: 'string', example: 'http://example.com/file.png'},
            name: {type: 'string'},
            type: {type: 'string', enum: ['video', 'image', 'other']},
            mime: {type: 'string'},
            extension: {type: 'string'},
            originalName: {type: 'string'},
            status: {type: 'string', enum: ['loading', 'loaded', 'error']},
            sets: {
              type: 'object',
              patternProperties: {
                '^.+$': this.spec.generate('rel', {description: 'Файл', type: 'file'})
              },
              default: {},
              description: 'Производные файлы, например, превью',
              additionalProperties: true
            }
          },
          required: ['url'],
          additionalProperties: false
        }
      )
    };
  }

  schemes() {
    return {
      // Схема создания
      create: this.spec.extend(this._define.model, {
        title: 'Файл (создание)',
        properties: {
          $unset: [
            '_id', '_type',
            'dateCreate', 'dateUpdate', 'isDeleted', 'status'
          ],
        }
      }),

      // Схема редактирования
      update: this.spec.extend(this._define.model, {
          title: 'Файл (изменение)',
          properties: {
            $unset: [
              '_id', '_type',
              'dateCreate', 'dateUpdate'
            ]
          },
          $set: {
            required: []
          },
          $mode: 'update'
        }
      ),

      // Схема просмотра
      view: this.spec.extend(this._define.model, {
          title: 'Файл (просмотр)',
          $set: {
            required: [],
          },
          $mode: 'view'
        }
      ),
    };
  }

  async init(config, services) {
    await super.init(config, services);
    this.gcs = storage({
      projectId: this.config.gcs.projectId,
      keyFilename: this.config.gcs.keyFilename
    });
    this.buckets = {};
    const names = Object.keys(this.config.gcs.buckets);
    for (let name of names) {
      this.buckets[name] = this.gcs.bucket(this.config.gcs.buckets[name].name);
    }

    return this;
  }

  getBucketKeyByMimeExt(mime, extension) {
    mime = mime.toLowerCase();
    extension = extension.toLowerCase();
    const names = Object.keys(this.config.gcs.buckets);
    for (let name of names) {
      const item = this.config.gcs.buckets[name];
      if ((item.mimes.indexOf('*') !== -1 || item.mimes.indexOf(mime) !== -1) &&
        (item.extensions.indexOf('*') !== -1 || item.extensions.indexOf(extension) !== -1)
      ) {
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
    body.type = this.getBucketKeyByMimeExt(body.mime, body.extension);
    if (!body.type) {
      throw new errors.Validation([{
        path: ['mime'],
        rule: 'enum',
        accept: 'Some. Please, see documentation',
        message: 'Not supported file extension or mime'
      }]);
    }
    const secret = stringUtils.random(12, 'abcdefghijklmnopqrstuvwxyz0123456789');
    const bucketName = this.config.gcs.buckets[body.type].name;
    const _id = new ObjectID(); // id для сущности и url файла
    body.name = `${_id.toString()}-${secret}.${body.extension}`;
    body.url = `https://storage.googleapis.com/${bucketName}/${body.name}`;

    const streamWrite = this.buckets[body.type].file(body.name).createWriteStream({
      metadata: {
        contentType: body.mime
      },
      public: true
    });

    stream.pipe(streamWrite);

    let result;
    try {
      result = await this.createOne({
        body, session, fields,
        prepare: (parentPrepare, object) => {
          parentPrepare(object);
          object._id = _id;
          object.status = 'loading';
        }
      });
    } catch (e) {
      streamWrite.destroy();
      throw e;
    }
    try {
      await new Promise((resolve, reject) => {
        streamWrite.on('finish', resolve);
        streamWrite.on('error', reject);
        //stream.on('end', () => resolve());
        stream.on('error', () => {
          streamWrite.destroy('Client stream error');
          reject();
        });
      });

      this.native.updateOne({_id}, {$set: {status: 'loaded'}});
      result.status = 'loaded';

    } catch (e) {
      this.native.updateOne({_id}, {$set: {status: 'error'}});
      throw e;
    }
    return result;
  }


  async cleanup(log = true) {
    const minDate = moment().subtract(3, 'days').unix();
    let result = {
      countFiles: 0,
      countObjects: 0
    };
    const buckets = this.buckets;
    const bucketsNames = Object.keys(buckets);
    for (let bucketName of bucketsNames) {
      const fileList = await buckets[bucketName].getFiles();
      for (let file of fileList[0]) {
        let deleteFile = false;
        try {
          const fileEntity = await this.getOne({filter: {name: file.name}, view: false});
          if (
            (fileEntity.status === 'error') ||
            (fileEntity.status === 'loading' && fileEntity.dateCreate < minDate)
          ) {
            //@todo + check external links
            //await this.destroyOne({id: fileEntity._id, view: false});
            result.countObjects++;
            deleteFile = true;
          }
        } catch (e) {
          if (e instanceof errors.NotFound) {
            // deleteFile = true;
          }
        }
        if (deleteFile) {
          //file.delete();
          result.countFiles++;
          if (log) {
            console.log('Delete: ' + file.name);
          }
        }
      }
    }
    return result;
  }
}

module.exports = File;
