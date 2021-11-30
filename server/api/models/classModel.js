'use strict';

var classQuery = require('../models/classQuery');
var classValidator = require('../validators/classValidator');
var utils = require('../utils');
var neo4jUtils = require('../neo4jUtils');

var classModel = {

    create: async function(c) {
        logger.log('classModel.create', {type: 'function'});

        // https://neo4j.com/docs/api/javascript-driver/current/
        const neo4jSession = neo4jDriver.session();
        const txc = neo4jSession.beginTransaction();
        
        try {
            // Class has to be validated on object creation as well, because there can be invalid classes
            if (c['extends'] !== undefined) {
                let ec = JSON.parse(JSON.stringify(c));
                
                if (Array.isArray(c['extends'])) {
                    const extendsResultRaw = await txc.run(classQuery.get({ids: c['extends']}, {mode: 'inherited'}));
                    const extendsResult = neo4jUtils.formatRecord(extendsResultRaw.records[0]);
                    for (let erk in extendsResult) {
                        utils.mergeObjects(ec, extendsResult[erk]);
                    }
                } else {
                    const extendsResultRaw = await txc.run(classQuery.get({id: c['extends']}, {mode: 'inherited'}));
                    const extendsResult = neo4jUtils.formatRecord(extendsResultRaw.records[0], {singleRecord: true});
                    utils.mergeObjects(ec, extendsResult);
                }
                
                // console.log('ec', utils.showJSON(ec));
                
                const extendedClassErrors = classValidator.createExtendedCheck(ec);
                // console.log('extendedClassErrors', utils.showJSON(extendedClassErrors));
                
                if (extendedClassErrors.length > 0) {
                    throw extendedClassErrors;
                }
            }
            
            const resultRaw = await txc.run(classQuery.create(c));
            const result = neo4jUtils.formatRecord(resultRaw.records[0], {singleRecord: true});

            await txc.commit();
            return result;
        } catch (e) {
            await txc.rollback();
            throw e;
        } finally {
            await neo4jSession.close();
        }
    },
    
    update: function(data, success, error) {
        logger.log('classModel.update', {type: 'function'});
        
        var query = classQuery.update(data);
        var neo4jSession = neo4jDriver.session();
        
        neo4jSession
            .run(query)
            .subscribe({
                onNext: function (data) {
                    // console.log('success', data);
                    success(data);
                },
                onCompleted: function () {
                    neo4jSession.close();
                },
                onError: function (err) {
                    console.log('error', err);
                    error(err);
                }
            });
    },
    
    find: function(params, success, error) {
        logger.log('classModel.find', {type: 'function'});
        
        var query = classQuery.find(params);
        var list = [];
        var neo4jSession = neo4jDriver.session();
        var errors;
        
        neo4jSession
            .run(query)
            .subscribe({
                onNext: function (data) {
                    var item = utils.getDbItem(data, {keyLeftTrim:2});
                    item._actions = 'rud';
                    list.push(item);
                },
                onCompleted: function () {
                    neo4jSession.close();
                    if (errors === undefined) {
                        success(list);
                    } else {
                        error(errors);
                    }
                },
                onError: function (err) {
                    errors = err;
                    error(errors);
                }
            })
        ;
    },

    get: async function(filter, options) {
        logger.log('classModel.get', {type: 'function'});
        
        const neo4jSession = neo4jDriver.session();
        const txc = neo4jSession.beginTransaction();

        if (options === undefined) options = {mode: 'inherited'};
        if (typeof filter === 'string') filter = {id: filter};
        
        const query = classQuery.get(filter, options);
        
        try {
            const resultRaw = await txc.run(query);
            
            if (resultRaw.records.length === 0) {
                throw new Error('Class not found');
            }
            
            const result = neo4jUtils.formatRecord(resultRaw.records[0], {singleRecord: true});
            await txc.commit();
            return result;
        } catch (e) {
            await txc.rollback();
            throw e;
        } finally {
            await neo4jSession.close();
        }
    },
    
    getForObject: async function(params) {
        logger.log('classModel.getForObject', {type: 'function'});
        
        const neo4jSession = neo4jDriver.session();
        const txc = neo4jSession.beginTransaction();
        const query = classQuery.getForObject(params);
        
        try {
            const resultRaw = await txc.run(query);
            
            if (resultRaw.records.length === 0) {
                throw new Error('Class not found');
            }
            
            const result = neo4jUtils.formatRecord(resultRaw.records[0], {singleRecord: true});
            await txc.commit();
            return result;
        } catch (e) {
            await txc.rollback();
            throw e;
        } finally {
            await neo4jSession.close();
        }
    },
    
    findByIds: function(ids, success, error) {
        logger.log('classModel.findByIds', {type: 'function'});

        var query = '';
        query += 'MATCH (n:Class) ';
        query += 'WHERE ID(n) IN ' + utils.formatField(ids) + ' ';
        query += 'RETURN ID(n), n.name, n.label';

        var list = [];
        var neo4jSession = neo4jDriver.session();
        var errors;
        
        // console.log('query', query);
        neo4jSession
            .run(query)
            .subscribe({
                onNext: function (data) {
                    var item = {
                        id: data._fields[0].low,
                        name: data._fields[1],
                        actions: 'rud'
                    };
                    
                    list.push(item);
                },
                onCompleted: function () {
                    // console.log('list', list);
                    // console.log('errors', errors);
                    neo4jSession.close();
                    if (errors === undefined) {
                        success(list);
                    } else {
                        error(errors);
                    }
                },
                onError: function (err) {
                    errors = err;
                    error(errors);
                }
            })
        ;
    },
    
    getLabels: function(ids, success, error) {
        logger.log('classModel.getLabels', {type: 'function'});
        var query = '';
        var list = [];
        var errors;
        // console.log('class model get', filter);
        
        query += 'MATCH (n:Class) WHERE ID(n) IN ' + utils.formatField(ids) + ' ';
        query += 'RETURN ID(n) AS id, n.name AS name, n.label AS label';

        console.log('class query', query);

        var neo4jSession = neo4jDriver.session();
        neo4jSession
            .run(query)
            .subscribe({
                onNext: function (data) {
                    var item = utils.getDbItem(data);
                    console.log('item', item);
                    item.actions = 'rud';
                    list.push(item);
                },
                onCompleted: function () {
                    neo4jSession.close();
                    if (errors === undefined) {
                        success(list);
                    } else {
                        error(errors);
                    }
                },
                onError: function (err) {
                    errors = err;
                }
            })
        ;
    },

    delete: function(filter, success, error) {
        logger.log('classModel.delete', {type: 'function'});
        var query = '';
        query += 'MATCH (n:Class) ';
        query += 'WHERE ID(n) = ' + filter.id + ' ';
        // @TODO This can cause isolated nodes
        query += 'DETACH DELETE n RETURN true';

        var neo4jSession = neo4jDriver.session();
        neo4jSession
            .run(query)
            .subscribe({
                onNext: function (data) {
                    // console.log('Deleted successfully', data);
                    success(data);
                },
                onCompleted: function () {
                    neo4jSession.close();
                },
                onError: function (err) {
                    console.log('error', err);
                    error(err);
                }
            })
        ;
    },
    
    deleteMass: function(ids, success, error) {
        logger.log('classModel.deleteMass', {type: 'function'});
        var query = '';
        query += 'MATCH (n:Class) WHERE ID(n) = ' + id + ' ';
        query += 'DETACH DELETE n RETURN true';

        var neo4jSession = neo4jDriver.session();
        neo4jSession
            .run(query)
            .subscribe({
                onNext: function (data) {
                    success(data);
                },
                onCompleted: function () {
                    neo4jSession.close();
                },
                onError: function (err) {
                    console.log('error', err);
                    error(err);
                }
            })
        ;
    }
    
};

module.exports = classModel;