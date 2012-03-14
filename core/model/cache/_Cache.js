define([
	'dojo/_base/declare',
	'dojo/_base/array',
	'dojo/_base/lang',
	'dojo/_base/Deferred',
	'../_Extension'
], function(declare, array, lang, Deferred, _Extension){

	var hitch = lang.hitch,
		mixin = lang.mixin,
		indexOf = array.indexOf;

	return declare(_Extension, {
		// summary:
		//		Abstract base cache class, providing cache data structure and some common cache functions.
		constructor: function(model, args){
			args = args || {};
			var t = this, c = 'connect',
				s = t.store = args.store, old = s.fetch;
			t.columns = args.columns;
			if(!old && s.notify){
				//The store implements the dojo.store.Observable API
				t[c](s, 'notify', function(item, id){
					if(item === undefined){
						t._onDelete(id);
					}else if(id === undefined){
						t._onNew(item);
					}else{
						t._onSet(item);
					}
				});
			}else{
				t[c](s, old ? "onSet" : "put", "_onSet");
				t[c](s, old ? "onNew" : "add", "_onNew");
				t[c](s, old ? "onDelete" : "remove", "_onDelete");
			}
			t.clear();
			t._mixinAPI('byIndex', 'byId', 'indexToId', 'idToIndex', 'size', 
				'treePath', 'hasChildren', 'keep', 'free', 'item');
		},

		destroy: function(){
			this.inherited(arguments);
			this.clear();
		},
		
		//Public----------------------------------------------
		clear: function(){
			var t = this;
			t._priority = [];
			t._struct = {};
			t._cache = {};
			t._size = {};
			//virtual root node, with name ''.
			t._struct[''] = [];
			t._size[''] = -1;
		},
		
		byIndex: function(index, parentId){
			this.prepare('byIndex', arguments);
			return this._cache[this.indexToId(index, parentId)];
		},

		byId: function(id){
			this.prepare('byId', arguments);
			return this._cache[id];
		},

		indexToId: function(index, parentId){
			this.prepare('indexToId', arguments);
			var items = this._struct[parentId || ''];
			return items && items[index + 1];
		},

		idToIndex: function(id){
			this.prepare('idToIndex', arguments);
			var s = this._struct,
				pid = s[id] && s[id][0],
				index = indexOf(s[pid] || [], id);
			return index > 0 ? index - 1 : -1;
		},

		treePath: function(id){
			var s = this._struct, path = [];
			while(id !== undefined){
				path.unshift(id);
				id = s[id] && s[id][0];
			}
			if(path[0] !== ''){
				return [];
			}else{
				path.pop();
				return path;
			}
		},

		hasChildren: function(id){
			var t = this, s = t.store;
			t.prepare('hasChildren', arguments);
			var c = t.byId(id);
			return s.hasChildren && s.hasChildren(id, c && c.item);
		},

		size: function(parentId){
			this.prepare('size', arguments);
			var s = this._size[parentId || ''];
			return s >= 0 ? s : -1;
		},

		//Events--------------------------------------------
		onBeforeFetch: function(){},
		onAfterFetch: function(){},

		onSetColumns: function(columns){
			var t = this, id, c, colId, col;
			t.columns = columns;
			for(id in t._cache){
				c = t._cache[id];
				for(colId in columns){
					col = columns[colId];
					c.data[colId] = t._formatCell(col.id, c.rawData);
				}
			}
		},

		//Protected-----------------------------------------
		_itemToObject: function(item){
			var s = this.store;
			if(s.fetch){
				var i, len, obj = {}, attrs = s.getAttributes(item);
				for(i = 0, len = attrs.length; i < len; ++i){
					obj[attrs[i]] = s.getValue(item, attrs[i]);
				}
				return obj;	
			}
			return item;
		},

		_formatCell: function(colId, rawData){
			var col = this.columns[colId];
			return col.formatter ? col.formatter(rawData) : rawData[col.field || colId];
		},

		_formatRow: function(rowData){
			var cols = this.columns, res = {}, colId;
			if(!cols){ return rowData; }
			for(colId in cols){
				res[colId] = this._formatCell(colId, rowData);
			}
			return res;
		},

		_addRow:function(id, index, rowData, item, parentId){
			parentId = parentId || '';
			var t = this, st = t._struct, pr = t._priority, ids = st[parentId], i;
			if(!ids){
				throw new Error("Fatal error of cache._addRow: parent item " + parentId + " of " + id + " is not loaded");
			}
			if(!ids[index + 1]){
				ids[index + 1] = id;
			}else if(ids[index + 1] !== id){
				throw new Error("Fatal error of cache._addRow: different row id " + id + " and " + ids[index + 1] + " for same row index " + index);
			}
			st[id] = st[id] || [parentId];
			if(!parentId){
				i = indexOf(pr, id);
				if(i >= 0){
					pr.splice(i, 1);
				}
				pr.push(id);
			}
			t._cache[id] = {
				data: t._formatRow(rowData),
				rawData: rowData,
				item: item
			};
		},

		_loadChildren: function(parentId){
			var d = new Deferred(), t = this, s = t.store, items = [],
				row = t.byId(parentId);
			if(row){
				items = (s.getChildren && s.getChildren(row.item)) || [];
			}
			Deferred.when(items, function(items){
				t._size[parentId] = items.length;
				for(var i = 0, len = items.length; i < len; ++i){
					var item = items[i];
					t._addRow(s.getIdentity(item), i, t._itemToObject(item), item, parentId);
				}
				d.callback();
			}, hitch(d, d.errback));
			return d;
		},

		_onFetchBegin: function(size){
			var t = this,
				oldSize = t._size[''],
				newSize = t._size[''] = parseInt(size, 10);
			if(oldSize !== newSize){
				t.onSizeChange(newSize, oldSize);
			}
		},

		_onFetchComplete: function(d, start, items){
			try{
				var t = this, idx, ids = [], s = t.store;
				for(var i = 0, len = items.length; i < len; ++i){
					ids.push(s.getIdentity(items[i]));
					t._addRow(ids[i], start + i, t._itemToObject(items[i]), items[i]);
				}
				d.callback(ids);
			}catch(e){
				d.errback(e);
			}
		},
	
		_storeFetch: function(options, onFetched){
//            console.debug("\tFETCH start: ", 
//                    options.start, ", count: ", 
//                    options.count, ", end: ", 
//                    options.count && options.start + options.count - 1, ", options:", 
//                    this.options);

			var t = this,
				s = t.store, 
				d = new Deferred(),
				req = mixin({}, t.options || {}, options),
				onBegin = hitch(t, t._onFetchBegin),
				onComplete = hitch(t, t._onFetchComplete, d, options.start),
				onError = hitch(d, d.errback);
			t.onBeforeFetch();
			if(s.fetch){
				s.fetch(mixin(req, {
					onBegin: onBegin,
					onComplete: onComplete,
					onError: onError
				}));
			}else{
				var results = s.query(req.query, req);
				Deferred.when(results.total, onBegin);
				Deferred.when(results, onComplete, onError);
			}
			d.then(function(){
				t.onAfterFetch();
			});
			return d;
		},

		//--------------------------------------------------------------------------
		_onSet: function(item){
			var t = this,
				id = t.store.getIdentity(item),
				index = t.idToIndex(id),
				path = t.treePath(id);
			if(path.length){
				t._addRow(id, index, t._itemToObject(item), item, path.pop());
			}
			t.onSet(id, index, t._cache[id]);
		},
	
		_onNew: function(item, parentInfo){
			var t = this, s = t.store,
				id = s.getIdentity(item),
				row = t._itemToObject(item),
				cacheData = {
					data: t._formatRow(row),
					rawData: row,
					item: item
				},
				parentItem = parentInfo && parentInfo[s.fetch ? 'item' : 'parent'],
				parentId = parentItem ? s.getIdentity(parentItem) : '',
				size = t._size[''];
			t.clear();
			t.onNew(id, 0, cacheData);
			if(!parentItem && size >= 0){
				t._size[''] = size + 1;
				t.onSizeChange(size + 1, size, 'new');
			}
		},
	
		_onDelete: function(item){
			var t = this, s = t.store, st = t._struct,
				id = s.fetch ? s.getIdentity(item) : item, 
				path = t.treePath(id);
			if(path.length){
				var children, i, j, ids = [id],
					parentId = path.pop(),
					sz = t._size,
					size = sz[''],
					index = indexOf(st[parentId], id);
				//This must exist, because we've already have treePath
				st[parentId].splice(index, 1);
				--sz[parentId];
	
				for(i = 0; i < ids.length; ++i){
					children = st[ids[i]];
					if(children){
						for(j = children.length - 1; j > 0; --j){
							ids.push(children[j]);
						}
					}
				}
				for(i = ids.length - 1; i >= 0; --i){
					j = ids[i];
					delete t._cache[j];
					delete st[j];
					delete sz[j];
				}
				i = indexOf(t._priority, id);
				if(i >= 0){
					t._priority.splice(i, 1);
				}
				t.onDelete(id, index - 1);
				if(!parentId && size >= 0){
					sz[''] = size - 1;
					t.onSizeChange(size - 1, size, 'delete');
				}
			}else{
				t.onDelete(id);
//                var onBegin = hitch(t, t._onFetchBegin),
//                    req = mixin({}, t.options || {}, {
//                        start: 0,
//                        count: 1
//                    });
//                setTimeout(function(){
//                    if(s.fetch){
//                        s.fetch(mixin(req, {
//                            onBegin: onBegin
//                        }));
//                    }else{
//                        var results = s.query(req.query, req);
//                        Deferred.when(results.total, onBegin);
//                    }
//                }, 10);
			}
		}
	});
});
