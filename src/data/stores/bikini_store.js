// Copyright (c) 2013 M-Way Solutions GmbH
// http://github.com/mwaylabs/The-M-Project/blob/absinthe/MIT-LICENSE.txt

/**
 * The Bikini.BikiniStore is used to connect a model collection to an
 * bikini server.
 *
 * This will give you an online and offline store with live data updates.
 *
 * @module Bikini.BikiniStore
 *
 * @type {*}
 * @extends Bikini.Store
 *
 * @example
 *
 * // The default configuration will save the complete model data as a json,
 * // and the offline change log to a local WebSql database, synchronize it
 * // trough REST calls with the server and receive live updates via a socket.io connection.
 *
 * var MyCollection = Bikini.Collection.extend({
 *      model: MyModel,
 *      url: 'http://myBikiniServer.com:8200/bikini/myCollection',
 *      store: new Bikini.BikiniStore( {
 *          useLocalStore:   YES, // (default) store the data for offline use
 *          useSocketNotify: YES, // (default) register at the server for live updates
 *          useOfflineChanges: YES // (default) allow changes to the offline data
 *      })
 * });
 *
 */
Bikini.BikiniStore = Bikini.Store.extend({

    _type: 'Bikini.BikiniStore',

    _selector: null,

    endpoints: {},

    options: null,

    localStore: Bikini.WebSqlStore,

    useLocalStore: YES,

    useSocketNotify: YES,

    useOfflineChanges: YES,

    isConnected: NO,

    typeMapping: {
        'binary': 'text',
        'date': 'string'
    },

    initialize: function( options ) {
        Bikini.Store.prototype.initialize.apply(this, arguments);
        this.options = this.options || {};
        this.options.useLocalStore = this.useLocalStore;
        this.options.useSocketNotify = this.useSocketNotify;
        this.options.useOfflineChanges = this.useOfflineChanges;
        this.options.socketPath = this.socketPath;
        this.options.localStore = this.localStore;
        this.options.typeMapping = this.typeMapping;
        if( this.options.useSocketNotify && typeof io !== 'object' ) {
            console.log('Socket.IO not present !!');
            this.options.useSocketNotify = NO;
        }
        _.extend(this.options, options || {});
    },

    initModel: function( model ) {
    },

    initCollection: function( collection ) {
        var url = collection.getUrlRoot();
        if(url.charAt(url.length - 1) !== '/') {
            url += '/';
        }
        var entity = this.getEntity(collection.entity);
        if( url && entity ) {
            var name = entity.name;
            var hash = this._hashCode(url);
            var credentials = entity.credentials || collection.credentials;
            var user = credentials && credentials.username ? credentials.username : '';
            var channel = name + user + hash;
            collection.channel = channel;
            // get or create endpoint for this url
            var that = this;
            var endpoint = this.endpoints[hash];
            if( !endpoint ) {
                var href = this.getLocation(url);
                endpoint = {};
                endpoint.baseUrl = url;
                endpoint.readUrl = collection.getUrl();
                endpoint.host = href.protocol + '//' + href.host;
                endpoint.path = href.pathname;
                endpoint.entity = entity;
                endpoint.channel = channel;
                endpoint.credentials = credentials;
                endpoint.socketPath = this.options.socketPath;
                endpoint.localStore = this.createLocalStore(endpoint);
                endpoint.messages = this.createMsgCollection(endpoint);
                endpoint.socket = this.createSocket(endpoint);
                endpoint.info = this.fetchServerInfo(endpoint);
                that.endpoints[hash] = endpoint;
            }
            collection.endpoint = endpoint;
            collection.listenTo(this, endpoint.channel, this.onMessage, collection);
        }
    },

    getEndpoint: function( url ) {
        if( url ) {
            var hash = this._hashCode(url);
            return this.endpoints[hash];
        }
    },

    createLocalStore: function( endpoint, idAttribute ) {
        if( this.options.useLocalStore && endpoint ) {
            var entities = {};
            entities[endpoint.entity.name] = {
                name: endpoint.channel,
                idAttribute: idAttribute
            };
            return this.options.localStore.create({
                entities: entities
            });
        }
    },

    createMsgCollection: function( endpoint ) {
        if( this.options.useOfflineChanges && endpoint ) {
            var messages = Bikini.Collection.design({
                url: endpoint.url,
                entity: 'msg-' + endpoint.channel,
                store: this.options.localStore.create()
            });
            var that = this;
            messages.fetch({
                success: function() {
                    that.sendMessages(endpoint);
                }
            });
            return messages;
        }
    },

    createSocket: function( endpoint, name ) {
        if( this.options.useSocketNotify && endpoint && endpoint.socketPath) {
            var that = this;
            var url  = endpoint.host;
            var path = endpoint.path;
            var href = this.getLocation(url);
            if(href.port === '') {
                if(href.protocol === 'https:') {
                    url += ':443';
                } else if(href.protocol === 'http:') {
                    url += ':80';
                }
            }

            //path = endpoint.socketPath || (path + (path.charAt(path.length - 1) === '/' ? '' : '/' ) + 'live');
            path = endpoint.socketPath;
            // remove leading /
            var resource = (path && path.indexOf('/') === 0) ? path.substr(1) : path;

            endpoint.socket = io.connect(url, { resource: resource });
            endpoint.socket.on('connect', function() {
                that._bindChannel(endpoint, name);
                that.onConnect(endpoint);
            });
            endpoint.socket.on('disconnect', function() {
                console.log('socket.io: disconnect');
                that.onDisconnect(endpoint);
            });
            return endpoint.socket;
        }
    },

    _bindChannel: function(endpoint, name ) {
        var that = this;
        if (endpoint && endpoint.socket) {
            var channel = endpoint.channel;
            var socket  = endpoint.socket;
            var time    = this.getLastMessageTime(channel);
            name = name || endpoint.entity.name;
            socket.on(channel, function( msg ) {
                if( msg ) {
                    that.trigger(channel, msg);
                    if (that.options.useLocalStore) {
                        that.setLastMessageTime(channel, msg.time);
                    }
                }
            });
            socket.emit('bind', {
                entity: name,
                channel: channel,
                time: time
            });
        }
    },

    getLastMessageTime: function( channel ) {
        return localStorage.getItem('__' + channel + 'last_msg_time') || 0;
    },

    setLastMessageTime: function( channel, time ) {
        if( time ) {
            localStorage.setItem('__' + channel + 'last_msg_time', time);
        }
    },

    _hashCode: function( str ) {
        var hash = 0, char;
        if( str.length === 0 ) {
            return hash;
        }
        for( var i = 0, l = str.length; i < l; i++ ) {
            char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    },

    onConnect: function( endpoint ) {
        this.isConnected = YES;
        this.fetchChanges(endpoint );
        this.sendMessages(endpoint );
    },

    onDisconnect: function(endpoint) {
        this.isConnected = NO;
        if (endpoint.socket && endpoint.socket.socket) {
            endpoint.socket.socket.onDisconnect();
        }
    },

    onMessage: function( msg ) {
        if(!msg) {
            return;
        }
        var localStore = this.endpoint ? this.endpoint.localStore : null;
        var attrs = null;
        var method = null;
        var id = null;
        var options = {
            store: localStore,
            entity: this.entity,
            merge: YES,
            fromMessage: YES,
            parse: YES
        };
        if(msg.id && msg.method && msg.data){
            attrs = msg.data;
            method = msg.method;
            id = msg.id;
        } else {
            attrs = msg.attributes.data;
            method = msg.attributes.method;
            id = msg.attributes.id;
        }

        switch(method) {
            case 'patch':
            case 'update':
            case 'create':
                options.patch = method === 'patch';
                var model = id ? this.get(id) : null;
                if( model ) {
                    model.save(attrs, options);
                } else {
                    this.create(attrs, options);
                }
                break;
            case 'delete':
                if( msg.id || msg.attributes.id) {
                    if( id === 'all' ) {
                        while( (model = this.first()) ) {
                            if( localStore ) {
                                localStore.sync.apply(this, [
                                    'delete',
                                    model,
                                    { store: localStore, fromMessage: YES }
                                ]);
                            }
                            this.remove(model);
                        }
                        this.store.setLastMessageTime(this.endpoint.channel, '');
                    } else {
                        var msgModel = this.get(id);
                        if( msgModel ) {
                            msgModel.destroy(options);
                        }
                    }
                }
                break;

            default:
                break;
        }

    },

    sync: function( method, model, options ) {
        var that = options.store || this.store;
        if( options.fromMessage ) {
            return that.handleCallback(options.success);
        }
        var endpoint = that.getEndpoint(this.getUrlRoot());
        var promise = null;
        if( that && endpoint ) {
            var channel = this.channel;

            if( Bikini.isModel(model) && !model.id ) {
                model.set(model.idAttribute, new Bikini.ObjectID().toHexString());
            }

            var time = that.getLastMessageTime(channel);
            // only send read messages if no other store can do this
            // or for initial load
            if( method !== 'read' || !endpoint.localStore || !time ) {
                // do backbone rest
                promise = that.addMessage(method, model, // we don't need to call callbacks if an other store handle this
                    endpoint.localStore ? {} : options, endpoint);
            } else if( method === 'read' ) {
                promise =that.fetchChanges(endpoint);
            }
            if( endpoint.localStore ) {
                options.store = endpoint.localStore;
                endpoint.localStore.sync.apply(this, arguments);
            }
            return promise;
        }
    },

    addMessage: function( method, model, options, endpoint ) {
        var that = this;
        if( method && model ) {
            var changes = model.changedSinceSync;
            var data = null;
            var storeMsg = YES;
            switch( method ) {
                case 'update':
                case 'create':
                    data = options.attrs || model.toJSON();
                    break;

                case 'patch':
                    if( _.isEmpty(changes) ) {
                        return;
                    }
                    data = model.toJSON({ attrs: changes });
                    break;

                case 'delete':
                    break;

                default:
                    storeMsg = NO;
                    break;
            }
            var msg = {
                _id: model.id,
                id: model.id,
                method: method,
                data: data
            };
            var emit = function( endpoint, msg ) {
                return that.emitMessage(endpoint, msg, options, model);
            };
            if( storeMsg ) {
                this.storeMessage(endpoint, msg, emit);
            } else {
                return emit(endpoint, msg);
            }
        }
    },

    emitMessage: function( endpoint, msg, options, model ) {
        var channel = endpoint.channel;
        var that = this;
        var url = Bikini.isModel(model) || msg.method !== 'read' ? endpoint.baseUrl : endpoint.readUrl;
        if( msg.id && msg.method !== 'create' ) {
            url += (url.charAt(url.length - 1) === '/' ? '' : '/' ) + msg.id;
        }
        return model.sync.apply(model, [msg.method, model, {
            url: url,
            error: function( xhr, status ) {
                if( !xhr.responseText && that.options.useOfflineChanges ) {
                    // this seams to be only a connection problem, so we keep the message an call success
                    that.onDisconnect(endpoint);
                    that.handleCallback(options.success, msg.data);
                } else {
                    that.removeMessage(endpoint, msg, function( endpoint, msg ) {
                        // Todo: revert changed data
                        that.handleCallback(options.error, status);
                    });
                }
            },
            success: function( data ) {
                if (!that.isConnected) {
                    that.onConnect(endpoint);
                }
                that.removeMessage(endpoint, msg, function( endpoint, msg ) {
                    if( options.success ) {
                        var resp = data;
                        that.handleCallback(options.success, resp);
                    } else {
                        // that.setLastMessageTime(channel, msg.time);
                        if( msg.method === 'read' ) {
                            var array = _.isArray(data) ? data : [ data ];
                            for( var i = 0; i < array.length; i++ ) {
                                data = array[i];
                                if( data ) {
                                    that.trigger(channel, {
                                        id: data._id,
                                        method: 'update',
                                        data: data
                                    });
                                }
                            }
                        } else {
                            that.trigger(channel, msg);
                        }
                    }
                });
            },
            store: {}
        }]);
    },

    fetchChanges: function( endpoint ) {
        var that = this;
        var channel = endpoint ? endpoint.channel : '';
        var time = that.getLastMessageTime(channel);
        if( endpoint && endpoint.baseUrl && channel && time ) {
            var changes = new Bikini.Collection({});
            return changes.fetch({
                url: endpoint.baseUrl + 'changes/' + time,
                success: function(a, b, response) {
                    changes.each(function( msg ) {
                        if( msg.get('time') && msg.get('method') ) {
                            if (that.options.useLocalStore) {
                                that.setLastMessageTime(channel, msg.get('time'));
                            }
                            that.trigger(channel, msg);
                        }
                    });
                    return response.xhr;
                },
                credentials: endpoint.credentials
            });
        }
    },

    fetchServerInfo: function( endpoint ) {
        var that = this;
        if( endpoint && endpoint.baseUrl ) {
            var info = new Bikini.Model();
            var time = that.getLastMessageTime(endpoint.channel);
            var url = endpoint.baseUrl;
            if (url.charAt((url.length - 1)) !== '/') {
                url += '/';
            }
            return info.fetch({
                url: url + 'info',
                success: function(a, b, response) {
                    if( !time && info.get('time') ) {
                        that.setLastMessageTime(endpoint.channel, info.get('time'));
                    }
                    if( !endpoint.socketPath && info.get('socketPath') ) {
                        endpoint.socketPath = info.get('socketPath');
                        var name = info.get('entity') || endpoint.entity.name;
                        if( that.options.useSocketNotify ) {
                            that.createSocket(endpoint, name);
                        }
                    }
                    return response.xhr;
                },
                credentials: endpoint.credentials
            });
        }
    },

    sendMessages: function( endpoint ) {
        if( endpoint && endpoint.messages ) {
            var that = this;
            endpoint.messages.each(function( message ) {
                var msg;
                try {
                    msg = JSON.parse(message.get('msg'));
                } catch( e ) {
                }
                var channel = message.get('channel');
                if( msg && channel ) {
                    var model = that.createModel({ collection: endpoint.messages }, msg.data);
                    that.emitMessage(endpoint, msg, {}, model);
                } else {
                    message.destroy();
                }
            });
        }
    },

    mergeMessages: function( data, id ) {
        return data;
    },

    storeMessage: function( endpoint, msg, callback ) {
        if( endpoint && endpoint.messages && msg ) {
            var channel = endpoint.channel;
            var message = endpoint.messages.get(msg._id);
            if( message ) {
                var oldMsg = JSON.parse(message.get('msg'));
                message.save({
                    msg: JSON.stringify(_.extend(oldMsg, msg))
                });
            } else {
                endpoint.messages.create({
                    _id: msg._id,
                    id: msg.id,
                    msg: JSON.stringify(msg),
                    channel: channel
                });
            }
        }
        callback(endpoint, msg);
    },

    removeMessage: function( endpoint, msg, callback ) {
        if( endpoint && endpoint.messages ) {
            var message = endpoint.messages.get(msg._id);
            if( message ) {
                message.destroy();
            }
        }
        callback(endpoint, msg);
    },

    clear: function( collection ) {
        if( collection ) {
            var endpoint = this.getEndpoint(collection.getUrlRoot());
            if( endpoint ) {
                if( endpoint.messages ) {
                    endpoint.messages.destroy();
                }
                collection.reset();
                this.setLastMessageTime(endpoint.channel, '');
            }
        }
    },

   /*
     url = "http://example.com:3000/pathname/?search=test#hash";

     location.protocol; // => "http:"
     location.host;     // => "example.com:3000"
     location.hostname; // => "example.com"
     location.port;     // => "3000"
     location.pathname; // => "/pathname/"
     location.hash;     // => "#hash"
     location.search;   // => "?search=test"
     */
    getLocation: function( url ) {
        var location = document.createElement('a');
        location.href = url || this.url;
        // IE doesn't populate all link properties when setting .href with a relative URL,
        // however .href will return an absolute URL which then can be used on itself
        // to populate these additional fields.
        if( location.host === '' ) {
            location.href = location.href;
        }
        return location;
    }
});
