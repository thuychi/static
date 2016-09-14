(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
function parseCookie(){
	var it = document.cookie, array = [], data = {};
	if(it){
		it = it.replace(/(\n|\r|\t|\s)+/g, "").split(";");
		for(var i=0, n=it.length; i<n; i++){
			array = it[i].split("=");
			data[decodeURIComponent(array[0])] = decodeURIComponent(array[1]);
		}
	}
	return data
}

function Cookie(){
	this.data = parseCookie();
	this.define = "";
}

Cookie.prototype.init = function(set){
	var date = new Date(), time = set.day||1;
	date.setTime(date.getTime() + (time*24*3600000));

	var array = ["expires="+date.toUTCString(), "path="+(set.path||"/")];
	if(set.host) array.push("domain="+set.host);
	if(set.secure) array.push("secure="+set.secure);

	this.define = array.join(";");
	return this;
}

Cookie.prototype.set = function(array){
	for(var i in array){ 
		document.cookie = encodeURIComponent(i) + "=" + encodeURIComponent(array[i]) + ";" + this.define;
		this.data[i] = array[i];
	}
}

Cookie.prototype.has = function(name){
	return !!this.data[decodeURIComponent(name)];
}

Cookie.prototype.get = function(name){
	return this.data[decodeURIComponent(name)];
}

Cookie.prototype.remove = function(array){
	if(!this.define) this.init({day: -365, path: "/"});
	for(var i=0, n=array.length; i<n; i++) {
		document.cookie = decodeURIComponent(array[i])+"=;"+this.define;
		delete this.data[array[i]];
	}
}

module.exports = new Cookie();
},{}],3:[function(require,module,exports){
module.exports = function(option){
    var a = document.createElement("a"), 
        x = new XMLHttpRequest(),
        type = option.type||"get",
        data = option.data,
        header = { "X-Requested-With": "XMLHttpRequest" },
        upload = !!option.progress
    ;
    function progress(e){ option.progress((e.loaded / e.total) * 100) }

    // set url 
    a.href = option.url;
    
    // set data 
    if("get"===type){
        var $data = [];
        for(var i in data) {
            $data.push(encodeURIComponent(i)+"="+encodeURIComponent(data[i]));
        };
        data = $data.join("&");
        a.search = a.search ? (a.search + "&" + data) : data;
        data = null;
    }
    if(!upload){
        header["Content-Type"] = "application/json";
        data = JSON.stringify(data);
    }
    
    // open request 
    x.open(type, a.href, true);

    // ajax error 
    if(option.error) x.addEventListener("error", option.error);

    // response data 
    if(option.success){
        function success(){
            if(x.readyState==4&&x.status==200&&x.response) option.success(JSON.parse(x.response));
            if(upload) x.upload.removeEventListener("progress", progress);
        };
        x.addEventListener("readystatechange", success);
    }

    // using progress upload 
    if(upload) {
        x.upload.addEventListener("progress", progress);
        header["Content-Type"] = "application/octet-stream";
        header["Cache-Control"] = "no-cache";
    }

    // send header 
    for(var i in header){ x.setRequestHeader(i, header[i]) }

    // send data 
    x.send(data)
}
},{}],4:[function(require,module,exports){
var Node = require("./node");
var Ajax = require("./ajax");
var Query = require("./query");

function DOM(s){
    if(s.render){
        var node = new Node(s);
        return new Query(node.dom);
    }else return new Query(s);
}

DOM.ajax = function(option){
	return new Ajax(option);
}

module.exports = DOM;
},{"./ajax":3,"./node":5,"./query":6}],5:[function(require,module,exports){
var Query = require('./query');
var Emitter = require("events").EventEmitter;

function Node(object){
    this.e = new Emitter();
    this.ref = {};
    this.controller = {};
    for(var i in object){
        if('render'===i) continue;
        this[i] = object[i];
    };
    this.dom = object.render.bind(this)();
    this.dom.e = this.e;
    this.dom.childNode = this.ref;
    this.dom.controller = this.controller;
}

Node.prototype.n = function(nodeName, array){
    var dom = document.createElement(nodeName);
    var attributes = array[0];
    if(attributes){
        if('object'===typeof attributes){
            if(attributes.node){ 
                this.ref[attributes.node] = dom; 
                delete attributes.node;
            };
            if(attributes.controller){
                var name = attributes.controller;
                this.e.on(name, this.controller[name].bind(new Query(dom)));
                delete attributes.controller;
            };
            for(var attr in attributes){ 
                if('object'===typeof attributes[attr]){
                    for(var i in attributes[attr]) dom[attr][i] = attributes[attr][i]
                }else{
                    dom[attr] = attributes[attr]
                }
            };
        }else{
            dom.innerHTML = attributes;
        }
    };
    if(array[1]){
        for(var i=1, n=array.length; i<n; i++){
            switch(typeof array[i]){
                case 'function': array[i](new Query(dom)); break;
                case 'object': dom.appendChild(array[i].s||array[i]); break;
                default: dom.insertAdjacentHTML('beforeend', array[i]);
            }
        }
    };
    return dom;
}

Node.prototype.form = function(){
    if(arguments[0].file) arguments[0].enctype = 'multipart/form-data';
    return this.n('form', arguments);
}

Node.prototype.button = function(){
    arguments[0].type = 'button';
    return this.n('button', arguments);
}

Node.prototype.submit = function(){
    arguments[0].type = 'submit';
    return this.n('button', arguments);
}

Node.prototype.input = function(){
    if(!arguments[0].type) arguments[0].type = 'text';
    return this.n('input', arguments);
}

Node.prototype.text = function(){
    if(!arguments[0]) arguments[0] = {};
    arguments[0].contentEditable = true;
    return this.n('div', arguments);
}

Node.prototype.textarea = function(){
    return this.n('textarea', arguments);
}

Node.prototype.file = function(evt, multiple){
    var attribute = {type: 'file'};
    if(multiple) attribute.multiple = 1;
    if(evt) attribute.onchange = evt;
    return this.n('input', [attribute]);
}

Node.prototype.pass = function(placeholder, show){
    return this.input({
        type: show?'text':'password',
        name: 'pass',
        className: 'form-control',
        placeholder: placeholder
    });
}

Node.prototype.email = function(placeholder){
    return this.input({
        className: 'form-control', 
        name: 'email', 
        placeholder: placeholder, 
        maxLength: 100
    });
}

Node.prototype.select = function(name, option){
    if(!option) option = name;
    var list_option = [];
    for(var value in option){
        list_option.push('<option value="'+value+'">'+option[value]+'</option>');
    };
    return this.n('select', [{name: name}, list_option.join('')]);
}

Node.prototype.label = function(name, text){
    if('string'===typeof name){
        if(text){
            return this.n('label', [{htmlFor: name}, text]);
        }else{
            return this.n('label', [text]);
        }
    }else return this.n('label', arguments);
}

Node.prototype.error = function(){
    switch(typeof arguments[0]){
        case 'undefined': return this.n('div', [{className: 'error'}]);
        case 'string': return this.n('div', [{className: 'error', node: arguments[0]}], arguments[1]||'');
        default:
            arguments[0].className = 'error';
            return this.n('div', arguments);
    }
}

Node.prototype.a = function(){
    return this.n('a', arguments);
}

Node.prototype.header = function(){
    return this.n('header', arguments);
}

Node.prototype.section = function(){
    return this.n('section', arguments);
}

Node.prototype.footer = function(){
    return this.n('footer', arguments);
}

Node.prototype.span = function(){
    return this.n('span', arguments);
}

Node.prototype.div = function(){
    return this.n('div', arguments);
}

Node.prototype.canvas = function(){
    return this.n('canvas', arguments);
}

Node.prototype.img = function(attr){
    if('string'===typeof attr) return this.n('img', [{src: attr}]);
    else return this.n('img', [attr]);
}

Node.prototype.glyphicon = function(className, node){
    var span = document.createElement("span");
    span.className = "glyphicon "+className;
    span.ariaHidden = true;
    if(node) this.ref[node] = span;
    return span;
}

Node.prototype.li = function(){
    return this.n('li', arguments);
}

Node.prototype.ul = function(){
    return this.n('ul', arguments);
}

Node.prototype.video = function(){
    return this.n("video", arguments);
}

module.exports = Node;
},{"./query":6,"events":1}],6:[function(require,module,exports){
const trim = require("../trim");

function Query(s){
    switch(typeof s){
        case "object": this.s = s.s||s; break;
        case "string": 
            this.s = document.querySelector(s); 
            this.all = s;
            break;
    }
    if(this.s){
        if(!this.s.childNode) this.s.childNode = {};
        if(!this.s.controller) this.s.controller = {};
        this.e = this.s.e||null;
    }
}

Query.prototype.each = function(fn){
    Array.prototype.forEach.call(document.querySelectorAll(this.all), function(dom){ fn(new Query(dom)) });
}

Query.prototype.focus = function(){
    this.s.focus();
    return this;
}

Query.prototype.click = function(){
    this.s.click();
    return this;
}

Query.prototype.html = function(a){
    switch(typeof a){
        case "undefined": return trim(this.s.innerHTML);
        case "object":
            this.s.innerHTML = "";
            this.append(a);
            return this;
        default:
            this.s.innerHTML = a.toString();
            return this;
    }
}

Query.prototype.appendTo = function(parent){
    return $(parent).append(this.s);
}

Query.prototype.append = function(children){
    if("string"===typeof children) this.s.insertAdjacentHTML("beforeend", children);
    else this.s.appendChild(children.s||children);
    return this;
}

Query.prototype.prepend = function(children){
    if("string"===typeof children) this.s.insertAdjacentHTML("afterbegin", children);
    else this.s.insertBefore(children.s||children, this.s.childNodes[0]);
    return this;
}

Query.prototype.replace = function(oldElement, newElement){
    this.s.replaceChild(newElement.s||newElement, oldElement.s||oldElement);
    return this;
}

Query.prototype.insertBefore = function(currentNode){
    /** 
     *  parent.insertBefore(newNode, currentNode);
     *
     *  => use: $(newNode).insertBefore(currentNode);
     */
    (currentNode.s||currentNode).parentNode.insertBefore(this.s, currentNode.s||currentNode);
    return this;
}

Query.prototype.insertAfter = function(currentNode){
    (currentNode.s||currentNode).parentNode.insertBefore(this.s, (currentNode.s||currentNode).nextSibling);
    return this;
}

Query.prototype.data = function(name, value){
    switch(typeof name){
        case "string":
            if("undefined"===typeof value) return this.s.dataset[name];
            else this.s.dataset[name] = value;
            return this;
        case "object":
            for(var i in name) this.s.dataset[i] = name[i];
            return this;
        default: return this.s.dataset;
    }
}

Query.prototype.empty = function(){
    this.s.value = "";
    return this;
}

Query.prototype.val = function(a){
    if("undefined"!==typeof a) this.s.value = a.toString();
    else return trim(this.s.value);
    return this;
}

Query.prototype.text = function(a){
    if("undefined"!==typeof a) this.s.innerText = a.toString();
    else return this.s.innerText;
    return this;
}

Query.prototype.css = function(a, b){
    if(b) this.s.style[a] = b;
    else{
        if("string"===typeof a) return this.s.style[a];
        else for(var i in a) this.s.style[i]=a[i];
    };
    return this;
}

Query.prototype.width = function(a){
    switch(typeof a){
        case "string": this.s.style.width = a; break;
        case "number": this.s.style.width = a+"px"; break;
        default: return this.s.clientWidth;
    };
    return this;
}

Query.prototype.height = function(a){
    switch(typeof a){
        case "string": this.s.style.height = a; break;
        case "number": this.s.style.height = a+"px"; break;
        default: return this.s.clientHeight;
    };
    return this;
}

Query.prototype.attr = function(a, b){
    if(b) this.s.setAttribute(a, b);
    else{
        if("string"===typeof a) return this.s.getAttribute(a);
        else for(var i in a) this.s.setAttribute(i, a[i]);
    };
    return this;
}

Query.prototype.removeAttr = function(a){
    this.s.removeAttribute(a);
    return this;
}

Query.prototype.hidden = function(value){
    this.s.hidden = value;
    return this;
}

Query.prototype.show = function(){
    this.s.hidden = false;
    this.s.style.display = "";
    return this;
}

Query.prototype.hide = function(){
    this.s.hidden = true;
    this.s.style.display = "none";
   return this;
}

Query.prototype.toggle = function(){
    var hidden = !this.s.hidden;
    this.s.hidden = hidden;
    this.s.style.display = hidden ? "none" : "";
    return this;
}

Query.prototype.hasClass = function(className){
    return this.s.classList.constant(className);
}

Query.prototype.addClass = function(className){
    this.s.classList.add(className);
    return this;
}

Query.prototype.removeClass = function(className){
    this.s.classList.remove(className);
    return this;
}

Query.prototype.changeClass = function(oldClass, newClass){
    this.s.classList.remove(oldClass);
    this.s.classList.add(newClass);
    return this;
}

Query.prototype.disabled = function(){
    return this.s.disabled;
}

Query.prototype.disable = function(value){
    this.s.disabled = value;
    return this;
}

Query.prototype.checked = function(){
    return this.s.checked;
}

Query.prototype.check = function(value){
    this.s.checked = value;
    return this;
}

Query.prototype.selected = function(){
    return this.s.selected;
}

Query.prototype.select = function(value){
    this.s.selected = value;
    return this;
}

Query.prototype.parent = function(parentNode){
    var node = null;
    if("string" === typeof parentNode) return (node = this.s.closest(parentNode)) ? new Query(node) : false;
    else return new Query(this.s.parentElement);
}

Query.prototype.children = function(childNode){
    if(!this.s.childNode[childNode]){
        if("number"===typeof childNode) this.s.childNode[childNode] = this.s.childNodes[childNode];
        else this.s.childNode[childNode] = this.s.querySelector(childNode);
    };
    var node = this.s.childNode[childNode];
    return node ? new Query(node) : false;
}

Query.prototype.find = function(childNode){
    var node = "number"===typeof childNode ? this.s.childNodes[childNode] : this.s.querySelector(childNode);
    return node ? new Query(node) : false;
}

Query.prototype.setChild = function(name, dom){
    this.s.childNode[name] = dom;
    return this;
}

Query.prototype.child = function(s){
    return ("number"===typeof s) ? this.s.childNodes[s] : this.s.querySelector(s);
}

Query.prototype.lastChild = function(){
    return new Query(this.s.lastChild);
}

Query.prototype.firstChild = function(){
    return new Query(this.s.firstChild);
}

Query.prototype.next = function(){
    return new Query(this.s.nextSibling);
}

Query.prototype.prev = function(){
    return new Query(this.s.previousSibling);
}

Query.prototype.remove = function(childNode){
    if(childNode){
        this.children(childNode).remove();
        delete this.s.childNode[childNode];
    }else this.s.remove();
    return this;
}

Query.prototype.set = function(key, value){
    this.s.controller[key] = value;
    return this;
}

Query.prototype.unset = function(keys){
    for(var i=0, n=keys.length; i<n; i++) {
        delete this.s.controller[keys[i]];
    };
    return this;
}

Query.prototype.reset = function(){
    for(var i in this.s.controller) {
        if("function"===typeof this.s.controller[i]) continue;
        delete this.s.controller[i];
    };
    return this;
}

Query.prototype.incrby = function(key, number){
    var count = this.s.controller[key]||0, value = number||1, plus = count+value;
    this.s.controller[key] = plus;
    return plus;
}

Query.prototype.get = function(key){
    return this.s.controller[key];
}

Query.prototype.call = function(fn){
    if(arguments.length>1){
        var fn = arguments[0]; delete arguments[0];
        var array = [];
        for(var i in arguments) array.push(arguments[i]);
        var data = this.s.controller[fn].apply([], array);
    }else{
        var data = this.s.controller[fn]();
    };
    return data||this;
}

Query.prototype.emit = function(name, value){
    if(this.e) this.e.emit(name, value);
    return this;
}

Query.prototype.on = function(name, cb){
    this.e.on(name, cb);
}

module.exports = Query;
},{"../trim":8}],7:[function(require,module,exports){
function Router(){
    this.data = {};
}

Router.prototype.url = function(){
    return (window.location.pathname+window.location.search);
}

Router.prototype.set = function(re, handler){
    this.data[re] = handler;
    return this;
}

Router.prototype.parse = function(fragment){
    var match = null, array = this.data;
    for(var i in array){
        if(match = fragment.match(i)){
            match.shift();
            array[i].apply({}, match);
            return this;
        }
    };
    return this;
}

Router.prototype.redirect = function(path){
    history.pushState(null, null, path);
    return false;
}

Router.prototype.go = function(path){
    return this.parse(path).redirect(path);
}

Router.prototype.handle = function(){
    return this.go(this.url());
}

module.exports = new Router();
},{}],8:[function(require,module,exports){
module.exports = function (str) {
	return str.replace(/^\s+/, "").replace(/\s+$/, "").replace(/\s+/g, " ");
}
},{}],9:[function(require,module,exports){
var $ = require("vn/lib/dom");
var app = require("vn/lib/router");
window.main = $("#main_page");

Promise.all([
	app.set("/", require("./router/index")),
	app.handle()
]);
},{"./router/index":10,"vn/lib/dom":4,"vn/lib/router":7}],10:[function(require,module,exports){
var cookie = require("vn/lib/cookie");
var IndexView = require("../view/index");

module.exports = function(){
	if(cookie.has("uid")&&cookie.has("act")){
		main.html(IndexView())
	}
};
},{"../view/index":12,"vn/lib/cookie":2}],11:[function(require,module,exports){
var $ = require("vn/lib/dom");

module.exports = function(){
	var dom = $({
		render: function(){
			return this.div({id: "index"},
				this.div({id: "personal"}),
				this.div({id: "content"}),
				this.div({id: "more"})
			)
		}
	});
	return dom;
};
},{"vn/lib/dom":4}],12:[function(require,module,exports){
var template = require('../../template/index');

module.exports = function(){
	return template();
}
},{"../../template/index":11}]},{},[9])