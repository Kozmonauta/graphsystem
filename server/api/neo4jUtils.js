var neo4jUtils = {

    formatRecords: function(records, options) {
        var res = [];
        for (var i=0;i<records.length;i++) {
            res.push(this.formatRecord(records[i], options));
        }
        return res;
    },
    
    formatRecord: function(record, options) {
        if (options === undefined) options = {};
        var res = {};
// console.log('formatRecord', utils.showJSON(record));
        for (var i=0;i<record.keys.length;i++) {
            var fieldKey = record.keys[i];
// console.log('fieldKey', fieldKey);
            var fieldData = record._fields[record._fieldLookup[fieldKey]];
            
            if (fieldData !== null) {
                if (fieldData.identity !== undefined) {
                    // if field is Edge
                    if (fieldData.start !== undefined) {
                        res[fieldKey] = this.formatEdge(fieldData);
                    } 
                    // if field is Node
                    else {
                        res[fieldKey] = this.formatNode(fieldData);
                    }
                } else 
                // if field is Integer
                if (fieldData.low !== undefined) {
                    res[fieldKey] = this.formatInteger(fieldData);
                } else 
                // other field types
                {
                    res[fieldKey] = fieldData;
                }
            }
        }
        
        if (options.singleRecord === true) {
            res = res[record.keys[0]];
        }
        
        return res;
    },
    
    // Format node
    formatNode: function(node) {
        let res = {};
        // console.log('node', node);
        // res.ID = this.formatInteger(node.identity);
        // res.id = res.
        res.labels = node.labels;
        if (node.classID !== undefined) res.classID = node.classID;
        res.fields = {};
        
        for (let pk in node.properties) {
            const property = node.properties[pk];
            
            if (pk === 'id') {
                res['id'] = property;
            } else {
                // if field is Integer
                if (property.low !== undefined) {
                    res.fields[pk] = this.formatInteger(property);
                } else 
                // other field types
                {
                    res.fields[pk] = property;
                }
            }
        }
        
        return res;
    },
    
    // Format edge
    formatEdge: function(edge) {
        let res = {};
        res.type = edge.type;
        res.fields = {};
        // console.log('edge', edge);
        for (let pk in edge.properties) {
            const property = edge.properties[pk];
            
            if (pk === 'id') {
                res['id'] = property;
            } else {
                // if field is Integer
                if (property.low !== undefined) {
                    res.fields[pk] = this.formatInteger(property);
                } else 
                // other field types
                {
                    res.fields[pk] = property;
                }
            }
        }
        
        return res;
    },
    
    formatInteger: function(i) {
        // TODO do it better
        return i.low;
    },
    
    // checks if path exists between n1Key and n2Key in an object
    findPath: function(n1Key, n2Key, o, edgesChecked) {
        if (edgesChecked === undefined) edgesChecked = [];
        
        for (let ek in o.edges) {
            if (edgesChecked.includes(ek)) continue;
            
            const e = o.edges[e];
            if (e.target === n1Key || e.source === n1Key) {
                edgesChecked.push(ek);
                if (e.target === n1Key) {
                    if (e.source === n2Key) {
                        return true;
                    } else {
                        return this.findPath(e.source, n2Key, o, edgesChecked);
                    }
                } else {
                    if (e.target === n2Key) {
                        return true;
                    } else {
                        return this.findPath(e.target, n2Key, o, edgesChecked);
                    }
                }
            }
        }
        
        return false;
    }
    
}

module.exports = neo4jUtils;