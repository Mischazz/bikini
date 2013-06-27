M.LocalStorageStore = M.Store.extend({

    _type: 'M.LocalStorageStore',

    name: 'bikini',

    ids: {},

    sync: function( method, model, options ) {
        var options = options || {};
        var that = options.store || this.store;
        var entity = that.getEntity(model, options, this.entity);
        if( that && entity && model ) {
            var id = model.id || (method === 'create' ? new M.ObjectID().toHexString() : null);
            var attrs = options.attrs || model.attributes;
            switch( method ) {
                case 'patch':
                case 'update':
                    var data = that._getItem(entity, id) || {};
                    attrs = _.extend(data, attrs);
                case 'create':
                    that._setItem(entity, id, attrs);
                    break;
                case 'delete' :
                    that._removeItem(entity, id);
                    break;
                case 'read' :
                    if( id ) {
                        attrs = that._getItem(entity, id);
                    } else {
                        attrs = [];
                        var ids = that._getItemIds(entity);
                        for( id in ids ) {
                            var data = that._getItem(entity, id);
                            if( data ) {
                                attrs.push(data);
                            }
                        }
                    }
                    break;
                default:
                    return;
            }
        }
        if( attrs ) {
            that.handleSuccess(options, attrs);
        } else {
            that.handleError(options);
        }
    },

    _getKey: function( entity, id ) {
        return '_' + entity.name + '_' + id;
    },

    _getItem: function( entity, id ) {
        var attrs;
        if( entity && id ) {
            try {
                var data = JSON.parse(localStorage.getItem(this._getKey(entity, id)));
                if( data ) {
                    attrs = entity.toAttributes(data);
                    entity.setId(attrs, id); // fix id
                } else {
                    this._delItemId(id);
                }
            } catch( e ) {
                M.Logger.error(M.CONST.LOGGER.TAG_FRAMEWORK_DATA, 'Error while loading data from local storage: ', e);
            }
        }
        return attrs;
    },

    _setItem: function( entity, id, attrs ) {
        if( entity && id && attrs ) {
            try {
                var data = entity.fromAttributes(attrs);
                localStorage.setItem(this._getKey(entity, id), JSON.stringify(data));
                this._addItemId(entity, id);
            } catch( e ) {
                M.Logger.error(M.CONST.LOGGER.TAG_FRAMEWORK_DATA, 'Error while saving data to local storage: ', e);
            }
        }
    },

    _removeItem: function( entity, id ) {
        if( entity && id ) {
            localStorage.removeItem(this._getKey(entity, id));
            this._delItemId(entity, id);
        }
    },

    _addItemId: function( entity, id ) {
        var ids = this._getItemIds(entity);
        if( !(id in ids) ) {
            ids[id] = '';
            this._saveItemIds(entity, ids);
        }
    },

    _delItemId: function( entity, id ) {
        var ids = this._getItemIds(entity);
        if( id in ids ) {
            delete ids[id];
            this._saveItemIds(entity, ids);
        }
    },

    _getItemIds: function( entity ) {
        try {
            var key = '__ids__' + entity.name;
            if( !this.ids[entity.name] ) {
                this.ids[entity.name] = JSON.parse(localStorage.getItem(key)) || {};
            }
            return this.ids[entity.name];
        } catch( e ) {
            M.Logger.error(M.CONST.LOGGER.TAG_FRAMEWORK_DATA, 'Error while loading ids from local storage: ', e);
        }
    },

    _saveItemIds: function( entity, ids ) {
        try {
            var key = '__ids__' + entity.name;
            localStorage.setItem(key, JSON.stringify(ids));
        } catch( e ) {
            M.Logger.error(M.CONST.LOGGER.TAG_FRAMEWORK_DATA, 'Error while saving ids to local storage: ', e);
        }
    }
});